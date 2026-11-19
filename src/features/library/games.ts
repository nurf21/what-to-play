export const platforms = ["Steam", "Epic Games"] as const;
export const statuses = ["Not Played", "Playing", "Completed", "Dropped"] as const;
export type Platform = (typeof platforms)[number];
export type Status = (typeof statuses)[number];

export interface Game {
  id: string;
  title: string;
  platform: Platform;
  externalId?: string;
  genres: string[];
  coverUrl?: string;
  storeUrl?: string;
  playtime?: number;
  status: Status;
  excluded: boolean;
  addedAt: number;
}

export interface GameInput {
  title?: string;
  platform?: string;
  externalId?: string;
  genres?: string;
  coverUrl?: string;
  storeUrl?: string;
  playtime?: string;
  status?: string;
}

export function normalizeTitle(title: string) {
  return title.normalize("NFKC").trim().replace(/\s+/g, " ");
}

function httpsUrl(raw: string | undefined, name: string) {
  if (!raw?.trim()) return undefined;
  try {
    const url = new URL(raw.trim());
    if (url.protocol === "https:" && !url.username && !url.password && url.href.length <= 2048) return url.href;
  } catch {
    // Report the same validation message for malformed and unsupported URLs.
  }
  throw new Error(`${name} must be a valid HTTPS URL.`);
}

export function normalizeGame(input: GameInput, id = crypto.randomUUID(), addedAt = Date.now()): Game {
  const title = normalizeTitle(input.title ?? "");
  if (!title || title.length > 200) throw new Error("Title must contain 1 to 200 characters.");
  const platform = platforms.find((item) => item.toLowerCase() === input.platform?.trim().toLowerCase())
    ?? (input.platform?.trim().toLowerCase() === "epic" ? "Epic Games" : undefined);
  if (!platform) throw new Error("Platform must be Steam or Epic Games.");
  const status = statuses.find((item) => item.toLowerCase() === input.status?.trim().toLowerCase());
  if (input.status?.trim() && !status) throw new Error("Unknown play status.");
  const externalId = input.externalId?.trim().toLowerCase() || undefined;
  if (externalId && (platform === "Steam" ? !/^\d{1,10}$/.test(externalId) || Number(externalId) < 1 || Number(externalId) > 4294967295 : !/^[a-z0-9._:-]{1,128}$/.test(externalId))) {
    throw new Error("Invalid platform game ID.");
  }
  const normalizedId = platform === "Steam" && externalId ? String(Number(externalId)) : externalId;
  const genres = [...new Map((input.genres ?? "").split(/[|;,]/).map(normalizeTitle).filter(Boolean)
    .map((genre) => [genre.toLowerCase(), genre])).values()];
  if (genres.length > 20 || genres.some((genre) => genre.length > 60)) throw new Error("Enter up to 20 genres of 60 characters each.");
  const playtime = input.playtime?.trim() ? Number(input.playtime) : undefined;
  if (playtime !== undefined && (!Number.isSafeInteger(playtime) || playtime < 0)) {
    throw new Error("Playtime must be a non-negative whole number of minutes.");
  }
  const steam = platform === "Steam" && normalizedId;
  return {
    id, title, platform, externalId: normalizedId, genres, playtime, addedAt,
    status: status ?? "Not Played", excluded: false,
    storeUrl: httpsUrl(input.storeUrl, "Store link") ?? (steam ? `https://store.steampowered.com/app/${normalizedId}/` : undefined),
    coverUrl: httpsUrl(input.coverUrl, "Cover link") ?? (steam ? `https://cdn.cloudflare.steamstatic.com/steam/apps/${normalizedId}/header.jpg` : undefined),
  };
}

export interface GameFilters { platform: string; genre: string; status: string }
export const emptyFilters: GameFilters = { platform: "", genre: "", status: "" };
export type Sort = "recent" | "title" | "playtime";

export function filterGames(games: Game[], filters: GameFilters, search = "") {
  const query = normalizeTitle(search).toLowerCase();
  return games.filter((game) =>
    (!filters.platform || game.platform === filters.platform) &&
    (!filters.genre || game.genres.some((genre) => genre.toLowerCase() === filters.genre.toLowerCase())) &&
    (!filters.status || game.status === filters.status) &&
    (!query || game.title.toLowerCase().includes(query)),
  );
}

export function sortGames(games: Game[], sort: Sort) {
  const byTitle = (a: Game, b: Game) => a.title.localeCompare(b.title, undefined, { sensitivity: "base", numeric: true });
  return [...games].sort((a, b) => {
    if (sort === "title") return byTitle(a, b);
    if (sort === "playtime") return (b.playtime ?? -1) - (a.playtime ?? -1) || byTitle(a, b);
    return b.addedAt - a.addedAt || byTitle(a, b);
  });
}

export function listGenres(games: Game[]) {
  return [...new Map(games.flatMap((game) => game.genres.map((genre) => [genre.toLowerCase(), genre] as const))).values()]
    .sort((a, b) => a.localeCompare(b));
}
