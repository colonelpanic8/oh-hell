import {
  biddingOrder,
  bidProblem,
  Game,
  isFinished,
  legalBidsFor,
  newGame,
  scoresheet,
  standings,
  tricksProblem,
} from "@/lib/game";
import { presetById } from "@/lib/presets";

function game(presetId: string, players = 4): Game {
  const names = ["Ann", "Bo", "Cy", "Di", "Ed", "Flo", "Gus"].slice(0, players);
  return newGame("g", names, presetById(presetId)!.rules, 0);
}

test("the deal rotates and the dealer bids last", () => {
  const g = game("pagat");
  expect(biddingOrder(g, 0)).toEqual([1, 2, 3, 0]);
  expect(biddingOrder(g, 1)).toEqual([2, 3, 0, 1]);
  expect(biddingOrder({ ...g, firstDealer: 2 }, 0)).toEqual([3, 0, 1, 2]);
});

test("the hook only restricts the dealer once everyone else has bid", () => {
  const g = game("pagat");
  // Hand 7 deals 3 cards; seat 3 (Di) deals.
  expect(legalBidsFor(g, 7, [1, 0, null, null], 3)).toEqual([0, 1, 2, 3]);
  expect(legalBidsFor(g, 7, [1, 0, 1, null], 3)).toEqual([0, 2, 3]);
  expect(legalBidsFor(g, 7, [null, 0, 1, 1], 0)).toEqual([0, 1, 2, 3]);
  expect(bidProblem(g, 7, [1, 0, 1, 1])).toMatch(/Di can't bid 1/);
  expect(bidProblem(g, 7, [1, 0, 1, 2])).toBeNull();
  const open = game("10-op-en-neer");
  expect(legalBidsFor(open, 2, [1, 0, null, 1], 2)).toEqual([0, 1, 2, 3]);
});

test("tricks must add up to the cards dealt", () => {
  const g = game("pagat");
  expect(tricksProblem(g, 7, [1, 1, 1, 0])).toBeNull();
  expect(tricksProblem(g, 7, [1, 1, null, null])).toMatch(/Everyone/);
  expect(tricksProblem(g, 7, [2, 2, null, null])).toMatch(/only 3/);
  expect(tricksProblem(g, 7, [1, 1, 0, 0])).toMatch(/2 tricks; 3/);
});

test("scoresheet totals and finishing with the schedule", () => {
  const g = game("tricks-or-difference", 7);
  // 7 players: 1..7..1 is 13 hands. Seat 0 always bids and takes every trick.
  g.hands = Array.from({ length: 13 }, (_, i) => {
    const cards = i < 7 ? i + 1 : 13 - i;
    return {
      bids: [cards, 1, 0, 0, 0, 0, 0],
      taken: [cards, 0, 0, 0, 0, 0, 0],
    };
  });
  const sheet = scoresheet(g);
  expect(sheet.totals[0]).toBe(49);
  expect(sheet.totals[1]).toBe(-13);
  expect(sheet.totals[2]).toBe(0);
  expect(isFinished(g, sheet)).toBe(true);
  expect(isFinished({ ...g, hands: g.hands.slice(0, 12) })).toBe(false);
});

test("target games end once someone reaches the target", () => {
  const g = game("oh-well");
  const hand = { bids: [13, 0, 0, 0], taken: [13, 0, 0, 0] };
  g.hands = Array(4).fill(hand);
  expect(scoresheet(g).totals[0]).toBe(92);
  expect(isFinished(g)).toBe(false);
  g.hands = Array(5).fill(hand);
  expect(isFinished(g)).toBe(true);
});

test("standings share ranks on ties", () => {
  expect(standings([5, 10, 5, -2])).toEqual([
    { seat: 1, total: 10, rank: 1 },
    { seat: 0, total: 5, rank: 2 },
    { seat: 2, total: 5, rank: 2 },
    { seat: 3, total: -2, rank: 4 },
  ]);
});
