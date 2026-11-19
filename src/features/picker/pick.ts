import { filterGames, type Game, type GameFilters } from "../library/games";

export interface PickRecord {
  id: string;
  gameId: string;
  title: string;
  platform: Game["platform"];
  pickedAt: number;
}

export type Cycles = Record<string, string[]>;

export function eligibleGames(games: Game[], filters: GameFilters) {
  return filterGames(games, filters).filter((game) => !game.excluded);
}

export function pickGame(pool: Game[], filters: GameFilters, noRepeats: boolean, cycles: Cycles, random = Math.random) {
  if (!pool.length) return null;
  const key = JSON.stringify([filters.platform, filters.genre.toLowerCase(), filters.status]);
  let seen = noRepeats ? (cycles[key] ?? []) : [];
  const visited = new Set(seen);
  let available = pool.filter((game) => !visited.has(game.id));
  if (!available.length) {
    available = pool;
    seen = [];
  }
  const game = available[Math.floor(random() * available.length)];
  return { game, cycles: noRepeats ? { ...cycles, [key]: [...seen, game.id] } : cycles };
}
