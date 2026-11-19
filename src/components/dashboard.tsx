"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowRight, CheckCircle2, ChevronRight, CircleAlert, CirclePlay, Dice5, Gamepad2, History, LayoutGrid,
  Layers3, LibraryBig, LoaderCircle, Moon, Plus, Settings2, ShieldCheck, Shuffle, Sun, Upload, X,
} from "lucide-react";
import { Button } from "./ui/button";
import { Switch } from "./ui/switch";
import { AddDialog, GameDialog, ImportDialog } from "@/features/library/library-dialogs";
import { LibraryView } from "@/features/library/library-view";
import { mergeGames } from "@/features/library/import";
import { useLibrary } from "@/features/library/use-library";
import { emptyFilters, type Game, type GameFilters } from "@/features/library/games";
import type { LibraryState } from "@/features/library/repository";
import { eligibleGames, pickGame } from "@/features/picker/pick";
import { PickerHero, PickerOptions, PickHistory } from "@/features/picker/picker-view";

const nav = [
  { id: "dashboard", label: "Dashboard", icon: LayoutGrid, description: "Your library at a glance. Your next game is one roll away." },
  { id: "library", label: "Game Library", icon: LibraryBig, description: "Browse and manage your Steam and Epic Games collection." },
  { id: "picker", label: "Random Picker", icon: Shuffle, description: "Set your filters, roll the dice, and see what comes up." },
  { id: "history", label: "Pick History", icon: History, description: "Revisit the games you’ve rolled." },
  { id: "settings", label: "Settings", icon: Settings2, description: "Manage your appearance and local library preferences." },
] as const;
type Page = (typeof nav)[number]["id"];
type OpenDialog = { type: "import" | "add" } | { type: "game"; id: string };

function statsFor(games: Game[]) {
  return [
    { title: "Total games", count: games.length, icon: Gamepad2, color: "violet" },
    { title: "Not played", count: games.filter((game) => game.status === "Not Played").length, icon: Layers3, color: "blue" },
    { title: "Playing", count: games.filter((game) => game.status === "Playing").length, icon: CirclePlay, color: "gold" },
    { title: "Completed", count: games.filter((game) => game.status === "Completed").length, icon: CheckCircle2, color: "mint" },
  ];
}

