#!/usr/bin/env bash
#
# Export top chart tracks (audio files) into folders by year/month, ready for
# video assembly. Reads play_history from the live Navidrome SQLite DB (read-only)
# and copies the matching audio files from the music library.
#
# Run this ON THE SERVER (it needs sqlite3 + access to the music files).
#
# Layout produced (under $OUT):
#   2025/NN_<plays>p_<original filename>
#   2026/2026-01/NN_<plays>p_<original filename>
#   2026/2026-02/...
#
# Usage:
#   ./export-chart-tracks.sh [OUTPUT_DIR]
# Defaults to ./charts_export
set -euo pipefail

# --- config (adjust if paths differ) ---------------------------------------
DB="/opt/navidrome/data/navidrome.db"      # SQLite database
MUSIC_HOST="/opt/navidrome/music"          # host path of the music library
MUSIC_PREFIX="/music"                      # path prefix stored in the DB (container path)
OUT="${1:-./charts_export}"                # output root
YEAR_TOP=20                                # how many tracks for the year chart
MONTH_TOP=10                               # how many tracks per month
# ----------------------------------------------------------------------------

command -v sqlite3 >/dev/null || { echo "ERROR: sqlite3 not found on host"; exit 1; }
[ -f "$DB" ] || { echo "ERROR: DB not found: $DB"; exit 1; }
[ -d "$MUSIC_HOST" ] || { echo "ERROR: music dir not found: $MUSIC_HOST"; exit 1; }

DBRO="file:${DB}?mode=ro"
copied=0; missing=0

# copy_one <dest_dir> <rank> <plays> <container_path>
copy_one() {
  local destdir="$1" rank="$2" plays="$3" cpath="$4"
  local rel="${cpath#$MUSIC_PREFIX}"            # strip /music prefix
  local src="${MUSIC_HOST}${rel}"
  if [ ! -f "$src" ]; then
    printf '  !! MISSING: %s\n' "$src" >&2
    missing=$((missing+1))
    return
  fi
  mkdir -p "$destdir"
  local base; base="$(basename "$src")"
  local dest; dest="$(printf '%s/%02d_%sp_%s' "$destdir" "$rank" "$plays" "$base")"
  cp -n "$src" "$dest"
  copied=$((copied+1))
  printf '  %02d  %4sp  %s\n' "$rank" "$plays" "$base"
}

echo "== Year 2025 (top $YEAR_TOP) -> $OUT/2025 =="
while IFS=$'\t' read -r rn plays path; do
  [ -z "$rn" ] && continue
  copy_one "$OUT/2025" "$rn" "$plays" "$path"
done < <(sqlite3 -noheader -separator $'\t' "$DBRO" "
  SELECT ROW_NUMBER() OVER (ORDER BY COUNT(*) DESC, mf.id) AS rn,
         COUNT(*) AS plays, mf.path
  FROM play_history ph
  JOIN media_file mf ON mf.id = ph.media_file_id
  WHERE ph.played_at >= '2025-01-01' AND ph.played_at < '2026-01-01'
  GROUP BY ph.media_file_id
  ORDER BY plays DESC, mf.id
  LIMIT $YEAR_TOP;
")

echo
echo "== Year 2026 (top $MONTH_TOP per month) -> $OUT/2026/<month> =="
while IFS=$'\t' read -r ym rn plays path; do
  [ -z "$ym" ] && continue
  [ "$rn" = "1" ] && echo "-- $ym --"
  copy_one "$OUT/2026/$ym" "$rn" "$plays" "$path"
done < <(sqlite3 -noheader -separator $'\t' "$DBRO" "
  WITH monthly AS (
    SELECT strftime('%Y-%m', ph.played_at) AS ym,
           mf.path AS path,
           COUNT(*) AS plays,
           ROW_NUMBER() OVER (
             PARTITION BY strftime('%Y-%m', ph.played_at)
             ORDER BY COUNT(*) DESC, mf.id
           ) AS rn
    FROM play_history ph
    JOIN media_file mf ON mf.id = ph.media_file_id
    WHERE ph.played_at >= '2026-01-01' AND ph.played_at < '2027-01-01'
    GROUP BY ym, ph.media_file_id
  )
  SELECT ym, rn, plays, path FROM monthly
  WHERE rn <= $MONTH_TOP
  ORDER BY ym, rn;
")

echo
echo "Done. Copied: $copied | Missing: $missing"
echo "Output: $OUT"
echo "Tip: zip it for download ->  (cd \"$(dirname "$OUT")\" && zip -r charts_export.zip \"$(basename "$OUT")\")"
