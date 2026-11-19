import { NextResponse } from "next/server";
import { normalizeGame } from "@/features/library/games";

const steamIdPattern = /^7656\d{13}$/;

function configuration() {
  const key = process.env.STEAM_WEB_API_KEY?.trim();
  const account = process.env.STEAM_ACCOUNT_ID?.trim();
  return key && account && steamIdPattern.test(account) ? { key, account } : null;
}

export function GET() {
  return NextResponse.json({ enabled: Boolean(configuration()) }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const config = configuration();
  if (!config) return NextResponse.json({ error: "Steam import is disabled on this server." }, { status: 503 });
  const fetchSite = request.headers.get("sec-fetch-site");
  const contentType = request.headers.get("content-type")?.split(";")[0].trim();
  if ((fetchSite && fetchSite !== "same-origin") || contentType !== "application/json") {
    return NextResponse.json({ error: "Invalid Steam import request." }, { status: 400 });
  }
  const body: unknown = await request.json().catch(() => null);
  const id = body && typeof body === "object" && "steamId" in body ? body.steamId : undefined;
  if (typeof id !== "string" || !steamIdPattern.test(id) || id !== config.account) {
    return NextResponse.json({ error: "Enter the SteamID64 configured for this server." }, { status: 400 });
  }

  const url = new URL("https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/");
  url.search = new URLSearchParams({ key: config.key, steamid: id, include_appinfo: "1", include_played_free_games: "1" }).toString();
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(10000), cache: "no-store", redirect: "error" });
    if (!response.ok) {
      const error = response.status === 429 ? "Steam’s API is rate limited. Try again later." :
        "Steam rejected the request. Check the server key and your Game Details privacy.";
      return NextResponse.json({ error }, { status: 502 });
    }
    const data: { response?: { game_count?: unknown; games?: unknown } } = await response.json();
    if (!Array.isArray(data.response?.games)) {
      return data.response?.game_count === 0
        ? NextResponse.json({ games: [], skipped: 0 })
        : NextResponse.json({ error: "Steam returned no library. Make your Game Details public or import a CSV." }, { status: 422 });
    }
    let skipped = 0;
    const games = data.response.games.flatMap((entry: unknown) => {
      if (entry && typeof entry === "object" && "appid" in entry && typeof entry.appid === "number" && "name" in entry && typeof entry.name === "string") {
        try {
          const minutes = "playtime_forever" in entry && typeof entry.playtime_forever === "number" ? entry.playtime_forever : undefined;
          return [normalizeGame({
            title: entry.name, platform: "Steam", externalId: String(entry.appid),
            playtime: minutes === undefined ? undefined : String(minutes), status: minutes ? "Playing" : "Not Played",
          })];
        } catch { /* Count invalid upstream records with the other skipped rows. */ }
      }
      skipped++;
      return [];
    });
    return NextResponse.json({ games, skipped });
  } catch {
    return NextResponse.json({ error: "Could not reach Steam. Try again or import a CSV." }, { status: 502 });
  }
}
