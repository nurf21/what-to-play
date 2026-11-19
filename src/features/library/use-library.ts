"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { indexedLibrary, initialState, type LibraryState } from "./repository";

export function useLibrary() {
  const [state, setState] = useState(initialState);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const channel = useRef<BroadcastChannel | null>(null);
  const refresh = useCallback(() => indexedLibrary.read()
    .then((saved) => {
      setState(saved);
      setError("");
      setReady(true);
    })
    .catch(() => {
      setError("Your local library could not be opened. Check that browser storage is available.");
    }), []);
  useEffect(() => {
    if ("BroadcastChannel" in window) {
      channel.current = new BroadcastChannel("what-to-play");
      channel.current.onmessage = () => { void refresh(); };
    }
    void refresh();
    return () => {
      channel.current?.close();
      channel.current = null;
    };
  }, [refresh]);

  async function update(change: (current: LibraryState) => LibraryState) {
    let next: LibraryState;
    try {
      next = await indexedLibrary.update(change);
    } catch (error) {
      if (error instanceof DOMException) throw new Error("Your changes could not be saved to browser storage.", { cause: error });
      throw error;
    }
    setState(next);
    channel.current?.postMessage("updated");
    return next;
  }

  return { state, ready, error, refresh, update };
}
