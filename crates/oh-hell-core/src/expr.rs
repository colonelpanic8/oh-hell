//! A tiny integer expression language that every rule parameter is written in.
//!
//! Booleans are integers: comparisons yield 0 or 1, and any nonzero value is true.

use std::collections::BTreeMap;
use std::fmt;
use std::ops;

use serde::{Deserialize, Serialize};
use thiserror::Error;

use crate::DECK_SIZE;

#[derive(Clone, Debug, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Var {
    Players,
    /// Zero-based index of the current hand.
    HandIndex,
    /// Cards dealt to each player this hand.
    CardsDealt,
    Bid,
    Taken,
    /// Sum of every player's bid this hand.
    BidsTotal,
    /// Sum of the bids made before the bid being checked.
    BidsBefore,
    /// Zero-based position in the bidding order of the bid being checked.
    BidPosition,
    /// The player's running total: before this hand while scoring it, after it in `end_when`.
    Total,
    /// The value of `Scoring::hand`; only bound in `Scoring::total`.
    HandScore,
    /// A per-player value declared in `Scoring::counters`.
    Counter(String),
}

impl fmt::Display for Var {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let name = match self {
            Var::Players => "players",
            Var::HandIndex => "hand_index",
            Var::CardsDealt => "cards_dealt",
            Var::Bid => "bid",
            Var::Taken => "taken",
            Var::BidsTotal => "bids_total",
            Var::BidsBefore => "bids_before",
            Var::BidPosition => "bid_position",
            Var::Total => "total",
            Var::HandScore => "hand_score",
            Var::Counter(name) => return write!(f, "counter `{name}`"),
        };
        f.write_str(name)
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum UnaryOp {
    Neg,
    Abs,
    Not,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum BinaryOp {
    Add,
    Sub,
    Mul,
    /// Floor division.
    Div,
    /// Euclidean remainder (never negative).
    Rem,
    Min,
    Max,
    Eq,
    Ne,
    Lt,
    Le,
    Gt,
    Ge,
    And,
    Or,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Expr {
    Const(i64),
    Var(Var),
    Unary(UnaryOp, Box<Expr>),
    Binary(BinaryOp, Box<Expr>, Box<Expr>),
    If(Box<Expr>, Box<Expr>, Box<Expr>),
}

#[derive(Clone, Debug, PartialEq, Eq, Error)]
pub enum EvalError {
    #[error("{0} is not bound here")]
    Unbound(Var),
    #[error("division by zero")]
    DivisionByZero,
    #[error("arithmetic overflow")]
    Overflow,
}

/// Values for the variables an expression may read.
#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub struct Scope(BTreeMap<Var, i64>);

impl Scope {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn with(mut self, var: Var, value: i64) -> Self {
        self.set(var, value);
        self
    }

    pub fn set(&mut self, var: Var, value: i64) {
        self.0.insert(var, value);
    }

    pub fn get(&self, var: &Var) -> Option<i64> {
        self.0.get(var).copied()
    }
}

impl Expr {
    pub fn eval(&self, scope: &Scope) -> Result<i64, EvalError> {
        match self {
            Expr::Const(n) => Ok(*n),
            Expr::Var(var) => scope
                .get(var)
                .ok_or_else(|| EvalError::Unbound(var.clone())),
            Expr::Unary(op, a) => {
                let a = a.eval(scope)?;
                match op {
                    UnaryOp::Neg => a.checked_neg().ok_or(EvalError::Overflow),
                    UnaryOp::Abs => a.checked_abs().ok_or(EvalError::Overflow),
                    UnaryOp::Not => Ok(i64::from(a == 0)),
                }
            }
            Expr::Binary(BinaryOp::And, a, b) => {
                Ok(i64::from(a.eval(scope)? != 0 && b.eval(scope)? != 0))
            }
            Expr::Binary(BinaryOp::Or, a, b) => {
                Ok(i64::from(a.eval(scope)? != 0 || b.eval(scope)? != 0))
            }
            Expr::Binary(op, a, b) => op.apply(a.eval(scope)?, b.eval(scope)?),
            Expr::If(cond, then, otherwise) => {
                if cond.eval(scope)? != 0 {
                    then.eval(scope)
                } else {
                    otherwise.eval(scope)
                }
            }
        }
    }

    /// Calls `f` on every variable the expression references, including in untaken branches.
    pub fn for_each_var(&self, f: &mut impl FnMut(&Var)) {
        match self {
            Expr::Const(_) => {}
            Expr::Var(var) => f(var),
            Expr::Unary(_, a) => a.for_each_var(f),
            Expr::Binary(_, a, b) => {
                a.for_each_var(f);
                b.for_each_var(f);
            }
            Expr::If(cond, then, otherwise) => {
                cond.for_each_var(f);
                then.for_each_var(f);
                otherwise.for_each_var(f);
            }
        }
    }

    pub fn when(cond: Expr, then: impl Into<Expr>, otherwise: impl Into<Expr>) -> Expr {
        Expr::If(
            Box::new(cond),
            Box::new(then.into()),
            Box::new(otherwise.into()),
        )
    }

    fn unary(op: UnaryOp, a: Expr) -> Expr {
        Expr::Unary(op, Box::new(a))
    }

    fn binary(op: BinaryOp, a: Expr, b: impl Into<Expr>) -> Expr {
        Expr::Binary(op, Box::new(a), Box::new(b.into()))
    }

    pub fn abs(self) -> Expr {
        Expr::unary(UnaryOp::Abs, self)
    }

    pub fn squared(self) -> Expr {
        self.clone() * self
    }

    /// `n * (n + 1) / 2`.
    pub fn triangular(self) -> Expr {
        self.clone() * (self + 1) / 2
    }

    pub fn min(self, other: impl Into<Expr>) -> Expr {
        Expr::binary(BinaryOp::Min, self, other)
    }

    pub fn max(self, other: impl Into<Expr>) -> Expr {
        Expr::binary(BinaryOp::Max, self, other)
    }

    pub fn equals(self, other: impl Into<Expr>) -> Expr {
        Expr::binary(BinaryOp::Eq, self, other)
    }

    pub fn not_equals(self, other: impl Into<Expr>) -> Expr {
        Expr::binary(BinaryOp::Ne, self, other)
    }

    pub fn less_than(self, other: impl Into<Expr>) -> Expr {
        Expr::binary(BinaryOp::Lt, self, other)
    }

    pub fn at_most(self, other: impl Into<Expr>) -> Expr {
        Expr::binary(BinaryOp::Le, self, other)
    }

    pub fn greater_than(self, other: impl Into<Expr>) -> Expr {
        Expr::binary(BinaryOp::Gt, self, other)
    }

    pub fn at_least(self, other: impl Into<Expr>) -> Expr {
        Expr::binary(BinaryOp::Ge, self, other)
    }

    pub fn and(self, other: impl Into<Expr>) -> Expr {
        Expr::binary(BinaryOp::And, self, other)
    }

    pub fn or(self, other: impl Into<Expr>) -> Expr {
        Expr::binary(BinaryOp::Or, self, other)
    }
}

impl BinaryOp {
    fn apply(self, a: i64, b: i64) -> Result<i64, EvalError> {
        let checked = |r: Option<i64>| r.ok_or(EvalError::Overflow);
        let nonzero = || {
            if b == 0 {
                Err(EvalError::DivisionByZero)
            } else {
                Ok(())
            }
        };
        match self {
            BinaryOp::Add => checked(a.checked_add(b)),
            BinaryOp::Sub => checked(a.checked_sub(b)),
            BinaryOp::Mul => checked(a.checked_mul(b)),
            BinaryOp::Div => {
                nonzero()?;
                let q = checked(a.checked_div(b))?;
                Ok(if (a % b != 0) && ((a < 0) != (b < 0)) {
                    q - 1
                } else {
                    q
                })
            }
            BinaryOp::Rem => {
                nonzero()?;
                checked(a.checked_rem_euclid(b))
            }
            BinaryOp::Min => Ok(a.min(b)),
            BinaryOp::Max => Ok(a.max(b)),
            BinaryOp::Eq => Ok(i64::from(a == b)),
            BinaryOp::Ne => Ok(i64::from(a != b)),
            BinaryOp::Lt => Ok(i64::from(a < b)),
            BinaryOp::Le => Ok(i64::from(a <= b)),
            BinaryOp::Gt => Ok(i64::from(a > b)),
            BinaryOp::Ge => Ok(i64::from(a >= b)),
            BinaryOp::And => Ok(i64::from(a != 0 && b != 0)),
            BinaryOp::Or => Ok(i64::from(a != 0 || b != 0)),
        }
    }
}

impl From<i64> for Expr {
    fn from(n: i64) -> Self {
        Expr::Const(n)
    }
}

impl From<Var> for Expr {
    fn from(var: Var) -> Self {
        Expr::Var(var)
    }
}

macro_rules! arith {
    ($trait:ident, $method:ident, $op:ident) => {
        impl<T: Into<Expr>> ops::$trait<T> for Expr {
            type Output = Expr;
            fn $method(self, rhs: T) -> Expr {
                Expr::binary(BinaryOp::$op, self, rhs)
            }
        }

        impl ops::$trait<Expr> for i64 {
            type Output = Expr;
            fn $method(self, rhs: Expr) -> Expr {
                Expr::binary(BinaryOp::$op, Expr::Const(self), rhs)
            }
        }
    };
}

arith!(Add, add, Add);
arith!(Sub, sub, Sub);
arith!(Mul, mul, Mul);
arith!(Div, div, Div);
arith!(Rem, rem, Rem);

impl ops::Neg for Expr {
    type Output = Expr;
    fn neg(self) -> Expr {
        Expr::unary(UnaryOp::Neg, self)
    }
}

impl ops::Not for Expr {
    type Output = Expr;
    fn not(self) -> Expr {
        Expr::unary(UnaryOp::Not, self)
    }
}

pub fn players() -> Expr {
    Var::Players.into()
}

pub fn hand_index() -> Expr {
    Var::HandIndex.into()
}

pub fn cards_dealt() -> Expr {
    Var::CardsDealt.into()
}

pub fn bid() -> Expr {
    Var::Bid.into()
}

pub fn taken() -> Expr {
    Var::Taken.into()
}

pub fn bids_total() -> Expr {
    Var::BidsTotal.into()
}

pub fn bids_before() -> Expr {
    Var::BidsBefore.into()
}

pub fn bid_position() -> Expr {
    Var::BidPosition.into()
}

pub fn total() -> Expr {
    Var::Total.into()
}

pub fn hand_score() -> Expr {
    Var::HandScore.into()
}

pub fn counter(name: &str) -> Expr {
    Var::Counter(name.to_owned()).into()
}

/// Took exactly the bid.
pub fn made() -> Expr {
    taken().equals(bid())
}

/// How far the tricks taken missed the bid, in either direction.
pub fn diff() -> Expr {
    (taken() - bid()).abs()
}

/// Tricks taken beyond the bid.
pub fn over() -> Expr {
    (taken() - bid()).max(0)
}

/// Tricks short of the bid.
pub fn under() -> Expr {
    (bid() - taken()).max(0)
}

/// The most cards each player can be dealt.
pub fn max_cards() -> Expr {
    i64::from(DECK_SIZE) / players()
}

/// Every card in the pack is dealt this hand.
pub fn full_deal() -> Expr {
    (cards_dealt() * players()).equals(i64::from(DECK_SIZE))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn scope(bid_: i64, taken_: i64) -> Scope {
        Scope::new().with(Var::Bid, bid_).with(Var::Taken, taken_)
    }

    #[test]
    fn derived_outcomes() {
        let s = scope(3, 1);
        assert_eq!(made().eval(&s), Ok(0));
        assert_eq!(diff().eval(&s), Ok(2));
        assert_eq!(over().eval(&s), Ok(0));
        assert_eq!(under().eval(&s), Ok(2));
        assert_eq!(made().eval(&scope(2, 2)), Ok(1));
    }

    #[test]
    fn division_floors() {
        let s = Scope::new();
        assert_eq!((Expr::from(-7) / 2).eval(&s), Ok(-4));
        assert_eq!((Expr::from(7) / 2).eval(&s), Ok(3));
        assert_eq!((Expr::from(-7) % 5).eval(&s), Ok(3));
        assert_eq!((Expr::from(1) / 0).eval(&s), Err(EvalError::DivisionByZero));
    }

    #[test]
    fn untaken_branches_and_short_circuits_are_not_evaluated() {
        let s = Scope::new();
        let guarded = Expr::when(Expr::from(0), counter("x"), 5);
        assert_eq!(guarded.eval(&s), Ok(5));
        assert_eq!(Expr::from(0).and(counter("x")).eval(&s), Ok(0));
        assert_eq!(
            counter("x").eval(&s),
            Err(EvalError::Unbound(Var::Counter("x".into())))
        );
    }

    #[test]
    fn overflow_is_an_error() {
        let big = Expr::from(i64::MAX);
        assert_eq!((big + 1).eval(&Scope::new()), Err(EvalError::Overflow));
    }
}
