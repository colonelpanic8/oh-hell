// A game stores only what was entered; everything else is derived here.

import {
  cardsForHand,
  handCount,
  legalBids,
  Rules,
  scoreHand,
  Trump,
  trumpForHand,
} from "./rules";

/** One finished hand, indexed by seat. */
export interface HandResult {
  bids: number[];
  taken: number[];
}

/** The hand being entered, indexed by seat. */
export interface Draft {
  phase: "bids" | "tricks";
  bids: (number | null)[];
  taken: (number | null)[];
}

export interface Game {
  id: string;
  createdAt: number;
  updatedAt: number;
  /** Names in seat order, clockwise. */
  players: string[];
  rules: Rules;
  /** Seat that deals the first hand. */
  firstDealer: number;
  hands: HandResult[];
  draft: Draft | null;
  endedEarly: boolean;
}

export function newGame(
  id: string,
  players: string[],
  rules: Rules,
  now: number,
): Game {
  return {
    id,
    createdAt: now,
    updatedAt: now,
    players,
    rules,
    firstDealer: 0,
    hands: [],
    draft: null,
    endedEarly: false,
  };
}

export function dealer(game: Game, hand: number): number {
  return (game.firstDealer + hand) % game.players.length;
}

/** Seats in bidding order: left of the dealer first, the dealer last. */
export function biddingOrder(game: Game, hand: number): number[] {
  const n = game.players.length;
  const d = dealer(game, hand);
  return Array.from({ length: n }, (_, i) => (d + 1 + i) % n);
}

export function cards(game: Game, hand: number): number | null {
  return cardsForHand(game.rules, game.players.length, hand);
}

export function trump(game: Game, hand: number): Trump {
  return trumpForHand(game.rules, game.players.length, hand);
}

export function totalHands(game: Game): number | null {
  return handCount(game.rules, game.players.length);
}

export interface ScoredHand {
  cards: number;
  dealer: number;
  bids: number[];
  taken: number[];
  scores: number[];
  totals: number[];
}

export interface Scoresheet {
  hands: ScoredHand[];
  totals: number[];
  reachedTarget: boolean;
}

export function scoresheet(game: Game): Scoresheet {
  const totals = game.players.map(() => 0);
  const target = game.rules.target;
  let reachedTarget = false;
  const hands = game.hands.map((h, index) => {
    const cardsDealt = cards(game, index) ?? 0;
    const scores = game.players.map((_, seat) =>
      scoreHand(game.rules.scoring, {
        bid: h.bids[seat] ?? 0,
        taken: h.taken[seat] ?? 0,
        cards: cardsDealt,
        handIndex: index,
      }),
    );
    scores.forEach((s, seat) => (totals[seat] = (totals[seat] ?? 0) + s));
    if (target !== null && totals.some((t) => t >= target)) {
      reachedTarget = true;
    }
    return {
      cards: cardsDealt,
      dealer: dealer(game, index),
      bids: h.bids,
      taken: h.taken,
      scores,
      totals: [...totals],
    };
  });
  return { hands, totals, reachedTarget };
}

export function isFinished(game: Game, sheet = scoresheet(game)): boolean {
  return (
    game.endedEarly ||
    sheet.reachedTarget ||
    game.hands.length === totalHands(game)
  );
}

export interface Standing {
  seat: number;
  total: number;
  /** 1-based; tied players share a rank. */
  rank: number;
}

export function standings(totals: readonly number[]): Standing[] {
  const sorted = totals
    .map((total, seat) => ({ seat, total }))
    .sort((a, b) => b.total - a.total || a.seat - b.seat);
  return sorted.map((s) => ({
    ...s,
    rank: sorted.findIndex((o) => o.total === s.total) + 1,
  }));
}

/** Bids the given seat may make this hand, given the other bids entered so far. */
export function legalBidsFor(
  game: Game,
  hand: number,
  bids: readonly (number | null)[],
  seat: number,
): number[] {
  const order = biddingOrder(game, hand);
  const others = order
    .filter((s) => s !== seat)
    .map((s) => bids[s])
    .filter((b): b is number => b !== null && b !== undefined);
  const isLast = order[order.length - 1] === seat;
  const everyoneElse = others.length === order.length - 1;
  return legalBids(
    game.rules,
    cards(game, hand) ?? 0,
    isLast && everyoneElse,
    others,
  );
}

/** Why these bids can't stand, or `null` if they're complete and legal. */
export function bidProblem(
  game: Game,
  hand: number,
  bids: readonly (number | null)[],
): string | null {
  if (bids.some((b) => b === null)) return "Everyone needs a bid.";
  const last = biddingOrder(game, hand).at(-1)!;
  if (!legalBidsFor(game, hand, bids, last).includes(bids[last]!)) {
    return `${game.players[last]} can't bid ${bids[last]}: bids can't add up to ${cards(game, hand)}.`;
  }
  return null;
}

/** Why these tricks can't stand, or `null` if they're complete and add up. */
export function tricksProblem(
  game: Game,
  hand: number,
  taken: readonly (number | null)[],
): string | null {
  const dealt = cards(game, hand) ?? 0;
  const sum = taken.reduce<number>((a, t) => a + (t ?? 0), 0);
  if (sum > dealt) return `That's ${sum} tricks; only ${dealt} were played.`;
  if (taken.some((t) => t === null)) return "Everyone needs a trick count.";
  if (sum !== dealt) return `That's ${sum} tricks; ${dealt} were played.`;
  return null;
}

export function emptyDraft(players: number): Draft {
  return {
    phase: "bids",
    bids: Array(players).fill(null),
    taken: Array(players).fill(null),
  };
}

/** Sum of bids so far compared with the cards dealt. */
export function bidBalance(
  game: Game,
  hand: number,
  bids: readonly (number | null)[],
): number {
  const sum = bids.reduce<number>((a, b) => a + (b ?? 0), 0);
  return sum - (cards(game, hand) ?? 0);
}
