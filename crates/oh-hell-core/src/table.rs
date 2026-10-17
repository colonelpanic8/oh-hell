//! Rules applied to a specific number of players.

use serde::{Deserialize, Serialize};

use crate::expr::{Expr, Scope, Var};
use crate::rules::{Context, Rules, Trump};
use crate::scoring::CustomScoring;
use crate::{DECK_SIZE, Error};

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Table {
    rules: Rules,
    scoring: CustomScoring,
    players: usize,
    /// One pass through the schedule.
    hands: Vec<u32>,
}

/// What happened in one hand, indexed by seat.
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct HandResult {
    pub bids: Vec<u32>,
    pub taken: Vec<u32>,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct Scoresheet {
    pub hands: Vec<ScoredHand>,
    pub totals: Vec<i64>,
    pub finished: bool,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct ScoredHand {
    pub cards: u32,
    /// Change in each player's total.
    pub scores: Vec<i64>,
    pub totals: Vec<i64>,
}

fn eval(context: Context, expr: &Expr, scope: &Scope) -> Result<i64, Error> {
    expr.eval(scope)
        .map_err(|source| Error::Eval { context, source })
}

fn count(n: usize) -> i64 {
    i64::try_from(n).expect("count fits in i64")
}

impl Table {
    pub fn new(rules: Rules, players: usize) -> Result<Self, Error> {
        rules.validate()?;
        if !(2..=DECK_SIZE as usize).contains(&players) {
            return Err(Error::PlayerCount(players));
        }
        let hands = rules.schedule.hands(players);
        Ok(Self {
            scoring: rules.scoring.compile(),
            rules,
            players,
            hands,
        })
    }

    pub fn rules(&self) -> &Rules {
        &self.rules
    }

    pub fn players(&self) -> usize {
        self.players
    }

    /// Hand sizes for one pass through the schedule.
    pub fn schedule(&self) -> &[u32] {
        &self.hands
    }

    /// `None` when the schedule repeats.
    pub fn hand_count(&self) -> Option<usize> {
        (!self.rules.schedule.repeats()).then_some(self.hands.len())
    }

    pub fn cards(&self, hand: usize) -> Option<u32> {
        if self.rules.schedule.repeats() {
            Some(self.hands[hand % self.hands.len()])
        } else {
            self.hands.get(hand).copied()
        }
    }

    pub fn dealer(&self, hand: usize) -> usize {
        hand % self.players
    }

    fn hand_scope(&self, hand: usize) -> Result<Scope, Error> {
        let cards = self.cards(hand).ok_or(Error::PastSchedule(hand))?;
        Ok(Scope::new()
            .with(Var::Players, count(self.players))
            .with(Var::HandIndex, count(hand))
            .with(Var::CardsDealt, i64::from(cards)))
    }

    pub fn trump(&self, hand: usize) -> Result<Trump, Error> {
        let scope = self.hand_scope(hand)?;
        let trump = &self.rules.trump;
        if eval(Context::Trump, &trump.no_trump_when, &scope)? != 0 {
            return Ok(Trump::NoTrump);
        }
        Ok(trump.cycle[hand % trump.cycle.len()])
    }

    /// Legal bids for the next bidder, given the bids already made this hand in bidding order.
    pub fn legal_bids(&self, hand: usize, earlier: &[u32]) -> Result<Vec<u32>, Error> {
        if earlier.len() >= self.players {
            return Err(Error::SeatCount {
                hand,
                expected: self.players,
                got: earlier.len() + 1,
            });
        }
        let mut scope = self
            .hand_scope(hand)?
            .with(
                Var::BidsBefore,
                earlier.iter().copied().map(i64::from).sum(),
            )
            .with(Var::BidPosition, count(earlier.len()));
        let cards = self.cards(hand).expect("hand_scope checked");
        let mut legal = Vec::new();
        for bid in 0..=cards {
            scope.set(Var::Bid, i64::from(bid));
            if eval(Context::Bidding, &self.rules.bidding.allowed, &scope)? != 0 {
                legal.push(bid);
            }
        }
        Ok(legal)
    }

    pub fn score(&self, hands: &[HandResult]) -> Result<Scoresheet, Error> {
        let scoring = &self.scoring;
        let mut totals = vec![0; self.players];
        let mut counters: Vec<Vec<i64>> =
            vec![scoring.counters.iter().map(|c| c.initial).collect(); self.players];
        let mut sheet = Vec::with_capacity(hands.len());
        let mut finished = false;

        for (index, result) in hands.iter().enumerate() {
            if finished {
                return Err(Error::GameOver(index));
            }
            let base = self.hand_scope(index)?;
            let cards = self.cards(index).expect("hand_scope checked");
            self.check_result(index, cards, result)?;
            let base = base.with(
                Var::BidsTotal,
                result.bids.iter().copied().map(i64::from).sum(),
            );

            let mut scores = Vec::with_capacity(self.players);
            for seat in 0..self.players {
                let mut scope = base
                    .clone()
                    .with(Var::Bid, i64::from(result.bids[seat]))
                    .with(Var::Taken, i64::from(result.taken[seat]))
                    .with(Var::Total, totals[seat]);
                for (c, value) in scoring.counters.iter().zip(&counters[seat]) {
                    scope.set(Var::Counter(c.name.clone()), *value);
                }
                let next = scoring
                    .counters
                    .iter()
                    .map(|c| eval(Context::Counter, &c.next, &scope))
                    .collect::<Result<Vec<_>, _>>()?;
                for (c, value) in scoring.counters.iter().zip(&next) {
                    scope.set(Var::Counter(c.name.clone()), *value);
                }
                counters[seat] = next;

                let hand_score = eval(Context::Hand, &scoring.hand, &scope)?;
                scope.set(Var::HandScore, hand_score);
                let new_total = eval(Context::Total, &scoring.total, &scope)?;
                scores.push(new_total - totals[seat]);
                totals[seat] = new_total;

                if let Some(end) = &self.rules.end_when {
                    scope.set(Var::Total, new_total);
                    finished |= eval(Context::End, end, &scope)? != 0;
                }
            }

            sheet.push(ScoredHand {
                cards,
                scores,
                totals: totals.clone(),
            });
            finished |= self.hand_count() == Some(index + 1);
        }

        Ok(Scoresheet {
            hands: sheet,
            totals,
            finished,
        })
    }

    fn check_result(&self, hand: usize, cards: u32, result: &HandResult) -> Result<(), Error> {
        for got in [result.bids.len(), result.taken.len()] {
            if got != self.players {
                return Err(Error::SeatCount {
                    hand,
                    expected: self.players,
                    got,
                });
            }
        }
        for (seat, &bid) in result.bids.iter().enumerate() {
            if bid > cards {
                return Err(Error::BidTooHigh {
                    hand,
                    seat,
                    bid,
                    cards,
                });
            }
        }
        let taken: u32 = result.taken.iter().sum();
        if taken != cards {
            return Err(Error::TrickCount { hand, taken, cards });
        }
        Ok(())
    }
}
