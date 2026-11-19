import { describe, expect, it } from "vitest";
import { emptyFilters, filterGames, listGenres, normalizeGame, sortGames } from "./games";

describe("game normalization", () => {
  it("normalizes Unicode, whitespace, platform, status, genres, and Steam IDs", () => {
    const game = normalizeGame({
      title: "  Ｈades   II ", platform: " steam ", externalId: "0001145360",
      genres: "RPG | Action | rpg", status: "playing", playtime: "0",
    }, "example", 42);
    expect(game).toMatchObject({
      title: "Hades II", platform: "Steam", externalId: "1145360", genres: ["rpg", "Action"], status: "Playing",
      playtime: 0, excluded: false, id: "example", addedAt: 42,
      storeUrl: "https://store.steampowered.com/app/1145360/",
    });
    expect(game.coverUrl).toContain("/1145360/");
    expect(normalizeGame({ title: "Celeste", platform: "EPIC" })).toMatchObject({ platform: "Epic Games", status: "Not Played" });
  });

  it.each([
    { title: " ", platform: "Steam" },
    { title: "Game", platform: "Unknown" },
    { title: "Game", platform: "Steam", externalId: "4294967296" },
    { title: "Game", platform: "Steam", status: "Paused" },
    { title: "Game", platform: "Steam", playtime: "-1" },
    { title: "Game", platform: "Steam", playtime: "1.5" },
    { title: "Game", platform: "Steam", storeUrl: "javascript:alert(1)" },
    { title: "Game", platform: "Steam", coverUrl: "https://user:pass@example.com/" },
  ])("rejects invalid input %#", (input) => {
    expect(() => normalizeGame(input)).toThrow();
  });
});

const games = [
  normalizeGame({ title: "Alpha II", platform: "Epic", genres: "action", status: "Playing", playtime: "35" }, "a", 2),
  normalizeGame({ title: "Beta", platform: "Steam", genres: "Action | RPG", status: "Playing", playtime: "2" }, "b", 1),
  { ...normalizeGame({ title: "Alpha I", platform: "Steam", genres: "Action", status: "Completed", playtime: "25" }, "c", 3), excluded: true },
];

describe("library filters and sort", () => {
  it("intersects filters and matches search and genre without case sensitivity", () => {
    expect(filterGames(games, { platform: "Steam", genre: "ACTION", status: "Playing" }, "  BE ")).toEqual([games[1]]);
    expect(filterGames(games, emptyFilters, "Alpha")).toEqual([games[0], games[2]]);
    expect(filterGames(games, { ...emptyFilters, status: "Dropped" })).toEqual([]);
    expect(listGenres(games)).toEqual(["Action", "RPG"]);
  });

  it("sorts by the requested field without mutating the collection", () => {
    expect(sortGames(games, "recent").map((game) => game.id)).toEqual(["c", "a", "b"]);
    expect(sortGames(games, "title").map((game) => game.id)).toEqual(["c", "a", "b"]);
    expect(sortGames(games, "playtime").map((game) => game.id)).toEqual(["a", "c", "b"]);
    expect(games.map((game) => game.id)).toEqual(["a", "b", "c"]);
  });
});