export function Dashboard() {
  const { state, ready, error, refresh, update } = useLibrary();
  const [page, setPage] = useState<Page>("dashboard");
  const [dialog, setDialog] = useState<OpenDialog>();
  const [toast, setToast] = useState<{ text: string; error?: boolean }>();
  const [rolling, setRolling] = useState(false);
  const [resultId, setResultId] = useState<string>();
  const [saving, setSaving] = useState(false);
  const rollLock = useRef(false);
  const { games, demo, history, preferences } = state;
  const poolSize = eligibleGames(games, preferences.filters).length;
  const current = nav.find((item) => item.id === page) ?? nav[0];
  const result = games.find((game) => game.id === resultId);
  const selectedGame = dialog?.type === "game" ? games.find((game) => game.id === dialog.id) : undefined;

  useEffect(() => {
    const sync = () => {
      const location = window.location.hash.slice(1);
      setPage(nav.find((item) => item.id === location)?.id ?? "dashboard");
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = preferences.theme;
  }, [preferences.theme]);
  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(undefined), toast.error ? 7500 : 4500);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  function go(next: Page) {
    setPage(next);
    if (window.location.hash !== `#${next}`) window.location.hash = next;
    window.scrollTo(0, 0);
  }

  const close = () => setDialog(undefined);
  const openImport = () => setDialog({ type: "import" });
  const openAdd = () => setDialog({ type: "add" });
  const openGame = (game: Game) => setDialog({ type: "game", id: game.id });
  const report = (error: unknown) => setToast({ error: true, text: error instanceof Error ? error.message : "Something went wrong. Try again." });

  async function addGames(incoming: Game[]) {
    let summary = { added: 0, duplicates: 0 };
    await update((current) => {
      const merged = mergeGames(current.demo ? [] : current.games, incoming);
      summary = { added: merged.added, duplicates: merged.duplicates };
      return { ...current, demo: false, games: merged.games, history: current.demo ? [] : current.history,
        cycles: current.demo ? {} : current.cycles,
        preferences: current.demo ? { ...current.preferences, filters: emptyFilters } : current.preferences };
    });
    return summary;
  }

  async function setPreferences(change: Partial<LibraryState["preferences"]>) {
    setSaving(true);
    try {
      await update((current) => ({ ...current, preferences: { ...current.preferences, ...change } }));
      if ("filters" in change) setResultId(undefined);
    } catch (error) { report(error); } finally { setSaving(false); }
  }

  async function roll() {
    if (rollLock.current || !ready) return;
    rollLock.current = true;
    setRolling(true);
    try {
      if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        await new Promise<void>((resolve) => window.setTimeout(resolve, 650));
      }
      let pickedId: string | undefined;
      await update((current) => {
        const { filters, noRepeats } = current.preferences;
        const pick = pickGame(eligibleGames(current.games, filters), filters, noRepeats, current.cycles);
        if (!pick) throw new Error("No eligible games. Add games or adjust your filters.");
        const { game, cycles } = pick;
        pickedId = game.id;
        const record = { id: crypto.randomUUID(), gameId: game.id, title: game.title, platform: game.platform, pickedAt: Date.now() };
        return { ...current, cycles, history: [record, ...current.history].slice(0, 250) };
      });
      setResultId(pickedId);
    } catch (error) { report(error); } finally {
      setRolling(false);
      rollLock.current = false;
    }
  }

  async function removeDemo() {
    setSaving(true);
    try {
      await update((current) => current.demo ? { ...current, demo: false, games: [], history: [], cycles: {},
        preferences: { ...current.preferences, filters: emptyFilters } } : current);
      setToast({ text: "Demo library cleared." });
    } catch (error) { report(error); } finally { setSaving(false); }
  }

  const toggleTheme = () => { void setPreferences({ theme: preferences.theme === "dark" ? "light" : "dark" }); };
  const picker = <PickerHero rolling={rolling} result={result} count={poolSize} ready={ready && !saving}
    onRoll={() => { void roll(); }} onOptions={page === "dashboard" ? () => go("picker") : undefined} onDetails={openGame} />;

  return <div className="app-shell">
    <a className="skip" href="#main-content">Skip to content</a>
    <aside className="sidebar">
      <a className="brand" href="#dashboard" aria-label="What to Play? Home" onClick={(event) => { event.preventDefault(); go("dashboard"); }}>
        <span className="brand-icon"><Dice5 size={23} strokeWidth={2.5} /></span>
        <span>What to Play<span className="brand-question">?</span><small>GAME LIBRARY</small></span>
      </a>
      <nav className="navigation" aria-label="Main navigation">
        <span className="nav-label">WORKSPACE</span>
        {nav.map(({ id, label, icon: Icon }) => <a key={id} href={`#${id}`} aria-current={page === id ? "page" : undefined} onClick={(event) => { event.preventDefault(); go(id); }}>
          <Icon size={18} strokeWidth={1.85} /><span>{label}</span>
        </a>)}
      </nav>
      <div className="sidebar-footer"><ShieldCheck size={18} /><div><strong>Local storage</strong><small>Saved on this browser</small></div><span className="online-dot" /></div>
    </aside>
    <div className="workspace">
      <header className="topbar">
        <div className="breadcrumb"><span>Workspace</span><ChevronRight size={14} /><strong>{current.label}</strong></div>
        <div className="top-actions">
          {page === "dashboard" && <Button className="quick-add" variant="ghost" size="icon" aria-label="Add a game" disabled={!ready} onClick={openAdd}><Plus size={20} /></Button>}
          <Button variant="ghost" size="icon" aria-label={`Switch to ${preferences.theme === "dark" ? "light" : "dark"} mode`} disabled={!ready || saving} onClick={toggleTheme}>
            {preferences.theme === "dark" ? <Sun size={19} /> : <Moon size={18} />}
          </Button>
          <Button disabled={!ready} onClick={openImport}><Upload size={17} /> <span>Import Library</span></Button>
        </div>
      </header>
      <main id="main-content" className="main-content" tabIndex={-1}>
        <div className="page-heading"><h1>{current.label}</h1><p className="muted">{current.description}</p></div>
        {error ? <div className="empty-panel" role="alert"><CircleAlert size={29} /><h2>Library unavailable</h2><p>{error}</p><Button variant="secondary" onClick={() => { void refresh(); }}>Try again</Button></div> :
          !ready ? <div className="empty-panel loading-panel" role="status"><LoaderCircle className="animate-spin" size={28} /><p>Opening your library…</p></div> : <>
            {page === "dashboard" && <>
              {picker}
              <section className="stats" aria-label="Collection statistics">
                {statsFor(games).map(({ title, count, icon: Icon, color }) => <div key={title} className="stat-card">
                  <span className="stat-icon" data-color={color}><Icon size={20} strokeWidth={1.9} /></span><div><p>{title}</p><strong>{count.toLocaleString()}</strong></div>
                </div>)}
              </section>
            </>}
            {(page === "dashboard" || page === "library") && <LibraryView key={page} games={games} demo={demo} dashboard={page === "dashboard"}
              onGame={openGame} onAdd={openAdd} onImport={openImport} onViewAll={() => go("library")} />}
            {page === "picker" && <>{picker}
              <PickerOptions games={games} filters={preferences.filters} noRepeats={preferences.noRepeats} count={poolSize} disabled={rolling || saving}
                onFilters={(filters: GameFilters) => { void setPreferences({ filters }); }} onNoRepeats={(noRepeats) => { void setPreferences({ noRepeats }); }} />
              <Button className="mt-5" variant="secondary" onClick={() => go("history")}>View pick history <ArrowRight size={16} /></Button>
            </>}
            {page === "history" && <PickHistory history={history} games={games} onGame={openGame} onPicker={() => go("picker")} />}
            {page === "settings" && <section className="settings-panel">
              <h2>Appearance</h2><div className="switch-row"><div><label htmlFor="dark-mode">Dark mode</label><p className="muted">Choose a light or dark interface.</p></div>
                <Switch id="dark-mode" checked={preferences.theme === "dark"} disabled={saving} onCheckedChange={toggleTheme} /></div>
              <h2>Library storage</h2><p className="muted">Your collection, preferences, and history are stored on this browser.</p>
              {demo && <div className="switch-row"><div><strong>Demo library</strong><p className="muted">Clear the sample games and start with an empty library.</p></div>
                <Button variant="secondary" disabled={saving} onClick={() => { void removeDemo(); }}>Clear demo</Button></div>}
            </section>}
          </>}
      </main>
    </div>
    {dialog?.type === "import" && <ImportDialog onClose={close} onImport={addGames} />}
    {dialog?.type === "add" && <AddDialog onClose={close} onSave={async (incoming) => {
      const summary = await addGames(incoming);
      setToast({ text: summary.added ? "Game added to your library." : "This game is already in your library." });
      return summary;
    }} />}
    {selectedGame && <GameDialog key={selectedGame.id} game={selectedGame} onClose={close}
      onUpdate={async (change) => {
        await update((current) => {
          if (!current.games.some((game) => game.id === selectedGame.id)) throw new Error("This game is no longer in your library.");
          return { ...current, games: current.games.map((game) => game.id === selectedGame.id ? { ...game, ...change } : game) };
        });
        setToast({ text: "Game updated." });
      }}
      onRemove={async () => {
        await update((current) => ({ ...current, games: current.games.filter((game) => game.id !== selectedGame.id) }));
        close();
        setToast({ text: "Game removed from your library." });
      }} />}
    {toast && <div className={`toast ${toast.error ? "notice-error" : ""}`} role={toast.error ? "alert" : "status"}>
      {toast.error ? <CircleAlert size={18} /> : <CheckCircle2 size={18} />}<p>{toast.text}</p>
      <Button variant="ghost" size="icon" aria-label="Dismiss message" onClick={() => setToast(undefined)}><X size={17} /></Button>
    </div>}
  </div>;
}
