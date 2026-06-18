# Chart Video Generation

How "Top-N most played tracks" chart videos for YouTube are produced from real
play data on qirim.online. Output: one horizontal 1920×1080 MP4 per period, with
a pulsing QO logo as the background and an on-screen tracklist that highlights the
currently playing track (▶).

```
play_history (SQLite)  →  ranked tracklist  →  local audio files  →  bass-pulse video  →  YouTube metadata
   (SQL query)             (rank, plays)        (tmp_charts/…)         (pulse + tracklist)    (youtube.txt)
```

The rendering tool is **bass-pulse**, kept as a separate self-contained project at
`/Users/servin/1_dev/my/tools/bass-pulse` (its own README documents the tool itself).
Everything chart-specific (data export, folder layout, YouTube metadata) lives in
this repo under `scripts/` and `tmp_charts/`.

---

## 1. Get the ranking from play_history

Play counts come from the `play_history` table on the prod DB. Example queries
(run against the server SQLite, or an export of it):

```sql
-- Top 10 for a calendar year
SELECT mf.title, mf.artist, COUNT(*) AS plays
FROM play_history ph
JOIN media_file mf ON mf.id = ph.media_file_id
WHERE ph.date >= '2025-01-01' AND ph.date < '2026-01-01'
GROUP BY ph.media_file_id
ORDER BY plays DESC
LIMIT 10;

-- Top 10 for a single month
SELECT mf.title, mf.artist, COUNT(*) AS plays
FROM play_history ph
JOIN media_file mf ON mf.id = ph.media_file_id
WHERE ph.date >= '2026-01-01' AND ph.date < '2026-02-01'
GROUP BY ph.media_file_id
ORDER BY plays DESC
LIMIT 10;
```

The resulting `(rank, plays, title, artist)` rows are pasted into the export
script (below) as `YEAR_2025` / `MONTHS_2026`.

---

## 2. Export the audio files locally

`scripts/export-chart-tracks-local.py` matches each ranked track to a local file
under the music library and copies it into `tmp_charts/`.

- **Library root:** `/Volumes/T9/Media/Music/Музыка/QirimTatar`
- **Matching:** scoped by artist folder + fuzzy filename match (HTML entities
  decoded, diacritics folded via `unicodedata` NFKD, punctuation/case ignored).
  Distinctive title tokens (minus artist tokens) are weighted, so short titles
  like "TEMEL" / "Adam Ol" match the right file. Each row prints a confidence
  score — eyeball low scores.
- **Naming:** files are copied as `NN_Pp_<title>.mp3` where `NN` = rank,
  `P` = play count (e.g. `03_20p_Seyran 7'62 - AREKET YAP.mp3`). The
  `NN_Pp_` prefix is what fixes the on-screen order and is stripped from the
  displayed name by bass-pulse.

```bash
python3 scripts/export-chart-tracks-local.py
```

### Folder layout (`tmp_charts/`)

```
tmp_charts/
  2025/
    01_28p_….mp3 … 20_9p_….mp3      # 20 tracks, ranked
    2025_top20.mp4                   # rendered video (lives in its folder)
    youtube.txt                      # title / description / chapters / hashtags
  2026/
    2026-01/
      01_…p_….mp3 … 10_…p_….mp3      # 10 tracks
      2026-01.mp4
      youtube.txt
    2026-02/ … 2026-06/
```

---

## 3. Render the video with bass-pulse

bass-pulse builds the clip in **one command** — just point it at the period folder.
It picks the bundled `horisontal.png` logo, concatenates the tracks itself (in rank
order, dropping embedded cover art with `-vn`), and writes `<folder>/<folder>.mp4`:

```bash
cd /Users/servin/1_dev/my/tools/bass-pulse
./bass-pulse "/Users/servin/1_dev/my/qo/navidrome/tmp_charts/2026/2026-01"
# → …/2026-01/2026-01.mp4
```

Equivalent explicit form (to override logo / output name / accent color):

```bash
./bass-pulse -h \
  --tracklist "/Users/servin/1_dev/my/qo/navidrome/tmp_charts/2026/2026-01" \
  --logo horisontal.png \
  --out "/Users/servin/1_dev/my/qo/navidrome/tmp_charts/2026/2026-01/2026-01.mp4"
```

What the chart mode (`--tracklist`) does:

- **Main video = full-frame centered pulsing logo** (same as normal bass-pulse).
  The tracklist is drawn **on top** as a transparent overlay — it never shifts or
  shrinks the logo into a corner.
- **Tracklist overlay:** numbered list on the left, auto-scrolls to keep the active
  track centered, active row gets a `▶` accent marker + bold white text, others are
  light gray. Each line has a drop shadow so it stays readable over the logo.
- **Order & timing:** taken from the sorted files in `--tracklist` (hence the
  `NN_…` prefix). Highlight switches when playback crosses each track's cumulative
  start time.
- `--audio` is optional here; pass it only to supply a pre-built concatenation.
- Useful flags: `-h` horizontal (YouTube), `--accent ff5a5f` to recolor `▶`,
  `--seconds 30` to render a quick preview, `--intensity` for pulse strength.

> First run of `./bass-pulse` bootstraps its own local `.venv` (librosa, numpy,
> Pillow) — no system Python packages needed. Must be invoked as `./bass-pulse`
> from its directory, or symlinked onto PATH.

For batch rendering all six 2026 months, `scripts/render-2026-charts.sh` loops over
the month folders. (The manual ffmpeg concat it used to do is now built into
bass-pulse, so that step is redundant.)

---

## 4. YouTube metadata

`scripts/make-youtube-meta.py` moves each rendered `.mp4` into its period folder
and writes `youtube.txt` containing:

- Title (e.g. "Qirim.Online — Топ-10 крымскотатарской музыки · Январь 2026 🎵")
- Description + link to https://qirim.online
- **Timestamped tracklist** that doubles as YouTube chapters (first entry must be
  `0:00`); timestamps are computed from each file's real duration via `ffprobe`.
- Hashtags (multilingual: QirimOnline, CrimeanTatar, etc.).

```bash
python3 scripts/make-youtube-meta.py
```

---

## Replacing a track

If a track shouldn't be in the chart (e.g. wrong-language or low-quality file),
delete its `NN_Pp_….mp3` from the period folder, drop in a replacement named with
the same `NN_Pp_` rank prefix, then re-run steps 3–4 for that folder. The order and
timing follow the filenames, so keeping the prefix consistent is all that matters.

---

## Files

| Path | Role |
|---|---|
| `scripts/export-chart-tracks-local.py` | fuzzy-match ranked tracks → copy into `tmp_charts/` |
| `scripts/render-2026-charts.sh` | batch render the 2026 month videos |
| `scripts/make-youtube-meta.py` | move videos into folders + write `youtube.txt` |
| `tmp_charts/` | working dir: per-period audio, videos, metadata |
| `/Users/servin/1_dev/my/tools/bass-pulse` | the renderer (separate project; see its README) |
