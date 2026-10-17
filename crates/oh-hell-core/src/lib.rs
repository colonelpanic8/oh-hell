//! Oh Hell scoring rules and game state. No UI or I/O lives here.
//!
//! [`Rules`] is a set of independent parameters. Scoring is a [`Formula`] of simple knobs, and
//! everything compiles down to [`Expr`]s, which can also be written directly for variants the
//! knobs don't cover. [`presets`] holds named rule sets.

pub mod expr;
pub mod presets;
pub mod rules;
pub mod scoring;
pub mod table;

use thiserror::Error;

pub const DECK_SIZE: u32 = 52;

pub use expr::{EvalError, Expr, Scope, Var};
pub use presets::Preset;
pub use rules::{Bidding, Context, Peak, Rules, Schedule, Shape, Suit, Trump, TrumpRule};
pub use scoring::{
    Counter, CustomScoring, Formula, Multiplier, Poly, Scoring, TrickCredit, ZeroBid,
};
pub use table::{HandResult, ScoredHand, Scoresheet, Table};

#[derive(Clone, Debug, PartialEq, Eq, Error)]
pub enum Error {
    #[error("{context}: {source}")]
    Eval { context: Context, source: EvalError },
    #[error("{context} may not use {var}")]
    Unbound { context: Context, var: Var },
    #[error("unknown counter `{0}`")]
    UnknownCounter(String),
    #[error("counter `{0}` is defined twice")]
    DuplicateCounter(String),
    #[error("the trump cycle is empty")]
    EmptyTrumpCycle,
    #[error("need 2 to {DECK_SIZE} players, got {0}")]
    PlayerCount(usize),
    #[error("hand {0} is past the end of the schedule")]
    PastSchedule(usize),
    #[error("hand {0} comes after the game ended")]
    GameOver(usize),
    #[error("hand {hand}: expected {expected} players, got {got}")]
    SeatCount {
        hand: usize,
        expected: usize,
        got: usize,
    },
    #[error("hand {hand}: seat {seat} bid {bid} with only {cards} cards")]
    BidTooHigh {
        hand: usize,
        seat: usize,
        bid: u32,
        cards: u32,
    },
    #[error("hand {hand}: {taken} tricks recorded but {cards} were played")]
    TrickCount { hand: usize, taken: u32, cards: u32 },
}
