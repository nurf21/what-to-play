import Papa from "papaparse";
import { normalizeGame, type Game, type GameInput } from "./games";

export const csvTemplate = "title,platform,external_id,genres,status,cover_url,store_url,playtime_minutes\r\n";
export const maxCsvSize = 5 * 1024 * 1024;

const columns = {
  title: ["title", "name", "game", "game_title"],
  platform: ["platform", "store"],
  externalId: ["external_id", "appid", "app_id", "catalog_id"],
  genres: ["genres", "genre"],
  status: ["status", "play_status"],
  coverUrl: ["cover_url", "image_url"],
  storeUrl: ["store_url", "url"],
  playtime: ["playtime_minutes", "playtime_forever"],
} satisfies Record<keyof GameInput, string[]>;

export function parseLibraryCsv(csv: string, defaultPlatform?: string) {
  const parsed = Papa.parse<string[]>(csv, { skipEmptyLines: "greedy" });
  if (parsed.errors.some((error) => error.code !== "UndetectableDelimiter")) {
    throw new Error("The CSV could not be read. Check delimiters and quoted fields.");
  }
  const [header, ...rows] = parsed.data;
  const fields = header?.map((name) => name.trim().toLowerCase().replace(/[\s-]+/g, "_")) ?? [];
  const indexes = Object.entries(columns).map(([key, aliases]) =>
    [key, fields.findIndex((field) => aliases.includes(field))] as const,
  );
  if (!fields.some((field) => columns.title.includes(field))) throw new Error("CSV needs a title column.");
  if (!defaultPlatform && !fields.some((field) => columns.platform.includes(field))) {
    throw new Error("Add a platform column or select a default platform.");
  }
  if (!rows.length) throw new Error("The CSV contains no games.");
  if (rows.length > 10000) throw new Error("Import up to 10,000 games per file.");
  const games: Game[] = [];
  const issues: string[] = [];
  rows.forEach((row, index) => {
    try {
      if (row.length !== fields.length) throw new Error(`Expected ${fields.length} columns, found ${row.length}.`);
      const input = Object.fromEntries(indexes.map(([key, field]) => [key, row[field]])) as GameInput;
      input.platform = input.platform?.trim() || defaultPlatform;
      games.push(normalizeGame(input));
    } catch (error) {
      issues.push(`Record ${index + 2}: ${(error as Error).message}`);
    }
  });
  return { games, issues };
}

export function mergeGames(existing: Game[], incoming: Game[]) {
  const games = new Map(existing.map((game) => [game.id, game]));
  const byExternal = new Map<string, Game>();
  const byTitle = new Map<string, Game[]>();
  const externalKey = (game: Game) => `${game.platform}:${game.externalId}`;
  const titleKey = (game: Game) => `${game.platform}:${game.title.toLowerCase()}`;
  function index(game: Game, previous?: Game) {
    games.set(game.id, game);
    if (game.externalId) byExternal.set(externalKey(game), game);
    if (previous && titleKey(previous) !== titleKey(game)) {
      const key = titleKey(previous);
      byTitle.set(key, (byTitle.get(key) ?? []).filter((entry) => entry.id !== game.id));
    }
    const key = titleKey(game);
    byTitle.set(key, [...(byTitle.get(key) ?? []).filter((entry) => entry.id !== game.id), game]);
  }
  existing.forEach((game) => index(game));
  let added = 0;
  let duplicates = 0;
  for (const game of incoming) {
    const titleMatches = byTitle.get(titleKey(game)) ?? [];
    const compatible = titleMatches.filter((entry) => !game.externalId || !entry.externalId);
    const exact = game.externalId ? byExternal.get(externalKey(game)) : undefined;
    const match = exact ?? (compatible.length === 1 ? compatible[0] : undefined);
    if (!match) {
      // A title-only row cannot distinguish two editions already identified by ID.
      if (!game.externalId && titleMatches.length) {
        duplicates++;
        continue;
      }
      index(game);
      added++;
      continue;
    }
    index({
      ...match,
      externalId: match.externalId ?? game.externalId,
      genres: match.genres.length ? match.genres : game.genres,
      coverUrl: match.coverUrl ?? game.coverUrl,
      storeUrl: match.storeUrl ?? game.storeUrl,
      playtime: game.playtime ?? match.playtime,
    }, match);
    duplicates++;
  }
  return { games: [...games.values()], added, duplicates };
}
