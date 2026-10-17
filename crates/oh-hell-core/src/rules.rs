//! Rule parameters. Each field of [`Rules`] varies independently of the others.

use std::collections::BTreeSet;
use std::fmt;

use serde::{Deserialize, Serialize};

use crate::expr::{Expr, Var};
use crate::scoring::Scoring;
use crate::{DECK_SIZE, Error};

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct Rules {
    pub schedule: Schedule,
    pub bidding: Bidding,
    pub trump: TrumpRule,
    pub scoring: Scoring,
    /// Checked for each player after every hand; the game ends once it holds for anyone.
    /// Otherwise the game ends when the schedule runs out.
    pub end_when: Option<Expr>,
}

/// How many cards are dealt in each hand.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct Schedule {
    pub shape: Shape,
    pub peak: Peak,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Shape {
    /// `1, ..., peak, ..., 1`.
    UpDown,
    /// `peak, ..., 1, ..., peak`.
    DownUp,
    /// `1, ..., peak`.
    Up,
    /// `peak, ..., 1`.
    Down,
    /// `peak` every hand, until `Rules::end_when` ends the game.
    Constant,
}

/// The largest hand in the schedule.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Peak {
    /// As many cards as the deck allows for the player count.
    Max,
    /// This many cards, or fewer if the player count doesn't allow it.
    Cards(u32),
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct Bidding {
    /// Whether a candidate bid is legal. Bids outside `0..=CardsDealt` never are.
    pub allowed: Expr,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct TrumpRule {
    /// Hand `i` uses `cycle[i % cycle.len()]`.
    pub cycle: Vec<Trump>,
    /// Overrides the cycle with no trump when it holds.
    pub no_trump_when: Expr,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Trump {
    Suit(Suit),
    NoTrump,
    /// Decided by the card turned up after the deal.
    TurnUp,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Suit {
    Clubs,
    Diamonds,
    Hearts,
    Spades,
}

impl Schedule {
    pub fn new(shape: Shape, peak: Peak) -> Self {
        Self { shape, peak }
    }

    /// Hand sizes for one pass through the schedule; [`Shape::Constant`] repeats its one hand.
    pub fn hands(self, players: usize) -> Vec<u32> {
        let max = u32::try_from(DECK_SIZE as usize / players.max(1)).expect("fits in u32");
        let peak = match self.peak {
            Peak::Max => max,
            Peak::Cards(n) => n.clamp(1, max.max(1)),
        };
        match self.shape {
            Shape::UpDown => (1..=peak).chain((1..peak).rev()).collect(),
            Shape::DownUp => (1..=peak).rev().chain(2..=peak).collect(),
            Shape::Up => (1..=peak).collect(),
            Shape::Down => (1..=peak).rev().collect(),
            Shape::Constant => vec![peak],
        }
    }

    pub fn repeats(self) -> bool {
        self.shape == Shape::Constant
    }
}

/// Where an expression is evaluated, which determines the variables it may read.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Context {
    Trump,
    Bidding,
    Counter,
    Hand,
    Total,
    End,
}

impl Context {
    pub fn allows(self, var: &Var) -> bool {
        use Context::*;
        match var {
            Var::Players | Var::HandIndex | Var::CardsDealt => true,
            Var::Bid => matches!(self, Bidding | Counter | Hand | Total),
            Var::BidsBefore | Var::BidPosition => self == Bidding,
            Var::Taken | Var::BidsTotal => matches!(self, Counter | Hand | Total),
            Var::Total | Var::Counter(_) => matches!(self, Counter | Hand | Total | End),
            Var::HandScore => self == Total,
        }
    }
}

impl fmt::Display for Context {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(match self {
            Context::Trump => "trump",
            Context::Bidding => "bidding",
            Context::Counter => "scoring counter",
            Context::Hand => "hand scoring",
            Context::Total => "total scoring",
            Context::End => "end condition",
        })
    }
}

impl Rules {
    /// Checks that every expression only reads variables bound where it is evaluated.
    pub fn validate(&self) -> Result<(), Error> {
        let scoring = self.scoring.compile();
        let mut names = BTreeSet::new();
        for c in &scoring.counters {
            if !names.insert(c.name.as_str()) {
                return Err(Error::DuplicateCounter(c.name.clone()));
            }
        }

        let check = |context: Context, expr: &Expr| {
            let mut result = Ok(());
            expr.for_each_var(&mut |var| {
                if result.is_err() {
                    return;
                }
                if !context.allows(var) {
                    result = Err(Error::Unbound {
                        context,
                        var: var.clone(),
                    });
                } else if let Var::Counter(name) = var
                    && !names.contains(name.as_str())
                {
                    result = Err(Error::UnknownCounter(name.clone()));
                }
            });
            result
        };

        if self.trump.cycle.is_empty() {
            return Err(Error::EmptyTrumpCycle);
        }
        check(Context::Trump, &self.trump.no_trump_when)?;
        check(Context::Bidding, &self.bidding.allowed)?;
        for c in &scoring.counters {
            check(Context::Counter, &c.next)?;
        }
        check(Context::Hand, &scoring.hand)?;
        check(Context::Total, &scoring.total)?;
        if let Some(end) = &self.end_when {
            check(Context::End, end)?;
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::expr::{bid, bids_before, counter, taken};
    use crate::presets::{hook, turn_up};
    use crate::scoring::CustomScoring;

    fn rules(scoring: CustomScoring) -> Rules {
        Rules {
            schedule: Schedule::new(Shape::DownUp, Peak::Cards(10)),
            bidding: hook(),
            trump: turn_up(),
            scoring: Scoring::Custom(scoring),
            end_when: None,
        }
    }

    #[test]
    fn rejects_variables_unbound_in_their_context() {
        assert_eq!(
            rules(CustomScoring::new(bids_before())).validate(),
            Err(Error::Unbound {
                context: Context::Hand,
                var: Var::BidsBefore
            })
        );
        assert_eq!(
            rules(CustomScoring::new(bid() + counter("streak"))).validate(),
            Err(Error::UnknownCounter("streak".into()))
        );
        let twice = CustomScoring::new(taken())
            .counter("a", 0, 0.into())
            .counter("a", 0, 0.into());
        assert_eq!(
            rules(twice).validate(),
            Err(Error::DuplicateCounter("a".into()))
        );
    }
}
