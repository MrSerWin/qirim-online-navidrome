#!/usr/bin/env bash
# Build one bass-pulse video per 2026 month from tmp_charts/2026/<ym>/.
# Concatenates the 10 tracks (in rank order) WITHOUT embedded cover art (-vn),
# then renders the pulsing QO logo (horizontal 1920x1080). Renders run in parallel.
set -uo pipefail

ROOT="/Users/servin/1_dev/my/qo/navidrome/tmp_charts/2026"
BP="/Users/servin/1_dev/my/tools/bass-pulse/bass-pulse"
LOGO="/Users/servin/1_dev/my/tools/bass-pulse/horisontal.png"

# 1) Concatenate each month's tracks -> audio-only m4a
for d in "$ROOT"/2026-*/; do
  ym="$(basename "$d")"
  list="$ROOT/_${ym}_concat.txt"
  python3 - "$d" "$list" <<'PY'
import glob, os, sys
d, list_path = sys.argv[1], sys.argv[2]
files = sorted(glob.glob(os.path.join(d, "*.mp3")))
with open(list_path, "w") as f:
    for p in files:
        f.write("file '%s'\n" % os.path.abspath(p).replace("'", "'\\''"))
print(f"{os.path.basename(d.rstrip('/'))}: {len(files)} tracks")
PY
  ffmpeg -hide_banner -loglevel error -f concat -safe 0 -i "$list" \
    -vn -ar 44100 -ac 2 -c:a aac -b:a 256k -y "$ROOT/${ym}_audio.m4a"
  echo "  concatenated -> ${ym}_audio.m4a"
done

# 2) Render all months in parallel
echo "Rendering ${ROOT}/2026-*.mp4 (parallel)..."
pids=""
for d in "$ROOT"/2026-*/; do
  ym="$(basename "$d")"
  "$BP" -h --logo "$LOGO" \
    --audio "$ROOT/${ym}_audio.m4a" \
    --out   "$ROOT/${ym}.mp4" \
    > "$ROOT/_${ym}_render.log" 2>&1 &
  pids="$pids $!"
  echo "  started $ym (pid $!)"
done

fail=0
for p in $pids; do wait "$p" || fail=$((fail+1)); done

echo "=== done. failures: $fail ==="
for d in "$ROOT"/2026-*/; do
  ym="$(basename "$d")"
  out="$ROOT/${ym}.mp4"
  if [ -f "$out" ]; then
    info=$(ffprobe -v error -select_streams v:0 \
      -show_entries stream=width,height -show_entries format=duration \
      -of csv=p=0:nokey=1 "$out" 2>/dev/null | paste -sd' ' -)
    echo "  $ym.mp4  -> $info  ($(du -h "$out" | cut -f1))"
  else
    echo "  $ym.mp4  MISSING"
  fi
done
