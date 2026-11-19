"use client";

import { useState } from "react";
import { ArrowDownWideNarrow, ArrowRight, Ban, ChevronDown, Gamepad2, LibraryBig, Plus, Search, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { emptyFilters, filterGames, listGenres, platforms, sortGames, statuses, type Game, type GameFilters, type Sort } from "./games";

export function Cover({ game, className = "" }: { game: Game; className?: string }) {
  const [failed, setFailed] = useState<string>();
  return <div className={`cover ${className}`} data-platform={game.platform}>
    <Gamepad2 size={32} strokeWidth={1.4} aria-hidden="true" />
    {game.coverUrl && failed !== game.coverUrl &&
      // External CSV covers are user-provided and can use any HTTPS image host.
      // eslint-disable-next-line @next/next/no-img-element
      <img src={game.coverUrl} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(game.coverUrl)} />}
  </div>;
}

export function StatusBadge({ status }: { status: Game["status"] }) {
  return <span className="status" data-status={status}><i />{status}</span>;
}

export function PlatformMark({ platform }: { platform: Game["platform"] }) {
  if (platform === "Steam") {
    return <svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13" aria-hidden="true">
      <path d="M12 0C5.65 0 .45 4.95 0 11.2l6.45 2.67a3.4 3.4 0 0 1 1.95-.61l2.87-4.16v-.06a4.49 4.49 0 1 1 4.49 4.49h-.1l-4.1 2.93a3.4 3.4 0 0 1-6.72.91l-4.6-1.9A12 12 0 1 0 12 0Zm-4.45 18.05-1.48-.61a2.55 2.55 0 1 0 3.34-3.36 2.51 2.51 0 0 0-1.87-.02l1.52.63a1.82 1.82 0 1 1-1.51 3.36Zm8.2-6.03a2.98 2.98 0 1 0 0-5.96 2.98 2.98 0 0 0 0 5.96Zm0-.75a2.24 2.24 0 1 1 0-4.48 2.24 2.24 0 0 1 0 4.48Z" />
    </svg>;
  }
  return <span className="epic-mark" aria-hidden="true">E</span>;
}

export function FilterFields({ filters, genres, onChange }: {
  filters: GameFilters; genres: string[]; onChange: (filters: GameFilters) => void;
}) {
  const fields = [
    { key: "platform", label: "All platforms", items: platforms },
    { key: "genre", label: "All genres", items: genres },
    { key: "status", label: "All statuses", items: statuses },
  ] as const;
  return <>{fields.map(({ key, label, items }) =>
    <SelectField key={key} label={key === "status" ? "Play status" : key} value={filters[key]} onChange={(value) => onChange({ ...filters, [key]: value })}>
      <option value="">{label}</option>
      {filters[key] && !items.some((item) => item.toLowerCase() === filters[key].toLowerCase()) && <option>{filters[key]}</option>}
      {items.map((item) => <option key={item} value={key === "genre" ? item.toLowerCase() : item}>{item}</option>)}
    </SelectField>
  )}</>;
}

export function SelectField({ label, value, onChange, children, sort = false }: {
  label: string; value: string; onChange: (value: string) => void; children: React.ReactNode; sort?: boolean;
}) {
  return <div className={`select-wrap ${sort ? "sort-select" : ""}`}>
    {sort && <ArrowDownWideNarrow className="sort-icon" size={15} />}
    <select aria-label={label} value={value} onChange={(event) => onChange(event.target.value)}>{children}</select>
    <ChevronDown className="select-arrow" size={14} />
  </div>;
}

export function GameGrid({ games, onGame }: { games: Game[]; onGame: (game: Game) => void }) {
  return <div className="game-grid">{games.map((game) =>
    <button type="button" className="game-card" key={game.id} onClick={() => onGame(game)}>
      <div className="game-art">
        <Cover game={game} />
        <span className="platform-badge"><PlatformMark platform={game.platform} />{game.platform}</span>
        {game.excluded && <span className="excluded-badge" title="Excluded from picker"><Ban size={14} /><span className="sr-only">Excluded</span></span>}
      </div>
      <div className="game-info">
        <h3>{game.title}</h3>
        <p className="muted">{game.genres.join(" · ") || "Genre unlisted"}</p>
        <StatusBadge status={game.status} />
      </div>
    </button>
  )}</div>;
}

export function EmptyLibrary({ onImport }: { onImport: () => void }) {
  return <div className="empty-panel"><LibraryBig size={28} /><h3>Your library is empty</h3>
    <p className="muted">Import a collection or add a game to get started.</p>
    <Button variant="secondary" onClick={onImport}><Upload size={16} />Import Library</Button>
  </div>;
}

export function LibraryView({ games, demo, dashboard, onGame, onAdd, onImport, onViewAll }: {
  games: Game[]; demo: boolean; dashboard: boolean; onGame: (game: Game) => void;
  onAdd: () => void; onImport: () => void; onViewAll: () => void;
}) {
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState(emptyFilters);
  const [sort, setSort] = useState<Sort>("recent");
  const [shown, setShown] = useState(24);
  const visible = sortGames(filterGames(games, filters, search), sort);
  const limit = dashboard ? 4 : shown;
  return <section className="library-section" aria-labelledby="library-heading">
    <div className="section-heading">
      <div>
        <div className="flex flex-wrap items-center gap-2.5">
          <h2 id="library-heading">{dashboard ? "Game library" : "Your collection"}</h2>
          {demo && <span className="demo-label">Demo library</span>}
        </div>
        <p className="muted">{dashboard ? "Browse the games in your collection." : `${games.length} ${games.length === 1 ? "game" : "games"} in your library`}</p>
      </div>
      <Button variant="secondary" onClick={dashboard ? onViewAll : onAdd}>
        {dashboard ? <>View library <ArrowRight size={16} /></> : <><Plus size={17} />Add Game</>}
      </Button>
    </div>
    {games.length > 0 && <div className="filter-bar">
      <label className="search-field">
        <Search size={17} /><span className="sr-only">Search games</span>
        <input placeholder="Search games..." value={search} onChange={(event) => { setSearch(event.target.value); setShown(24); }} />
      </label>
      <div className="filter-group">
        <FilterFields filters={filters} genres={listGenres(games)} onChange={(next) => { setFilters(next); setShown(24); }} />
        <SelectField sort label="Sort games" value={sort} onChange={(value) => { setSort(value as Sort); setShown(24); }}>
          <option value="recent">Recently added</option><option value="title">Title A–Z</option><option value="playtime">Most played</option>
        </SelectField>
      </div>
    </div>}
    {visible.length ? <GameGrid games={visible.slice(0, limit)} onGame={onGame} /> : games.length ?
      <div className="empty-panel"><Search size={27} /><h3>No games match</h3><p className="muted">Try another search or change your filters.</p>
        <Button variant="secondary" onClick={() => { setSearch(""); setFilters(emptyFilters); }}>Clear filters</Button></div> :
      <EmptyLibrary onImport={onImport} />}
    {!dashboard && visible.length > shown && <Button className="mt-5" variant="secondary" onClick={() => setShown(shown + 24)}>Show more games</Button>}
  </section>;
}
