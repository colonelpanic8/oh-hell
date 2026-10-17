import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { Game, newGame } from "@/lib/game";
import { DEFAULT_PRESET } from "@/lib/presets";
import { Rules } from "@/lib/rules";
import {
  loadGames,
  loadLastSetup,
  removeGame,
  saveGame,
  saveLastSetup,
  Setup,
} from "@/lib/storage";

interface GamesContextValue {
  /** `null` until loaded. */
  games: Game[] | null;
  lastSetup: Setup;
  createGame: (players: string[], rules: Rules, firstDealer: number) => string;
  updateGame: (id: string, update: (game: Game) => Game) => void;
  deleteGame: (id: string) => void;
}

const GamesContext = createContext<GamesContextValue | null>(null);

function makeId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export function GamesProvider({ children }: { children: ReactNode }) {
  const [games, setGames] = useState<Game[] | null>(null);
  // The latest list, so back-to-back updates build on each other.
  const gamesRef = useRef<Game[] | null>(null);
  const apply = useCallback((change: (games: Game[]) => Game[]) => {
    const next = change(gamesRef.current ?? []);
    gamesRef.current = next;
    setGames(next);
  }, []);
  const [lastSetup, setLastSetup] = useState<Setup>({
    players: [],
    rules: DEFAULT_PRESET.rules,
  });
  // Writes are chained so they land in the order they were made.
  const writes = useRef<Promise<void>>(Promise.resolve());
  const persist = useCallback((write: () => Promise<void>) => {
    writes.current = writes.current.then(write).catch((e) => {
      console.error("Failed to save", e);
    });
  }, []);

  useEffect(() => {
    loadGames().then((loaded) => apply((current) => [...loaded, ...current]));
    loadLastSetup().then((setup) => setup && setLastSetup(setup));
  }, [apply]);

  const createGame = useCallback(
    (players: string[], rules: Rules, firstDealer: number) => {
      const game = {
        ...newGame(makeId(), players, rules, Date.now()),
        firstDealer,
      };
      apply((gs) => [...gs, game]);
      const setup = { players, rules };
      setLastSetup(setup);
      persist(() => saveGame(game));
      persist(() => saveLastSetup(setup));
      return game.id;
    },
    [apply, persist],
  );

  const updateGame = useCallback(
    (id: string, update: (game: Game) => Game) => {
      const game = gamesRef.current?.find((g) => g.id === id);
      if (!game) return;
      const next = { ...update(game), updatedAt: Date.now() };
      apply((gs) => gs.map((g) => (g.id === id ? next : g)));
      persist(() => saveGame(next));
    },
    [apply, persist],
  );

  const deleteGame = useCallback(
    (id: string) => {
      apply((gs) => gs.filter((g) => g.id !== id));
      persist(() => removeGame(id));
    },
    [apply, persist],
  );

  const value = useMemo(
    () => ({ games, lastSetup, createGame, updateGame, deleteGame }),
    [games, lastSetup, createGame, updateGame, deleteGame],
  );
  return (
    <GamesContext.Provider value={value}>{children}</GamesContext.Provider>
  );
}

export function useGames(): GamesContextValue {
  const value = useContext(GamesContext);
  if (!value) throw new Error("useGames needs a GamesProvider");
  return value;
}
