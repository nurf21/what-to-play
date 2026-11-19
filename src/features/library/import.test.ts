import { describe, expect, it } from "vitest";
import { normalizeGame } from "./games";
import { mergeGames, parseLibraryCsv } from "./import";

describe("CSV import", () => {
  it("reads BOM, semicolon delimiters, quoted fields, aliases, and two platforms", () => {
    const { games, issues } = parseLibraryCsv(
      '\uFEFFGame Title;Store;App ID;Genre\r\n"One, Two";Steam;42;"RPG;Action"\r\nTitle;epic;epic-123;Puzzle\r\n',
    );
    expect(issues).toEqual([]);
    expect(games).toMatchObject([
      { title: "One, Two", platform: "Steam", externalId: "42", genres: ["RPG", "Action"] },
      { title: "Title", platform: "Epic Games", externalId: "epic-123", genres: ["Puzzle"] },
    ]);
  });

  it("supports a one-column CSV when given a default platform", () => {
    expect(parseLibraryCsv("title\nCeleste\n", "Epic Games").games).toMatchObject([{ title: "Celeste", platform: "Epic Games" }]);
  });

  it("reports invalid records while keeping valid games", () => {
    const { games, issues } = parseLibraryCsv("title,platform,status\nOne,Steam,Playing\nTwo,Epic,Paused\nThree,Steam,Completed\n");
    expect(games.map((game) => game.title)).toEqual(["One", "Three"]);
    expect(issues).toEqual(["Record 3: Unknown play status."]);
    expect(() => parseLibraryCsv("title\nOne")).toThrow(/platform/i);
    expect(() => parseLibraryCsv('title,platform\n"One,Steam')).toThrow(/read/);
  });

  it("deduplicates across imports and preserves progress, exclusions, and identity", () => {
    const existing = { ...normalizeGame({ title: "Hades", platform: "Steam", status: "Completed" }, "saved", 1), excluded: true };
    const { games } = parseLibraryCsv("title,platform,external_id,playtime_minutes\nHades,Steam,1145360,35\nHades,Steam,1145360,35\nHades,Epic,,\n");
    const first = mergeGames([existing], games);
    expect(first).toMatchObject({ added: 1, duplicates: 2 });
    expect(first.games[0]).toMatchObject({ id: "saved", status: "Completed", excluded: true, externalId: "1145360", playtime: 35, addedAt: 1 });
    expect(mergeGames(first.games, games)).toMatchObject({ added: 0, duplicates: 3 });
  });

  it("keeps editions with different platform IDs and skips ambiguous title-only records", () => {
    const { games } = parseLibraryCsv("title,platform,external_id\nGame,Steam,1\nGame,Steam,2\nGame,Steam,\n");
    expect(mergeGames([], games)).toMatchObject({ added: 2, duplicates: 1 });
  });
});
