import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./route";

const steamId = "76561198012345678";

function request(id = steamId, site = "same-origin") {
  return new Request("http://localhost/api/steam", {
    method: "POST",
    headers: { "content-type": "application/json", "sec-fetch-site": site },
    body: JSON.stringify({ steamId: id }),
  });
}

beforeEach(() => {
  vi.stubEnv("STEAM_WEB_API_KEY", "test-key");
  vi.stubEnv("STEAM_ACCOUNT_ID", steamId);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("Steam import route", () => {
  it("reports an unavailable integration without a server key", async () => {
    vi.stubEnv("STEAM_WEB_API_KEY", "");
    expect(await GET().json()).toEqual({ enabled: false });
    expect((await POST(request())).status).toBe(503);
  });

  it("rejects another account and cross-origin browser requests", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    expect((await POST(request("76561198000000000"))).status).toBe(400);
    expect((await POST(request(steamId, "cross-site"))).status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("maps a successful Steam response and skips invalid records", async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json({
      response: { game_count: 2, games: [{ appid: 367520, name: "Hollow Knight", playtime_forever: 60 }, { appid: 7 }] },
    }));
    vi.stubGlobal("fetch", fetch);
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      games: [{ platform: "Steam", title: "Hollow Knight", externalId: "367520", playtime: 60 }],
      skipped: 1,
    });
    const url = fetch.mock.calls[0][0] as URL;
    expect(url.hostname).toBe("api.steampowered.com");
    expect(url.searchParams.get("steamid")).toBe(steamId);
  });

  it("reports an invisible library without treating it as empty", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ response: {} })));
    expect((await POST(request())).status).toBe(422);
  });
});
