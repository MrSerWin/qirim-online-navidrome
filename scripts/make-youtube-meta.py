#!/usr/bin/env python3
"""For each chart folder under tmp_charts: move its rendered .mp4 inside the
folder and write youtube.txt (title, description, timestamped tracklist that
doubles as YouTube chapters, hashtags)."""
import glob, html, os, re, shutil, subprocess

BASE = os.path.join(os.path.dirname(__file__), "..", "tmp_charts")
BASE = os.path.abspath(BASE)

RU_MONTH = {
    "01": "январь", "02": "февраль", "03": "март", "04": "апрель",
    "05": "май", "06": "июнь", "07": "июль", "08": "август",
    "09": "сентябрь", "10": "октябрь", "11": "ноябрь", "12": "декабрь",
}

# (folder, video_src, kind, label)
TARGETS = [(os.path.join(BASE, "2025"), os.path.join(BASE, "2025_top20.mp4"), "year", "2025")]
for mm in ("01", "02", "03", "04", "05", "06"):
    ym = f"2026-{mm}"
    TARGETS.append((os.path.join(BASE, "2026", ym),
                    os.path.join(BASE, "2026", f"{ym}.mp4"), "month", ym))


def dur(path):
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "csv=p=0", path],
        capture_output=True, text=True).stdout.strip()
    try:
        return float(out)
    except ValueError:
        return 0.0


def ts(sec):
    sec = int(sec)
    h, rem = divmod(sec, 3600)
    m, s = divmod(rem, 60)
    return f"{h}:{m:02d}:{s:02d}" if h else f"{m}:{s:02d}"


def clean_name(fn):
    name = os.path.splitext(os.path.basename(fn))[0]
    name = re.sub(r"^\d{2}_\d+p_", "", name)      # drop rank/plays prefix
    name = html.unescape(name)
    return re.sub(r"\s+", " ", name).strip()


def build(folder, kind, label):
    mp3s = sorted(glob.glob(os.path.join(folder, "*.mp3")))
    if kind == "year":
        title = f"Qirim.Online — Топ-{len(mp3s)} крымскотатарских песен {label} года 🎵"
        period = f"{label} год"
        month_tag = f"#музыка{label}"
    else:
        y, mm = label.split("-")
        mon = RU_MONTH[mm].capitalize()
        title = f"Qirim.Online — Топ-{len(mp3s)} крымскотатарской музыки · {mon} {y} 🎵"
        period = f"{mon.lower()} {y}"
        month_tag = f"#{RU_MONTH[mm]}{y}"

    # timestamped tracklist (YouTube chapters: first must be 0:00)
    lines, t = [], 0.0
    for f in mp3s:
        lines.append(f"{ts(t)} {clean_name(f)}")
        t += dur(f)

    tags = [
        "#QirimOnline", "#CrimeanTatar", "#qırımtatarmuzıkası",
        "#КрымскотатарскаяМузыка", "#Qırım", "#Къырым", "#Crimea",
        "#кримськотатарськамузика", "#crimeantatarmusic", "#чарт",
        "#топмузыка", "#музыка", month_tag,
    ]

    desc = (
        f"{title}\n\n"
        f"Самые прослушиваемые крымскотатарские песни на Qirim.Online за {period}. "
        f"Рейтинг составлен автоматически по реальному числу прослушиваний на сайте.\n\n"
        f"🎧 Слушать бесплатно: https://qirim.online\n"
        f"📲 Топ-50, новинки, караоке и клипы — всё в одном месте.\n\n"
        f"⏱ Таймкоды / треклист:\n" + "\n".join(lines) + "\n\n"
        + " ".join(tags) + "\n"
    )

    with open(os.path.join(folder, "youtube.txt"), "w", encoding="utf-8") as fh:
        fh.write(desc)
    return len(mp3s), len(lines)


for folder, src, kind, label in TARGETS:
    os.makedirs(folder, exist_ok=True)
    # move the video inside its folder
    dst = os.path.join(folder, os.path.basename(src))
    if os.path.isfile(src):
        shutil.move(src, dst)
        moved = "moved"
    elif os.path.isfile(dst):
        moved = "already in folder"
    else:
        moved = "VIDEO MISSING"
    n, _ = build(folder, kind, label)
    print(f"{label}: {moved} -> {os.path.basename(dst)} | youtube.txt ({n} tracks)")

print("\nDone.")
