//! Named rule sets, assembled from the building blocks below.

use serde::{Deserialize, Serialize};

use crate::expr::{
    Expr, bid, bid_position, bids_before, cards_dealt, full_deal, players, taken, total,
};
use crate::rules::{Bidding, Peak, Rules, Schedule, Shape, Suit, Trump, TrumpRule};
use crate::scoring::{CustomScoring, Formula, Multiplier, Poly, Scoring, TrickCredit, ZeroBid};

/// The dealer, bidding last, may not make the bids add up to the tricks available.
pub fn hook() -> Bidding {
    let last = bid_position().equals(players() - 1);
    Bidding {
        allowed: !last.and((bids_before() + bid()).equals(cards_dealt())),
    }
}

pub fn unrestricted() -> Bidding {
    Bidding { allowed: 1.into() }
}

/// Turn up the next card, playing no trump when none is left.
pub fn turn_up() -> TrumpRule {
    TrumpRule {
        cycle: vec![Trump::TurnUp],
        no_trump_when: full_deal(),
    }
}

/// Turn up the dealer's own last card, so every hand has trumps.
pub fn turn_up_dealt() -> TrumpRule {
    TrumpRule {
        cycle: vec![Trump::TurnUp],
        no_trump_when: 0.into(),
    }
}

pub fn rotate(suits: [Suit; 4]) -> TrumpRule {
    TrumpRule {
        cycle: suits.map(Trump::Suit).to_vec(),
        no_trump_when: 0.into(),
    }
}

/// 1 per trick, plus 10 for an exact bid.
pub const PAGAT: Formula = Formula {
    per_trick: 1,
    exact: Poly::constant(10),
    ..Formula::ZERO
};

/// 10 + bid for an exact bid, nothing otherwise.
pub const BLACKOUT: Formula = Formula {
    exact: Poly::new(10, 1, 0),
    ..Formula::ZERO
};

/// `exact` for an exact bid, `per_trick_off` for each trick over or under.
const fn penalty(exact: Poly, per_trick_off: Poly) -> Formula {
    Formula {
        exact,
        over: per_trick_off,
        under: per_trick_off,
        ..Formula::ZERO
    }
}

fn rules(schedule: Schedule, bidding: Bidding, trump: TrumpRule, scoring: Formula) -> Rules {
    Rules {
        schedule,
        bidding,
        trump,
        scoring: Scoring::Formula(scoring),
        end_when: None,
    }
}

