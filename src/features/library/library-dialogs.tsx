"use client";

import { useEffect, useState, type FormEvent } from "react";
import { CheckCircle2, Download, ExternalLink, FileSpreadsheet, LoaderCircle, Plus, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Cover, PlatformMark, SelectField, StatusBadge } from "./library-view";
import { normalizeGame, platforms, statuses, type Game } from "./games";
import { csvTemplate, maxCsvSize, parseLibraryCsv } from "./import";

type ImportResult = { added: number; duplicates: number };
type ImportGames = (games: Game[]) => Promise<ImportResult>;
const errorMessage = (error: unknown) => error instanceof Error ? error.message : "Something went wrong. Try again.";

export function ImportDialog({ onClose, onImport }: { onClose: () => void; onImport: ImportGames }) {
  const [source, setSource] = useState<"csv" | "steam">("csv");
  const [steam, setSteam] = useState<"checking" | "enabled" | "disabled" | "error">("checking");
  const [steamId, setSteamId] = useState("");
  const [file, setFile] = useState<File>();
  const [platform, setPlatform] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<(ImportResult & { issues: string[]; skipped: number })>();

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/steam", { signal: controller.signal })
      .then((response) => { if (!response.ok) throw new Error(); return response.json(); })
      .then((body) => setSteam(body.enabled ? "enabled" : "disabled"))
      .catch(() => { if (!controller.signal.aborted) setSteam("error"); });
    return () => controller.abort();
  }, []);

  function changeSource(next: typeof source) {
    setSource(next); setError(""); setResult(undefined);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(""); setResult(undefined); setBusy(true);
    try {
      let games: Game[];
      let issues: string[] = [];
      let skipped = 0;
      if (source === "csv") {
        if (!file) throw new Error("Choose a CSV file first.");
        if (file.size > maxCsvSize) throw new Error("The CSV must be 5 MB or smaller.");
        ({ games, issues } = parseLibraryCsv(await file.text(), platform || undefined));
        skipped = issues.length;
      } else {
        const response = await fetch("/api/steam", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ steamId: steamId.trim() }),
        });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "Steam import failed.");
        games = body.games;
        skipped = body.skipped;
      }
      const summary = games.length ? await onImport(games) : { added: 0, duplicates: 0 };
      setResult({ ...summary, issues, skipped });
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return <Modal title="Import library" description="Bring your Steam or Epic Games collection into What to Play?" onClose={() => { if (!busy) onClose(); }}>
    <div className="tab-bar" aria-label="Import source">
      <Button variant={source === "csv" ? "secondary" : "ghost"} aria-pressed={source === "csv"} disabled={busy} onClick={() => changeSource("csv")}><FileSpreadsheet size={16} />CSV file</Button>
      <Button variant={source === "steam" ? "secondary" : "ghost"} aria-pressed={source === "steam"} disabled={busy} onClick={() => changeSource("steam")}><PlatformMark platform="Steam" />Steam API</Button>
    </div>
    <form className="form-stack" onSubmit={submit}>
      {source === "csv" ? <>
        <label className="upload-zone">
          <Upload size={23} /><strong>{file ? file.name : "Choose a CSV file"}</strong>
          <span className="muted">Up to 5 MB · Steam and Epic Games</span>
          <input type="file" accept=".csv,text/csv" aria-label="Choose a CSV file" disabled={busy} onChange={(event) => { setFile(event.target.files?.[0]); setResult(undefined); setError(""); }} />
        </label>
        <div className="form-group">
          <span className="field-label">Default platform</span>
          <SelectField label="Default platform" value={platform} onChange={setPlatform}>
            <option value="">Read from CSV</option>{platforms.map((item) => <option key={item}>{item}</option>)}
          </SelectField>
          <small className="muted">Select a fallback if your CSV is missing platform values.</small>
        </div>
        <a className="text-link" download="what-to-play-template.csv" href={`data:text/csv;charset=utf-8,${encodeURIComponent(csvTemplate)}`}><Download size={15} /> Download CSV template</a>
      </> : steam === "enabled" ?
        <label className="form-group"><span className="field-label">SteamID64</span>
          <input className="field" required inputMode="numeric" pattern="7656[0-9]{13}" maxLength={17} value={steamId} onChange={(event) => setSteamId(event.target.value)} placeholder="7656…" />
          <small className="muted">Use the account configured on this server and set Steam Game Details to public.</small>
        </label> : <p role={steam === "error" ? "alert" : "status"} className="notice">
          {steam === "checking" ? "Checking Steam availability…" : steam === "error" ? "Steam availability could not be checked. Reopen the dialog or import a CSV." : "Steam API import requires a server key and SteamID64. CSV import is available for both platforms."}
        </p>}
      {error && <p className="notice notice-error" role="alert">{error}</p>}
      {result && <div className={`notice ${result.added || result.duplicates ? "notice-success" : ""}`} role="status">
        <div className="flex items-center gap-2">{(result.added > 0 || result.duplicates > 0) && <CheckCircle2 size={16} />}
          {result.added} added · {result.duplicates} duplicates matched · {result.skipped} skipped
        </div>
        {result.issues.length > 0 && <details><summary>View CSV issues</summary><ul>{result.issues.slice(0, 30).map((issue) => <li key={issue}>{issue}</li>)}</ul>
          {result.issues.length > 30 && <p>Showing 30 of {result.issues.length} issues.</p>}
        </details>}
      </div>}
      <div className="modal-actions">
        <Button type="button" variant="secondary" disabled={busy} onClick={onClose}>{result ? "Done" : "Cancel"}</Button>
        <Button type="submit" disabled={busy || (source === "csv" ? !file : steam !== "enabled")}>
          {busy ? <LoaderCircle className="animate-spin" size={16} /> : <Upload size={16} />}{busy ? "Importing…" : "Import games"}
        </Button>
      </div>
    </form>
  </Modal>;
}

