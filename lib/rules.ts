// Rule parameters and the pure functions that apply them. Each field of
// `Rules` varies independently of the others. No UI or storage lives here.

export const DECK_SIZE = 52;
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = DECK_SIZE;

export type Shape = "up-down" | "down-up" | "up" | "down" | "constant";

/** The largest hand: as many cards as the player count allows, or a fixed number capped at that. */
export type Peak = { kind: "max" } | { kind: "cards"; cards: number };

export interface Schedule {
  shape: Shape;
  peak: Peak;
}

/** `constant + linear·x + squared·x²`. */
export interface Poly {
  constant: number;
  linear: number;
  squared: number;
}

/** Hands on which `perTrick` points count. */
export type TrickCredit = "always" | "missed" | "under";

/** Replaces the whole score for taking no tricks on a zero bid. */
export type ZeroBid =
  { kind: "points"; points: number } | { kind: "plus-cards"; points: number };

export type Multiplier = "one" | "hand-number";

/** Each part is added independently; the sum is then scaled by `multiplier`. */
export interface Formula {
  perTrick: number;
  perTrickWhen: TrickCredit;
  /** Added for taking exactly the bid, as a function of the bid. */
  exact: Poly;
  exactZero: ZeroBid | null;
  /** Added for taking more tricks than bid, as a function of how many more. */
  over: Poly;
  /** Added for taking fewer tricks than bid, as a function of how many fewer. */
  under: Poly;
  multiplier: Multiplier;
}

export type Suit = "clubs" | "diamonds" | "hearts" | "spades";

export type Trump =
  { kind: "suit"; suit: Suit } | { kind: "no-trump" } | { kind: "turn-up" };

export interface TrumpRule {
  /** Hand `i` uses `cycle[i % cycle.length]`. */
  cycle: Trump[];
  /** No trump when every card is dealt, leaving none to turn up. */
  noTrumpOnFullDeal: boolean;
}

export interface Rules {
  schedule: Schedule;
  /** The last bidder may not make the bids add up to the cards dealt. */
  hook: boolean;
  trump: TrumpRule;
  scoring: Formula;
  /** End the game once anyone reaches this total. */
  target: number | null;
}

export const ZERO_POLY: Poly = { constant: 0, linear: 0, squared: 0 };

export function poly(constant: number, linear = 0, squared = 0): Poly {
  return { constant, linear, squared };
}

export const ZERO_FORMULA: Formula = {
  perTrick: 0,
  perTrickWhen: "always",
  exact: ZERO_POLY,
  exactZero: null,
  over: ZERO_POLY,
  under: ZERO_POLY,
  multiplier: "one",
};

export function maxCards(players: number): number {
  return Math.floor(DECK_SIZE / players);
}

export function peakCards(peak: Peak, players: number): number {
  const max = maxCards(players);
  return peak.kind === "max" ? max : Math.max(1, Math.min(peak.cards, max));
}

function range(from: number, to: number): number[] {
  const out: number[] = [];
  if (from <= to) for (let n = from; n <= to; n++) out.push(n);
  else for (let n = from; n >= to; n--) out.push(n);
  return out;
}

/** Hand sizes for one pass through the schedule; `constant` repeats its one hand. */
export function handSizes(schedule: Schedule, players: number): number[] {
  const peak = peakCards(schedule.peak, players);
  switch (schedule.shape) {
    case "up-down":
      return [...range(1, peak), ...(peak > 1 ? range(peak - 1, 1) : [])];
    case "down-up":
      return [...range(peak, 1), ...(peak > 1 ? range(2, peak) : [])];
    case "up":
      return range(1, peak);
    case "down":
      return range(peak, 1);
    case "constant":
      return [peak];
  }
}

export function repeats(schedule: Schedule): boolean {
  return schedule.shape === "constant";
}

/** Total hands in the game, or `null` if the schedule repeats. */
export function handCount(rules: Rules, players: number): number | null {
  return repeats(rules.schedule)
    ? null
    : handSizes(rules.schedule, players).length;
}

export function cardsForHand(
  rules: Rules,
  players: number,
  hand: number,
): number | null {
  const sizes = handSizes(rules.schedule, players);
  if (repeats(rules.schedule)) return sizes[hand % sizes.length] ?? null;
  return sizes[hand] ?? null;
}

export function trumpForHand(
  rules: Rules,
  players: number,
  hand: number,
): Trump {
  const cards = cardsForHand(rules, players, hand);
  if (rules.trump.noTrumpOnFullDeal && cards !== null) {
    if (cards * players === DECK_SIZE) return { kind: "no-trump" };
  }
  return (
    rules.trump.cycle[hand % rules.trump.cycle.length] ?? { kind: "turn-up" }
  );
}

/**
 * Legal bids for a player, given the other players' bids. Only the hook
 * restricts anything, and only for the last bidder once everyone else has bid.
 */
export function legalBids(
  rules: Rules,
  cards: number,
  isLastBidder: boolean,
  otherBids: readonly number[],
): number[] {
  const all = range(0, cards);
  if (!rules.hook || !isLastBidder) return all;
  const others = otherBids.reduce((a, b) => a + b, 0);
  return all.filter((bid) => others + bid !== cards);
}

function evalPoly(p: Poly, x: number): number {
  return p.constant + p.linear * x + p.squared * x * x;
}

export interface Outcome {
  bid: number;
  taken: number;
  cards: number;
  /** Zero-based. */
  handIndex: number;
}

export function scoreHand(f: Formula, o: Outcome): number {
  const made = o.taken === o.bid;
  const over = Math.max(0, o.taken - o.bid);
  const under = Math.max(0, o.bid - o.taken);

  let score: number;
  if (made && o.bid === 0 && f.exactZero) {
    score =
      f.exactZero.kind === "points"
        ? f.exactZero.points
        : f.exactZero.points + o.cards;
  } else {
    const credited =
      f.perTrickWhen === "always" ||
      (f.perTrickWhen === "missed" && !made) ||
      (f.perTrickWhen === "under" && under > 0);
    score = credited ? f.perTrick * o.taken : 0;
    if (made) score += evalPoly(f.exact, o.bid);
    if (over > 0) score += evalPoly(f.over, over);
    if (under > 0) score += evalPoly(f.under, under);
  }
  return f.multiplier === "hand-number" ? score * (o.handIndex + 1) : score;
}
