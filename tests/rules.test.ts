import { matchingPreset, Preset, presetById, PRESETS } from "@/lib/presets";
import { cardsForHand, handSizes, scoreHand, trumpForHand } from "@/lib/rules";

function preset(id: string): Preset {
  const p = presetById(id);
  if (!p) throw new Error(`no preset ${id}`);
  return p;
}

/** Score on the first hand with enough cards for the bid and tricks. */
function score(id: string, bid: number, taken: number, handIndex?: number) {
  const { rules } = preset(id);
  let hand = handIndex ?? 0;
  if (handIndex === undefined) {
    while ((cardsForHand(rules, 4, hand) ?? 0) < Math.max(bid, taken)) hand++;
  }
  const cards = cardsForHand(rules, 4, hand)!;
  return scoreHand(rules.scoring, { bid, taken, cards, handIndex: hand });
}

test.each([
  ["tricks-or-difference", 3, 3, 3],
  ["tricks-or-difference", 0, 0, 0],
  ["tricks-or-difference", 2, 5, -3],
  ["tricks-or-difference", 4, 1, -3],
  ["pagat", 2, 2, 12],
  ["pagat", 2, 3, 3],
  ["pagat", 0, 0, 10],
  ["blackout", 2, 2, 12],
  ["blackout", 2, 1, 0],
  ["vienna", 0, 0, 15],
  ["vienna", 1, 1, 11],
  ["multiplied", 3, 3, 30],
  ["multiplied", 0, 0, 10],
  ["multiplied", 3, 1, -20],
  ["win-loss", 2, 2, 25],
  ["win-loss", 2, 4, -15],
  ["negative", 4, 4, 10],
  ["negative", 4, 2, -20],
  ["balanced", 3, 3, 13],
  ["balanced", 3, 0, -6],
  ["hybrid", 3, 1, 1],
  ["hybrid", 1, 3, 0],
  ["doubles", 3, 3, 16],
  ["triples", 3, 5, -6],
  ["squares", 4, 4, 26],
  ["squares", 4, 1, -9],
  ["parlett", 1, 1, 10],
  ["oh-pshaw", 1, 0, 0],
])("%s: bid %i took %i scores %i", (id, bid, taken, expected) => {
  expect(score(id, bid, taken)).toBe(expected);
});

test("anderson's trick value grows each hand", () => {
  expect(score("anderson", 2, 2, 0)).toBe(20);
  expect(score("anderson", 2, 2, 2)).toBe(60);
  expect(score("anderson", 2, 1, 2)).toBe(-30);
});

test("schedules follow the player count", () => {
  const sizes = (id: string, players: number) =>
    handSizes(preset(id).rules.schedule, players);
  expect(sizes("pagat", 4)).toEqual([
    10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
  ]);
  expect(sizes("pagat", 6)[0]).toBe(8);
  expect(sizes("pagat", 7)).toEqual([7, 6, 5, 4, 3, 2, 1, 2, 3, 4, 5, 6, 7]);
  expect(sizes("tricks-or-difference", 5)).toEqual([
    1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1,
  ]);
  expect(sizes("oh-pshaw", 3).at(-1)).toBe(15);
  expect(sizes("oh-pshaw", 4).at(-1)).toBe(13);
  expect(sizes("oh-well", 5)).toEqual([10]);
});

test("trumps", () => {
  const whist = preset("contract-whist").rules;
  expect([0, 1, 2, 3, 4].map((h) => trumpForHand(whist, 4, h))).toEqual(
    ["hearts", "clubs", "diamonds", "spades", "hearts"].map((suit) => ({
      kind: "suit",
      suit,
    })),
  );
  // Hand 12 deals all 52 cards, leaving none to turn up.
  const parlett = preset("parlett").rules;
  expect(trumpForHand(parlett, 4, 11)).toEqual({ kind: "turn-up" });
  expect(trumpForHand(parlett, 4, 12)).toEqual({ kind: "no-trump" });
});

test("presets are recognised from their rules", () => {
  for (const p of PRESETS) {
    expect(matchingPreset(structuredClone(p.rules))?.id).toBe(p.id);
  }
  const tweaked = structuredClone(preset("pagat").rules);
  tweaked.hook = false;
  expect(matchingPreset(tweaked)).toBeUndefined();
});
