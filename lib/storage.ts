// AsyncStorage persistence (localStorage on web): one entry per game plus an index.

import AsyncStorage from "@react-native-async-storage/async-storage";

import { Game } from "./game";
import { Rules } from "./rules";

const INDEX_KEY = "oh-hell:games";
const LAST_SETUP_KEY = "oh-hell:last-setup";
const gameKey = (id: string) => `oh-hell:game:${id}`;

/** What the next new game starts from. */
export interface Setup {
  players: string[];
  rules: Rules;
}

async function readIndex(): Promise<string[]> {
  const raw = await AsyncStorage.getItem(INDEX_KEY);
  return raw ? (JSON.parse(raw) as string[]) : [];
}

export async function loadGames(): Promise<Game[]> {
  const ids = await readIndex();
  const entries = await AsyncStorage.multiGet(ids.map(gameKey));
  return entries.flatMap(([, raw]) => (raw ? [JSON.parse(raw) as Game] : []));
}

export async function saveGame(game: Game): Promise<void> {
  const ids = await readIndex();
  if (!ids.includes(game.id)) {
    await AsyncStorage.setItem(INDEX_KEY, JSON.stringify([...ids, game.id]));
  }
  await AsyncStorage.setItem(gameKey(game.id), JSON.stringify(game));
}

export async function removeGame(id: string): Promise<void> {
  const ids = await readIndex();
  await AsyncStorage.setItem(
    INDEX_KEY,
    JSON.stringify(ids.filter((i) => i !== id)),
  );
  await AsyncStorage.removeItem(gameKey(id));
}

export async function loadLastSetup(): Promise<Setup | null> {
  const raw = await AsyncStorage.getItem(LAST_SETUP_KEY);
  return raw ? (JSON.parse(raw) as Setup) : null;
}

export async function saveLastSetup(setup: Setup): Promise<void> {
  await AsyncStorage.setItem(LAST_SETUP_KEY, JSON.stringify(setup));
}
