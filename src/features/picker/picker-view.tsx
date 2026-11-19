"use client";

import { ArrowUpRight, Clock3, Dice5, History, Layers3, RotateCcw, Shuffle, SlidersHorizontal, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Cover, FilterFields, PlatformMark } from "../library/library-view";
import { listGenres, type Game, type GameFilters } from "../library/games";
import type { PickRecord } from "./pick";

export function PickerHero({ rolling, result, count, ready, onRoll, onOptions, onDetails }: {
  rolling: boolean; result?: Game; count: number; ready: boolean; onRoll: () => void;
  onOptions?: () => void; onDetails: (game: Game) => void;
}) {
  return <section className={`picker-hero ${rolling ? "is-rolling" : ""} ${result ? "has-result" : ""}`} aria-labelledby="picker-title">
    <div className="hero-art" aria-hidden="true" />
    {result && !rolling && <div className="hero-result"><Cover game={result} /></div>}
    <div className="hero-content">
      <span className="hero-label"><Sparkles size={14} /> {result && !rolling ? "YOUR RANDOM PICK" : "RANDOM GAME PICKER"}</span>
      <div aria-live="polite">
        <h2 id="picker-title">{rolling ? "Rolling the dice…" : result ? result.title : <>What should you<br />play next?</>}</h2>
        <p>{rolling ? "Choosing from your eligible games." : result ?
          <><PlatformMark platform={result.platform} /> {result.platform}{result.genres.length > 0 && ` · ${result.genres.join(" · ")}`}</> :
          "Can’t decide? Roll the dice and let your library surprise you."}</p>
      </div>
      <div className="hero-actions">
        <Button size="lg" disabled={rolling || count === 0 || !ready} onClick={onRoll}>
          {result && !rolling ? <RotateCcw size={19} /> : <Dice5 size={20} />}{rolling ? "Rolling…" : result ? "Reroll" : "Roll the dice"}
        </Button>
        {result && !rolling ? <Button size="lg" variant="secondary" onClick={() => onDetails(result)}>Game details <ArrowUpRight size={17} /></Button> :
          onOptions && <Button size="lg" variant="secondary" onClick={onOptions}><SlidersHorizontal size={17} /> Picker filters</Button>}
      </div>
      {ready && count === 0 && <span className="hero-empty">No eligible games. Add games or adjust your filters.</span>}
    </div>
  </section>;
}

export function PickerOptions({ games, filters, noRepeats, count, disabled, onFilters, onNoRepeats }: {
  games: Game[]; filters: GameFilters; noRepeats: boolean; count: number; disabled: boolean;
  onFilters: (filters: GameFilters) => void; onNoRepeats: (enabled: boolean) => void;
}) {
  return <section className="picker-options">
    <div className="section-heading">
      <div><h2>Picker filters</h2><p className="muted">Choose which games can enter the draw.</p></div>
      <span className="count-label"><Layers3 size={15} />{count} eligible</span>
    </div>
    <fieldset className="form-stack" disabled={disabled}>
      <legend className="sr-only">Eligible games</legend>
      <div className="picker-filters"><FilterFields filters={filters} genres={listGenres(games)} onChange={onFilters} /></div>
      <div className="switch-row"><div><label htmlFor="no-repeat">No repeats</label><p className="muted">Pick every eligible game once before starting a new round.</p></div>
        <Switch id="no-repeat" checked={noRepeats} onCheckedChange={onNoRepeats} />
      </div>
    </fieldset>
  </section>;
}

export function PickHistory({ history, games, onGame, onPicker }: {
  history: PickRecord[]; games: Game[]; onGame: (game: Game) => void; onPicker: () => void;
}) {
  const gameById = new Map(games.map((game) => [game.id, game]));
  if (!history.length) return <div className="empty-panel"><History size={30} /><h3>No picks yet</h3>
    <p className="muted">Games you roll will appear here.</p><Button variant="secondary" onClick={onPicker}><Shuffle size={16} /> Open picker</Button>
  </div>;
  return <ol className="history-list">
    {history.map((pick) => {
      const game = gameById.get(pick.gameId);
      return <li key={pick.id} className="history-row">
        {game ? <Cover game={game} /> : <div className="history-placeholder"><Clock3 size={21} /></div>}
        <div className="history-title"><strong>{pick.title}</strong><span className="muted">{pick.platform}</span></div>
        <time className="muted" dateTime={new Date(pick.pickedAt).toISOString()}>{new Date(pick.pickedAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}</time>
        {game && <Button size="icon" variant="ghost" aria-label={`Open ${game.title}`} onClick={() => onGame(game)}><ArrowUpRight size={18} /></Button>}
      </li>;
    })}
  </ol>;
}
