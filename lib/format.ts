import { Game, isFinished, scoresheet, standings, totalHands } from "./game";
import { matchingPreset } from "./presets";
import { handSizes, Rules, Suit, Trump } from "./rules";

const SUITS: Record<Suit, string> = {
  clubs: "♣ Clubs",
  diamonds: "♦ Diamonds",
  hearts: "♥ Hearts",
  spades: "♠ Spades",
};

export function trumpLabel(trump: Trump): string {
  switch (trump.kind) {
    case "suit":
      return SUITS[trump.suit];
    case "no-trump":
      return "No trump";
    case "turn-up":
      return "Turn up a card";
  }
}

export function signed(n: number): string {
  return n > 0 ? `+${n}` : n < 0 ? `−${-n}` : "0";
}

export function rulesName(rules: Rules): string {
  return matchingPreset(rules)?.name ?? "Custom rules";
}

export function scheduleLabel(rules: Rules, players: number): string {
  const sizes = handSizes(rules.schedule, players);
  if (rules.schedule.shape === "constant")
    return `${sizes[0]} cards every hand`;
  const peak = Math.max(...sizes);
  const path = {
    "up-down": `1 → ${peak} → 1`,
    "down-up": `${peak} → 1 → ${peak}`,
    up: `1 → ${peak}`,
    down: `${peak} → 1`,
  }[rules.schedule.shape];
  return `${path} (${sizes.length} hands)`;
}

/** One line on where a saved game stands. */
export function gameStatus(game: Game): string {
  const sheet = scoresheet(game);
  if (isFinished(game, sheet)) {
    const winners = standings(sheet.totals)
      .filter((s) => s.rank === 1)
      .map((s) => game.players[s.seat]);
    return `Finished · ${winners.join(" & ")} won`;
  }
  const total = totalHands(game);
  const hand = game.hands.length + 1;
  return total === null ? `Hand ${hand}` : `Hand ${hand} of ${total}`;
}