export function AddDialog({ onClose, onSave }: { onClose: () => void; onSave: ImportGames }) {
  const [platform, setPlatform] = useState<Game["platform"]>("Steam");
  const [status, setStatus] = useState<Game["status"]>("Not Played");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(""); setBusy(true);
    const data = new FormData(event.currentTarget);
    const read = (name: string) => String(data.get(name) ?? "");
    try {
      const game = normalizeGame({
        title: read("title"), platform, status, genres: read("genres"), externalId: read("id"),
        coverUrl: read("cover"), storeUrl: read("store"),
      });
      await onSave([game]);
      onClose();
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  return <Modal title="Add a game" description="Add a Steam or Epic Games title to your collection." onClose={() => { if (!busy) onClose(); }}>
    <form className="form-stack" onSubmit={submit}>
      <label className="form-group"><span className="field-label">Game title</span><input className="field" name="title" required maxLength={200} placeholder="e.g. Celeste" /></label>
      <div className="form-columns">
        <div className="form-group"><span className="field-label">Platform</span><SelectField label="Platform" value={platform} onChange={(value) => setPlatform(value as Game["platform"])}>{platforms.map((item) => <option key={item}>{item}</option>)}</SelectField></div>
        <div className="form-group"><span className="field-label">Status</span><SelectField label="Status" value={status} onChange={(value) => setStatus(value as Game["status"])}>{statuses.map((item) => <option key={item}>{item}</option>)}</SelectField></div>
      </div>
      <label className="form-group"><span className="field-label">Genres <small className="muted">optional</small></span><input className="field" name="genres" maxLength={1200} placeholder="Platformer, Indie" /></label>
      <label className="form-group"><span className="field-label">{platform === "Steam" ? "Steam App ID" : "Epic catalog ID"} <small className="muted">optional</small></span><input className="field" name="id" maxLength={128} /></label>
      <label className="form-group"><span className="field-label">Store link <small className="muted">optional</small></span><input className="field" name="store" type="url" maxLength={2048} placeholder="https://" /></label>
      <label className="form-group"><span className="field-label">Cover link <small className="muted">optional</small></span><input className="field" name="cover" type="url" maxLength={2048} placeholder="https://" /></label>
      {error && <p className="notice notice-error" role="alert">{error}</p>}
      <div className="modal-actions"><Button type="button" variant="secondary" disabled={busy} onClick={onClose}>Cancel</Button>
        <Button disabled={busy} type="submit">{busy ? <LoaderCircle className="animate-spin" size={16} /> : <Plus size={16} />}Add game</Button></div>
    </form>
  </Modal>;
}

export function GameDialog({ game, onClose, onUpdate, onRemove }: {
  game: Game; onClose: () => void; onUpdate: (change: Partial<Pick<Game, "status" | "excluded">>) => Promise<void>;
  onRemove: () => Promise<void>;
}) {
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function perform(action: () => Promise<void>) {
    setBusy(true); setError("");
    try { await action(); } catch (error) { setError(errorMessage(error)); } finally { setBusy(false); }
  }

  return <Modal title={game.title} description="Game details and picker settings." onClose={() => { if (!busy) onClose(); }}>
    <Cover game={game} className="detail-cover" />
    <div className="detail-meta">
      <span className="flex items-center gap-1.5"><PlatformMark platform={game.platform} />{game.platform}</span>
      <span>{game.genres.join(" · ") || "Genre unlisted"}</span>
      {game.playtime !== undefined && <span>{(game.playtime / 60).toLocaleString(undefined, { maximumFractionDigits: 1 })} hrs played</span>}
      <StatusBadge status={game.status} />
    </div>
    <div className="form-stack">
      <label className="form-group"><span className="field-label">Play status</span>
        <select aria-label="Play status" className="field" value={game.status} disabled={busy} onChange={(event) => {
          const status = event.target.value as Game["status"];
          void perform(() => onUpdate({ status }));
        }}>{statuses.map((item) => <option key={item}>{item}</option>)}</select>
      </label>
      <div className="switch-row"><div><label htmlFor="exclude-game">Exclude from random picks</label><p className="muted">Keep the game in your library.</p></div>
        <Switch id="exclude-game" checked={game.excluded} disabled={busy} onCheckedChange={(excluded) => { void perform(() => onUpdate({ excluded })); }} />
      </div>
      {error && <p className="notice notice-error" role="alert">{error}</p>}
      {confirm && <p className="notice">Remove this game from your library?</p>}
      <div className="modal-actions detail-actions">
        {confirm ? <><Button variant="secondary" disabled={busy} onClick={() => setConfirm(false)}>Cancel</Button><Button variant="danger" disabled={busy} onClick={() => { void perform(onRemove); }}>Remove game</Button></> :
          <><Button variant="danger" disabled={busy} onClick={() => setConfirm(true)}><Trash2 size={16} /> Remove</Button>
          {game.storeUrl && <Button asChild variant="secondary"><a href={game.storeUrl} target="_blank" rel="noreferrer">Open store <ExternalLink size={15} /></a></Button>}</>}
      </div>
    </div>
  </Modal>;
}