/// pagat's default deal: start at 10 cards (fewer for 6+ players), down to 1 and back.
fn pagat_deal(scoring: Formula) -> Rules {
    rules(
        Schedule::new(Shape::DownUp, Peak::Cards(10)),
        hook(),
        turn_up(),
        scoring,
    )
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Preset {
    TricksOrDifference,
    Pagat,
    Blackout,
    Vienna,
    Multiplied,
    WinLoss,
    Negative,
    Balanced,
    Hybrid,
    Doubles,
    Triples,
    Squares,
    Anderson,
    OhWell,
    OhPshaw,
    Parlett,
    ContractWhist,
    Kachuful,
    TienOpEnNeer,
    Boerenbridge,
}

impl Preset {
    pub const ALL: &[Preset] = &[
        Preset::TricksOrDifference,
        Preset::Pagat,
        Preset::Blackout,
        Preset::Vienna,
        Preset::Multiplied,
        Preset::WinLoss,
        Preset::Negative,
        Preset::Balanced,
        Preset::Hybrid,
        Preset::Doubles,
        Preset::Triples,
        Preset::Squares,
        Preset::Anderson,
        Preset::OhWell,
        Preset::OhPshaw,
        Preset::Parlett,
        Preset::ContractWhist,
        Preset::Kachuful,
        Preset::TienOpEnNeer,
        Preset::Boerenbridge,
    ];

    pub fn name(self) -> &'static str {
        match self {
            Preset::TricksOrDifference => "Tricks or difference",
            Preset::Pagat => "Oh Hell (pagat)",
            Preset::Blackout => "Blackout",
            Preset::Vienna => "Vienna",
            Preset::Multiplied => "Multiplied",
            Preset::WinLoss => "Win/loss",
            Preset::Negative => "Negative",
            Preset::Balanced => "Balanced",
            Preset::Hybrid => "Hybrid",
            Preset::Doubles => "Doubles",
            Preset::Triples => "Triples",
            Preset::Squares => "Squares",
            Preset::Anderson => "Anderson",
            Preset::OhWell => "Oh! Well",
            Preset::OhPshaw => "Oh Pshaw",
            Preset::Parlett => "British Oh Hell",
            Preset::ContractWhist => "Contract Whist",
            Preset::Kachuful => "Kachuful",
            Preset::TienOpEnNeer => "10 op en neer",
            Preset::Boerenbridge => "Boerenbridge",
        }
    }

    pub fn summary(self) -> &'static str {
        match self {
            Preset::TricksOrDifference => {
                "Your bid in points if you make it, minus the difference if you miss."
            }
            Preset::Pagat => "1 per trick, +10 for an exact bid.",
            Preset::Blackout => "10 + bid for an exact bid, nothing otherwise.",
            Preset::Vienna => {
                "1 per trick, +10 for an exact bid; a made zero scores 5 + cards dealt."
            }
            Preset::Multiplied => "10 × bid for an exact bid (10 for zero), −10 per trick off.",
            Preset::WinLoss => "5 + 10 per trick for an exact bid, −5 and −5 per trick off.",
            Preset::Negative => "10 for an exact bid, −10 per trick off.",
            Preset::Balanced => "10 + bid for an exact bid, −2 per trick off.",
            Preset::Hybrid => {
                "10 + bid for an exact bid, tricks taken when under, nothing when over."
            }
            Preset::Doubles => "10 + 2 × bid for an exact bid, −2 per trick off.",
            Preset::Triples => "10 + 3 × bid for an exact bid, −3 per trick off.",
            Preset::Squares => "10 + bid² for an exact bid, −(tricks off)².",
            Preset::Anderson => {
                "Bid × V for an exact bid, −V per trick off; V is 10 × hand number."
            }
            Preset::OhWell => "Every card dealt every hand, 1 per trick +10 exact, first to 100.",
            Preset::OhPshaw => "Hands grow from 1 card; 1 per trick +10 only for an exact bid.",
            Preset::Parlett => "Hands grow from 1 card; 10 for an exact bid, nothing else.",
            Preset::ContractWhist => "7 down to 1 and back, trumps rotate H C D S.",
            Preset::Kachuful => "Hands grow from 1 card, trumps rotate S D C H, 10 + bid exact.",
            Preset::TienOpEnNeer => "1 up to 10 and back, no hook, 10 + bid exact.",
            Preset::Boerenbridge => {
                "Full deals, 1 per trick +10 exact (20 for zero), land exactly on 100."
            }
        }
    }

    pub fn rules(self) -> Rules {
        let full_deals = Schedule::new(Shape::Constant, Peak::Max);
        match self {
            Preset::TricksOrDifference => rules(
                Schedule::new(Shape::UpDown, Peak::Max),
                hook(),
                turn_up(),
                penalty(Poly::linear(1), Poly::linear(-1)),
            ),
            Preset::Pagat => pagat_deal(PAGAT),
            Preset::Blackout => pagat_deal(BLACKOUT),
            Preset::Vienna => pagat_deal(Formula {
                exact_zero: Some(ZeroBid::PlusCards(5)),
                ..PAGAT
            }),
            Preset::Multiplied => pagat_deal(Formula {
                exact_zero: Some(ZeroBid::Points(10)),
                ..penalty(Poly::linear(10), Poly::linear(-10))
            }),
            Preset::WinLoss => pagat_deal(penalty(Poly::new(5, 10, 0), Poly::new(-5, -5, 0))),
            Preset::Negative => pagat_deal(penalty(Poly::constant(10), Poly::linear(-10))),
            Preset::Balanced => pagat_deal(penalty(Poly::new(10, 1, 0), Poly::linear(-2))),
            Preset::Hybrid => pagat_deal(Formula {
                per_trick: 1,
                per_trick_when: TrickCredit::Under,
                ..BLACKOUT
            }),
            Preset::Doubles => pagat_deal(penalty(Poly::new(10, 2, 0), Poly::linear(-2))),
            Preset::Triples => pagat_deal(penalty(Poly::new(10, 3, 0), Poly::linear(-3))),
            Preset::Squares => pagat_deal(penalty(Poly::new(10, 0, 1), Poly::new(0, 0, -1))),
            Preset::Anderson => pagat_deal(Formula {
                multiplier: Multiplier::HandNumber,
                ..penalty(Poly::linear(10), Poly::linear(-10))
            }),
            Preset::OhWell => Rules {
                end_when: Some(total().at_least(100)),
                ..rules(full_deals, unrestricted(), turn_up_dealt(), PAGAT)
            },
            Preset::OhPshaw => rules(
                Schedule::new(Shape::Up, Peak::Cards(15)),
                unrestricted(),
                turn_up(),
                BLACKOUT,
            ),
            Preset::Parlett => rules(
                Schedule::new(Shape::Up, Peak::Max),
                unrestricted(),
                turn_up(),
                Formula {
                    exact: Poly::constant(10),
                    ..Formula::ZERO
                },
            ),
            Preset::ContractWhist => rules(
                Schedule::new(Shape::DownUp, Peak::Cards(7)),
                hook(),
                rotate([Suit::Hearts, Suit::Clubs, Suit::Diamonds, Suit::Spades]),
                PAGAT,
            ),
            Preset::Kachuful => rules(
                Schedule::new(Shape::Up, Peak::Max),
                hook(),
                rotate([Suit::Spades, Suit::Diamonds, Suit::Clubs, Suit::Hearts]),
                BLACKOUT,
            ),
            Preset::TienOpEnNeer => rules(
                Schedule::new(Shape::UpDown, Peak::Cards(10)),
                unrestricted(),
                turn_up(),
                BLACKOUT,
            ),
            Preset::Boerenbridge => {
                let normal = Formula {
                    exact_zero: Some(ZeroBid::Points(20)),
                    ..PAGAT
                };
                // From 80 points on, a player stops bidding and scores only tricks.
                let hand = Expr::when(total().at_least(80), taken(), normal.hand());
                Rules {
                    scoring: Scoring::Custom(CustomScoring::new(hand).bounce_above(100)),
                    end_when: Some(total().equals(100)),
                    ..rules(full_deals, unrestricted(), turn_up_dealt(), PAGAT)
                }
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::expr::made;
    use crate::{Error, HandResult, Table};

    /// Seat 0's score for one hand where it bids `bid` and takes `taken`.
    fn score(preset: Preset, hand: usize, bid: u32, taken: u32) -> i64 {
        let table = Table::new(preset.rules(), 4).unwrap();
        let cards = table.cards(hand).unwrap();
        let mut hands: Vec<HandResult> = (0..hand)
            .map(|h| {
                let cards = table.cards(h).unwrap();
                HandResult {
                    bids: vec![0; 4],
                    taken: vec![0, cards, 0, 0],
                }
            })
            .collect();
        hands.push(HandResult {
            bids: vec![bid, 0, 0, 0],
            taken: vec![taken, cards - taken, 0, 0],
        });
        let sheet = table.score(&hands).unwrap();
        let before = if hand == 0 {
            0
        } else {
            sheet.hands[hand - 1].totals[0]
        };
        sheet.hands[hand].totals[0] - before
    }

    #[test]
    fn hand_scores_match_sources() {
        use Preset::*;
        let cases = [
            (TricksOrDifference, 3, 3, 3),
            (TricksOrDifference, 0, 0, 0),
            (TricksOrDifference, 2, 5, -3),
            (TricksOrDifference, 4, 1, -3),
            (Pagat, 2, 2, 12),
            (Pagat, 2, 3, 3),
            (Pagat, 0, 0, 10),
            (Blackout, 2, 2, 12),
            (Blackout, 2, 1, 0),
            (Vienna, 0, 0, 15),
            (Vienna, 1, 1, 11),
            (Multiplied, 3, 3, 30),
            (Multiplied, 0, 0, 10),
            (Multiplied, 3, 1, -20),
            (WinLoss, 2, 2, 25),
            (WinLoss, 2, 4, -15),
            (Negative, 4, 4, 10),
            (Negative, 4, 2, -20),
            (Balanced, 3, 3, 13),
            (Balanced, 3, 0, -6),
            (Hybrid, 3, 1, 1),
            (Hybrid, 1, 3, 0),
            (Doubles, 3, 3, 16),
            (Triples, 3, 5, -6),
            (Squares, 4, 4, 26),
            (Squares, 4, 1, -9),
            (Parlett, 1, 1, 10),
            (OhPshaw, 1, 0, 0),
            (Boerenbridge, 0, 0, 20),
            (Boerenbridge, 3, 3, 13),
            (Boerenbridge, 3, 5, 5),
        ];
        for (preset, bid, taken, expected) in cases {
            let table = Table::new(preset.rules(), 4).unwrap();
            let hand = (0..)
                .find(|&h| table.cards(h).unwrap() >= bid.max(taken))
                .unwrap();
            assert_eq!(
                score(preset, hand, bid, taken),
                expected,
                "{preset:?} bid {bid} took {taken}"
            );
        }
        // Anderson's trick value grows by 10 each hand.
        assert_eq!(score(Preset::Anderson, 0, 2, 2), 20);
        assert_eq!(score(Preset::Anderson, 2, 2, 2), 60);
        assert_eq!(score(Preset::Anderson, 2, 2, 1), -30);
    }

    #[test]
    fn schedules() {
        let sizes = |preset: Preset, players| {
            Table::new(preset.rules(), players)
                .unwrap()
                .schedule()
                .to_vec()
        };
        let pagat4 = sizes(Preset::Pagat, 4);
        assert_eq!(pagat4.len(), 19);
        assert_eq!((pagat4[0], pagat4[9], pagat4[18]), (10, 1, 10));
        assert_eq!(sizes(Preset::Pagat, 6)[0], 8);
        assert_eq!(
            sizes(Preset::Pagat, 7),
            [7, 6, 5, 4, 3, 2, 1, 2, 3, 4, 5, 6, 7]
        );
        assert_eq!(sizes(Preset::OhPshaw, 3).last(), Some(&15));
        assert_eq!(sizes(Preset::OhPshaw, 4).last(), Some(&13));
        assert_eq!(
            sizes(Preset::TienOpEnNeer, 6),
            [1, 2, 3, 4, 5, 6, 7, 8, 7, 6, 5, 4, 3, 2, 1]
        );
        assert_eq!(sizes(Preset::OhWell, 5), [10]);
        for players in [1, 53] {
            assert_eq!(
                Table::new(Preset::Pagat.rules(), players),
                Err(Error::PlayerCount(players))
            );
        }
    }

    #[test]
    fn hook_restricts_only_the_last_bidder() {
        let table = Table::new(Preset::Pagat.rules(), 4).unwrap();
        // Hand 7 deals 3 cards.
        assert_eq!(table.legal_bids(7, &[1, 0]).unwrap(), [0, 1, 2, 3]);
        assert_eq!(table.legal_bids(7, &[1, 0, 1]).unwrap(), [0, 2, 3]);
        let open = Table::new(Preset::TienOpEnNeer.rules(), 4).unwrap();
        assert_eq!(open.legal_bids(2, &[1, 0, 1]).unwrap(), [0, 1, 2, 3]);
    }

    #[test]
    fn trumps() {
        let whist = Table::new(Preset::ContractWhist.rules(), 4).unwrap();
        let suits: Vec<_> = (0..5).map(|h| whist.trump(h).unwrap()).collect();
        assert_eq!(
            suits,
            [
                Suit::Hearts,
                Suit::Clubs,
                Suit::Diamonds,
                Suit::Spades,
                Suit::Hearts
            ]
            .map(Trump::Suit)
        );
        // Hand 12 deals all 52 cards, leaving none to turn up.
        let parlett = Table::new(Preset::Parlett.rules(), 4).unwrap();
        assert_eq!(parlett.trump(11).unwrap(), Trump::TurnUp);
        assert_eq!(parlett.trump(12).unwrap(), Trump::NoTrump);
    }

    #[test]
    fn streak_bonus_every_fifth_hand() {
        let rules = Rules {
            scoring: Scoring::Custom(
                CustomScoring::new(PAGAT.hand())
                    .streak_bonus("made", made(), 5, 10)
                    .streak_bonus("missed", !made(), 5, -10),
            ),
            ..Preset::TienOpEnNeer.rules()
        };
        let table = Table::new(rules, 4).unwrap();
        // Seat 0 bids and takes every trick; seat 1 always bids 1 and takes none.
        let hands: Vec<_> = table.schedule()[..6]
            .iter()
            .map(|&cards| HandResult {
                bids: vec![cards, 1, 0, 0],
                taken: vec![cards, 0, 0, 0],
            })
            .collect();
        let sheet = table.score(&hands).unwrap();
        let seat = |s: usize| sheet.hands.iter().map(|h| h.scores[s]).collect::<Vec<_>>();
        assert_eq!(seat(0), [11, 12, 13, 14, 25, 16]);
        assert_eq!(seat(1), [0, 0, 0, 0, -10, 0]);
        assert_eq!(seat(2), [10, 10, 10, 10, 20, 10]);
    }

    #[test]
    fn every_preset_serializes_and_seats_four() {
        for &preset in Preset::ALL {
            let rules = preset.rules();
            let json = serde_json::to_string(&rules).unwrap();
            assert_eq!(serde_json::from_str::<Rules>(&json).unwrap(), rules);
            Table::new(rules, 4).unwrap_or_else(|e| panic!("{preset:?}: {e}"));
        }
    }

    #[test]
    fn boerenbridge_bounces_and_ends_on_exactly_100() {
        let table = Table::new(Preset::Boerenbridge.rules(), 4).unwrap();
        let hand = |bid: u32, taken: u32| HandResult {
            bids: vec![bid, 0, 0, 0],
            taken: vec![taken, 13 - taken, 0, 0],
        };
        // Exact 13s: 23, 46, 69, 92 (≥ 80 so tricks only from here).
        let mut hands = vec![hand(13, 13); 4];
        hands.push(hand(0, 12)); // 104 bounces to 96
        let sheet = table.score(&hands).unwrap();
        assert_eq!(sheet.totals[0], 96);
        assert!(!sheet.finished);
        hands.push(hand(0, 4));
        let sheet = table.score(&hands).unwrap();
        assert_eq!(sheet.totals[0], 100);
        assert!(sheet.finished);
        hands.push(hand(0, 0));
        assert_eq!(table.score(&hands), Err(Error::GameOver(6)));
    }

    #[test]
    fn non_repeating_games_finish_with_the_schedule() {
        let table = Table::new(Preset::Pagat.rules(), 7).unwrap();
        let hands: Vec<_> = table
            .schedule()
            .iter()
            .map(|&cards| HandResult {
                bids: vec![0; 7],
                taken: vec![cards, 0, 0, 0, 0, 0, 0],
            })
            .collect();
        assert!(table.score(&hands).unwrap().finished);
        assert!(!table.score(&hands[..12]).unwrap().finished);
    }
}
