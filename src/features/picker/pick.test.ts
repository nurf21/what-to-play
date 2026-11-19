import { describe, expect, it } from "vitest";
import { emptyFilters, normalizeGame } from "../library/games";
import { eligibleGames, pickGame } from "./pick";

const games = [
  normalizeGame({ title: "A", platform: "Steam", genres: "RPG" }, "a"),
  normalizeGame({ title: "B", platform: "Steam", genres: "Puzzle", status: "Playing" }, "b"),
  normalizeGame({ title: "C", platform: "Epic", genres: "Puzzle" }, "c"),
];
const first = () => 0;

describe("random picker", () => {
  it("uses platform, status, genre, and exclusions to build a pool", () => {
    const library = [...games, { ...games[0], id: "excluded", excluded: true }];
    expect(eligibleGames(library, { platform: "Steam", status: "Not Played", genre: "rpg" })).toEqual([games[0]]);
    expect(pickGame([], emptyFilters, true, {})).toBeNull();
  });

  it("draws each eligible game before restarting a round", () => {
    const one = pickGame(games, emptyFilters, true, {}, first)!;
    const two = pickGame(games, emptyFilters, true, one.cycles, first)!;
    const three = pickGame(games, emptyFilters, true, two.cycles, first)!;
    const newRound = pickGame(games, emptyFilters, true, three.cycles, first)!;
    expect([one.game.id, two.game.id, three.game.id, newRound.game.id]).toEqual(["a", "b", "c", "a"]);
  });

  it("maintains an independent cycle for changed filters and adapts to removed games", () => {
    const one = pickGame(games, emptyFilters, true, {}, first)!;
    const filters = { ...emptyFilters, platform: "Steam" };
    const filtered = pickGame(eligibleGames(games, filters), filters, true, one.cycles, first)!;
    expect(filtered.game.id).toBe("a");
    expect(pickGame(games.slice(1), emptyFilters, true, filtered.cycles, first)?.game.id).toBe("b");
  });

  it("uses the supplied RNG and permits repeats when enabled", () => {
    const noRepeats = pickGame(games, emptyFilters, true, {}, () => 0.99)!;
    const repeat = pickGame(games, emptyFilters, false, noRepeats.cycles, () => 0.99)!;
    expect(repeat.game.id).toBe("c");
    expect(repeat.cycles).toBe(noRepeats.cycles);
  });
});
