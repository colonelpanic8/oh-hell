import {
  Formula,
  poly,
  Poly,
  Rules,
  Schedule,
  Suit,
  TrumpRule,
  ZERO_FORMULA,
} from "./rules";

const TURN_UP: TrumpRule = {
  cycle: [{ kind: "turn-up" }],
  noTrumpOnFullDeal: true,
};

/** The dealer's own last card is turned, so every hand has trumps. */
const TURN_UP_DEALT: TrumpRule = {
  cycle: [{ kind: "turn-up" }],
  noTrumpOnFullDeal: false,
};

function rotate(suits: Suit[]): TrumpRule {
  return {
    cycle: suits.map((suit) => ({ kind: "suit", suit })),
    noTrumpOnFullDeal: false,
  };
}

const PAGAT: Formula = { ...ZERO_FORMULA, perTrick: 1, exact: poly(10) };
const BLACKOUT: Formula = { ...ZERO_FORMULA, exact: poly(10, 1) };

/** `exact` for an exact bid, `perTrickOff` for each trick over or under. */
function penalty(exact: Poly, perTrickOff: Poly): Formula {
  return { ...ZERO_FORMULA, exact, over: perTrickOff, under: perTrickOff };
}

/** pagat's deal: start at 10 cards (fewer for 6+ players), down to 1 and back. */
const PAGAT_DEAL: Schedule = {
  shape: "down-up",
  peak: { kind: "cards", cards: 10 },
};

function rules(
  scoring: Formula,
  overrides: Partial<Omit<Rules, "scoring">> = {},
): Rules {
  return {
    schedule: PAGAT_DEAL,
    hook: true,
    trump: TURN_UP,
    target: null,
    scoring,
    ...overrides,
  };
}

export interface Preset {
  id: string;
  name: string;
  summary: string;
  rules: Rules;
}

export const PRESETS: readonly Preset[] = [
  {
    id: "tricks-or-difference",
    name: "Tricks or difference",
    summary:
      "Your bid in points if you make it, minus the difference if you miss.",
    rules: rules(penalty(poly(0, 1), poly(0, -1)), {
      schedule: { shape: "up-down", peak: { kind: "max" } },
    }),
  },
  {
    id: "pagat",
    name: "Oh Hell (pagat)",
    summary: "1 per trick, +10 for an exact bid.",
    rules: rules(PAGAT),
  },
  {
    id: "blackout",
    name: "Blackout",
    summary: "10 + bid for an exact bid, nothing otherwise.",
    rules: rules(BLACKOUT),
  },
  {
    id: "vienna",
    name: "Vienna",
    summary:
      "1 per trick, +10 for an exact bid; a made zero scores 5 + cards dealt.",
    rules: rules({ ...PAGAT, exactZero: { kind: "plus-cards", points: 5 } }),
  },
  {
    id: "multiplied",
    name: "Multiplied",
    summary: "10 × bid for an exact bid (10 for zero), −10 per trick off.",
    rules: rules({
      ...penalty(poly(0, 10), poly(0, -10)),
      exactZero: { kind: "points", points: 10 },
    }),
  },
  {
    id: "win-loss",
    name: "Win/loss",
    summary: "5 + 10 per trick for an exact bid, −5 and −5 per trick off.",
    rules: rules(penalty(poly(5, 10), poly(-5, -5))),
  },
  {
    id: "negative",
    name: "Negative",
    summary: "10 for an exact bid, −10 per trick off.",
    rules: rules(penalty(poly(10), poly(0, -10))),
  },
  {
    id: "balanced",
    name: "Balanced",
    summary: "10 + bid for an exact bid, −2 per trick off.",
    rules: rules(penalty(poly(10, 1), poly(0, -2))),
  },
  {
    id: "hybrid",
    name: "Hybrid",
    summary:
      "10 + bid for an exact bid, tricks taken when under, nothing when over.",
    rules: rules({ ...BLACKOUT, perTrick: 1, perTrickWhen: "under" }),
  },
  {
    id: "doubles",
    name: "Doubles",
    summary: "10 + 2 × bid for an exact bid, −2 per trick off.",
    rules: rules(penalty(poly(10, 2), poly(0, -2))),
  },
  {
    id: "triples",
    name: "Triples",
    summary: "10 + 3 × bid for an exact bid, −3 per trick off.",
    rules: rules(penalty(poly(10, 3), poly(0, -3))),
  },
  {
    id: "squares",
    name: "Squares",
    summary: "10 + bid² for an exact bid, −(tricks off)².",
    rules: rules(penalty(poly(10, 0, 1), poly(0, 0, -1))),
  },
  {
    id: "anderson",
    name: "Anderson",
    summary: "10 × bid for an exact bid, −10 per trick off, × hand number.",
    rules: rules({
      ...penalty(poly(0, 10), poly(0, -10)),
      multiplier: "hand-number",
    }),
  },
  {
    id: "oh-well",
    name: "Oh! Well",
    summary:
      "Every card dealt every hand, 1 per trick +10 exact, first to 100.",
    rules: rules(PAGAT, {
      schedule: { shape: "constant", peak: { kind: "max" } },
      hook: false,
      trump: TURN_UP_DEALT,
      target: 100,
    }),
  },
  {
    id: "oh-pshaw",
    name: "Oh Pshaw",
    summary: "Hands grow from 1 card; 10 + bid only for an exact bid.",
    rules: rules(BLACKOUT, {
      schedule: { shape: "up", peak: { kind: "cards", cards: 15 } },
      hook: false,
    }),
  },
  {
    id: "parlett",
    name: "British Oh Hell",
    summary: "Hands grow from 1 card; 10 for an exact bid, nothing else.",
    rules: rules(
      { ...ZERO_FORMULA, exact: poly(10) },
      { schedule: { shape: "up", peak: { kind: "max" } }, hook: false },
    ),
  },
  {
    id: "contract-whist",
    name: "Contract Whist",
    summary: "7 down to 1 and back, trumps rotate H C D S.",
    rules: rules(PAGAT, {
      schedule: { shape: "down-up", peak: { kind: "cards", cards: 7 } },
      trump: rotate(["hearts", "clubs", "diamonds", "spades"]),
    }),
  },
  {
    id: "kachuful",
    name: "Kachuful",
    summary: "Hands grow from 1 card, trumps rotate S D C H, 10 + bid exact.",
    rules: rules(BLACKOUT, {
      schedule: { shape: "up", peak: { kind: "max" } },
      trump: rotate(["spades", "diamonds", "clubs", "hearts"]),
    }),
  },
  {
    id: "10-op-en-neer",
    name: "10 op en neer",
    summary: "1 up to 10 and back, no hook, 10 + bid exact.",
    rules: rules(BLACKOUT, {
      schedule: { shape: "up-down", peak: { kind: "cards", cards: 10 } },
      hook: false,
    }),
  },
];

export const DEFAULT_PRESET = PRESETS[0]!;

export function presetById(id: string): Preset | undefined {
  return PRESETS.find((p) => p.id === id);
}

function same(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== "object" || typeof b !== "object" || !a || !b) return false;
  const ka = Object.keys(a);
  const kb = Object.keys(b);
  return (
    ka.length === kb.length &&
    ka.every((k) =>
      same(
        (a as Record<string, unknown>)[k],
        (b as Record<string, unknown>)[k],
      ),
    )
  );
}

/** The preset whose rules exactly match, if any. */
export function matchingPreset(rules: Rules): Preset | undefined {
  return PRESETS.find((p) => same(p.rules, rules));
}
