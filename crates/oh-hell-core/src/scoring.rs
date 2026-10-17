//! How a hand is scored: independent [`Formula`] knobs for the common cases, or raw
//! expressions via [`CustomScoring`] for anything else.

use serde::{Deserialize, Serialize};

use crate::expr::{
    Expr, bid, cards_dealt, counter, hand_index, hand_score, made, over, taken, total, under,
};

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Scoring {
    Formula(Formula),
    Custom(CustomScoring),
}

/// Each part is added independently; the sum is then scaled by `multiplier`.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct Formula {
    /// Points per trick taken.
    pub per_trick: i64,
    /// Hands on which `per_trick` counts.
    pub per_trick_when: TrickCredit,
    /// Added for taking exactly the bid, as a function of the bid.
    pub exact: Poly,
    /// Replaces the whole score for taking no tricks on a zero bid.
    pub exact_zero: Option<ZeroBid>,
    /// Added for taking more tricks than bid, as a function of how many more.
    pub over: Poly,
    /// Added for taking fewer tricks than bid, as a function of how many fewer.
    pub under: Poly,
    pub multiplier: Multiplier,
}

/// `constant + linear·x + squared·x²`.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct Poly {
    pub constant: i64,
    pub linear: i64,
    pub squared: i64,
}

#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum TrickCredit {
    #[default]
    Always,
    /// Only when the bid was missed in either direction.
    Missed,
    /// Only when short of the bid.
    Under,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ZeroBid {
    Points(i64),
    /// This many points plus one per card dealt.
    PlusCards(i64),
}

#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Multiplier {
    #[default]
    One,
    /// The one-based hand number.
    HandNumber,
}

impl Poly {
    pub const ZERO: Poly = Poly::new(0, 0, 0);

    pub const fn new(constant: i64, linear: i64, squared: i64) -> Self {
        Self {
            constant,
            linear,
            squared,
        }
    }

    pub const fn constant(constant: i64) -> Self {
        Self::new(constant, 0, 0)
    }

    pub const fn linear(linear: i64) -> Self {
        Self::new(0, linear, 0)
    }

    fn is_zero(self) -> bool {
        self == Self::ZERO
    }

    fn at(self, x: Expr) -> Expr {
        sum([
            (self.constant != 0).then(|| self.constant.into()),
            (self.linear != 0).then(|| self.linear * x.clone()),
            (self.squared != 0).then(|| self.squared * x.squared()),
        ])
    }
}

fn sum(terms: impl IntoIterator<Item = Option<Expr>>) -> Expr {
    terms
        .into_iter()
        .flatten()
        .reduce(|a, b| a + b)
        .unwrap_or(Expr::Const(0))
}

impl Formula {
    /// Scores nothing; a base for struct update syntax.
    pub const ZERO: Formula = Formula {
        per_trick: 0,
        per_trick_when: TrickCredit::Always,
        exact: Poly::ZERO,
        exact_zero: None,
        over: Poly::ZERO,
        under: Poly::ZERO,
        multiplier: Multiplier::One,
    };

    pub fn hand(&self) -> Expr {
        let credit = match self.per_trick_when {
            TrickCredit::Always => None,
            TrickCredit::Missed => Some(!made()),
            TrickCredit::Under => Some(under().greater_than(0)),
        };
        let tricks = (self.per_trick != 0).then(|| {
            let points = self.per_trick * taken();
            match credit {
                None => points,
                Some(cond) => Expr::when(cond, points, 0),
            }
        });
        let part =
            |p: Poly, cond: Expr, x: Expr| (!p.is_zero()).then(|| Expr::when(cond, p.at(x), 0));
        let mut score = sum([
            tricks,
            part(self.exact, made(), bid()),
            part(self.over, over().greater_than(0), over()),
            part(self.under, under().greater_than(0), under()),
        ]);
        if let Some(zero) = self.exact_zero {
            let points = match zero {
                ZeroBid::Points(n) => Expr::from(n),
                ZeroBid::PlusCards(n) => n + cards_dealt(),
            };
            score = Expr::when(bid().equals(0).and(made()), points, score);
        }
        match self.multiplier {
            Multiplier::One => score,
            Multiplier::HandNumber => (hand_index() + 1) * score,
        }
    }
}

impl Scoring {
    pub fn compile(&self) -> CustomScoring {
        match self {
            Scoring::Formula(f) => CustomScoring::new(f.hand()),
            Scoring::Custom(c) => c.clone(),
        }
    }
}

/// Per player, per hand: update `counters` (each `next` sees the old values), evaluate
/// `hand` (which sees the new ones), then set the running total to `total`.
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct CustomScoring {
    pub counters: Vec<Counter>,
    pub hand: Expr,
    pub total: Expr,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct Counter {
    pub name: String,
    pub initial: i64,
    pub next: Expr,
}

impl CustomScoring {
    pub fn new(hand: Expr) -> Self {
        Self {
            counters: Vec::new(),
            hand,
            total: total() + hand_score(),
        }
    }

    /// Scores `score` instead of the existing formula whenever `cond` holds.
    pub fn override_when(mut self, cond: Expr, score: impl Into<Expr>) -> Self {
        self.hand = Expr::when(cond, score, self.hand);
        self
    }

    /// Adds `score` to the existing formula whenever `cond` holds.
    pub fn bonus_when(mut self, cond: Expr, score: impl Into<Expr>) -> Self {
        self.hand = self.hand + Expr::when(cond, score, 0);
        self
    }

    pub fn counter(mut self, name: &str, initial: i64, next: Expr) -> Self {
        self.counters.push(Counter {
            name: name.to_owned(),
            initial,
            next,
        });
        self
    }

    /// Adds `bonus` every `length`th consecutive hand where `cond` holds.
    pub fn streak_bonus(self, name: &str, cond: Expr, length: i64, bonus: i64) -> Self {
        let streak = || counter(name);
        self.counter(name, 0, Expr::when(cond, streak() + 1, 0))
            .bonus_when(
                streak().greater_than(0).and((streak() % length).equals(0)),
                bonus,
            )
    }

    /// A total that would pass `target` bounces back below it by the excess.
    pub fn bounce_above(mut self, target: i64) -> Self {
        let raw = || total() + hand_score();
        self.total = Expr::when(raw().greater_than(target), 2 * target - raw(), raw());
        self
    }
}
