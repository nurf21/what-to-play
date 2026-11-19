import { openDB, type DBSchema } from "idb";
import { demoGames } from "./demo";
import { emptyFilters, type Game, type GameFilters } from "./games";
import type { Cycles, PickRecord } from "../picker/pick";

export interface LibraryState {
  games: Game[];
  demo: boolean;
  history: PickRecord[];
  cycles: Cycles;
  preferences: { theme: "dark" | "light"; filters: GameFilters; noRepeats: boolean };
}

export const initialState: LibraryState = {
  games: demoGames, demo: true, history: [], cycles: {},
  preferences: { theme: "dark", filters: emptyFilters, noRepeats: true },
};

export interface LibraryRepository {
  read(): Promise<LibraryState>;
  update(change: (state: LibraryState) => LibraryState): Promise<LibraryState>;
}

interface LibraryDatabase extends DBSchema {
  library: { key: "state"; value: LibraryState };
}

let connection: ReturnType<typeof connect> | undefined;
function connect() {
  return openDB<LibraryDatabase>("what-to-play", 1, {
    upgrade(db) { db.createObjectStore("library"); },
    blocking(_current, _next, event) {
      (event.target as IDBDatabase).close();
      connection = undefined;
    },
    terminated() { connection = undefined; },
  });
}

function database() {
  connection ??= connect().catch((error) => {
    connection = undefined;
    throw error;
  });
  return connection;
}

export const indexedLibrary: LibraryRepository = {
  async read() {
    return (await (await database()).get("library", "state")) ?? initialState;
  },
  async update(change) {
    const transaction = (await database()).transaction("library", "readwrite");
    try {
      const next = change((await transaction.store.get("state")) ?? initialState);
      await transaction.store.put(next, "state");
      await transaction.done;
      return next;
    } catch (error) {
      try { transaction.abort(); } catch { /* The transaction has already closed. */ }
      await transaction.done.catch(() => {});
      throw error;
    }
  },
};
