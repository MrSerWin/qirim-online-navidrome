#!/usr/bin/env python3
"""Match chart tracks (from prod play_history export) to local audio files and
copy them into tmp_charts/<year>[/<month>] for video assembly.

Matching: scope by artist folder + fuzzy filename match (HTML entities decoded,
diacritics folded, punctuation/case ignored). Prints a confidence score per row.
"""
import html, os, re, shutil, unicodedata
from difflib import SequenceMatcher

MUSIC = "/Volumes/T9/Media/Music/Музыка/QirimTatar"
OUT = os.path.join(os.path.dirname(__file__), "..", "tmp_charts")
OUT = os.path.abspath(OUT)
EXTS = (".mp3", ".flac", ".m4a", ".wav", ".ogg", ".opus")

# (rank, plays, title, artist)
YEAR_2025 = [
    (1, 28, "SEYRAN7&#39;62, FATMA CAPPAR - OL (special for DEV)", "Seyran 7'62"),
    (2, 21, "Seyran 7'62 - QrmVatanMillet", "Seyran 7'62"),
    (3, 20, "Seyran 7'62 - AREKET YAP (QIRIM BANG)", "Seyran 7'62"),
    (4, 17, "Seyran 7'62 - TEMEL", "Seyran 7'62"),
    (5, 17, "Seyran 7'62 - Djemile", "Seyran 7'62"),
    (6, 15, "Seyran 7'62 - Adam Ol", "Seyran 7'62"),
    (7, 14, "SEYRAN7--39-62-Vaqit kösterir -JAMDEEN ile-", "Seyran 7'62"),
    (8, 14, "Seyran 7'62 - Qiyinliqlar olsa da (ЭМДЖИЭЛ ile)", "Seyran 7'62"),
    (9, 13, "Seyran 7'62 - Qirim.Vatan.Millet", "Seyran 7'62"),
    (10, 13, "Fatma Cappar - Ediye", "Fatma Capparova"),
    (11, 12, "Alen Valiyev-Qarılğaç", "Alen Valiyev"),
    (12, 12, "Elzara Batalova - Balalar yaşasın", "Elzara Batalova"),
    (13, 12, "Seyran 7'62 - Qara Biber", "Seyran 7'62"),
    (14, 10, "Elzara Batalova-Zarema", "Elzara Batalova"),
    (15, 10, "DeLi Damir - Сanli nişan", "DeLi Damir"),
    (16, 10, "Aleksandra Yevçuk-Men anamnıñ bir qızı edim", "Aleksandra Yevçuk"),
    (17, 10, "Afize Kassara - deste qamişlar", "Afize Kassara"),
    (18, 9, "Seyran 7'62 - Qynlqlar olsa da ЭМДЖИЭЛ ile", "Seyran 7'62"),
    (19, 9, "Seyran 7'62 - Kim eger biz degil (edebiy variant)", "Seyran 7'62"),
    (20, 9, "Seyran 7'62 - Olar kibi", "Seyran 7'62"),
]

MONTHS_2026 = {
    "2026-01": [
        (1, 5, "Seyran 7'62 - AREKET YAP (QIRIM BANG)", "Seyran 7'62"),
        (2, 5, "JAMDEEN - Oyna", "JAMDEEN"),
        (3, 5, "Balalar - Horazlar", "Balalar"),
        (4, 4, "Mazalova Lütfiye Celil qızı (Gurzuf, 1929)-Gurzuf maneleri (halq icrası)", "Halq icrası"),
        (5, 4, "SEYRAN7&#39;62, FATMA CAPPAR - OL (special for DEV)", "Seyran 7'62"),
        (6, 4, "Halisa Ablayeva-Vatan duyğusı", "Halisa Ablayeva"),
        (7, 4, "Ahtem Bulatov-Bağçasaray haytarması", "Ahtem Bulatov"),
        (8, 4, "MEYDAN CALGI TAQIMI ve ASIYE SAALE - GUZELIM", "Asiye Saale"),
        (9, 4, "Jamala - Cha Cha Gitano (Live)", "Jamala"),
        (10, 4, "JAMDEEN - Deniz Yaninda", "JAMDEEN"),
    ],
    "2026-02": [
        (1, 7, "Seyran 7'62 - TEMEL", "Seyran 7'62"),
        (2, 6, "SEYRAN7&#39;62, FATMA CAPPAR - OL (special for DEV)", "Seyran 7'62"),
        (3, 6, "Seyran 7'62 - Qiyinliqlar olsa da (ЭМДЖИЭЛ ile)", "Seyran 7'62"),
        (4, 6, "Seyran 7'62 - Djemile", "Seyran 7'62"),
        (5, 6, "Seyran 7'62 - Qirimdan Kiyevge (Davet 20.11.2015)", "Seyran 7'62"),
        (6, 6, "Seyran 7'62 - QrmVatanMillet", "Seyran 7'62"),
        (7, 5, "Seyran 7'62 - AREKET YAP (QIRIM BANG)", "Seyran 7'62"),
        (8, 5, "Ruslan Arslanbekov-Arabacı (Aşıq oğlan)", "Ruslan Arslanbekov"),
        (9, 5, "SEYRAN7--39-62-Vaqit kösterir -JAMDEEN ile-", "Seyran 7'62"),
        (10, 5, "Alen Valiyev-Qarılğaç", "Alen Valiyev"),
    ],
    "2026-03": [
        (1, 3, "ATR ansambli - Santir avasi (Bağçalarda kestane)", "ATR ansambli"),
        (2, 3, "Destan-Mavile", "Destan (Fevzi Aliyev)"),
        (3, 2, "Zarema Aliyeva-Kemane", "Zarema Aliyeva"),
        (4, 2, "DJ Bebek-Возвращение (House Mix)", "DJ Bebek"),
        (5, 2, "Qarasuv-Kemanemi aldım elime", "Qarasuv"),
        (6, 2, "Jamala - All These Simple Things (Live)", "Jamala"),
        (7, 2, "Elvira_Emir_SKERCO_f_moll", "Elvira Emir"),
        (8, 2, "DJ Azzy-Cevapsız", "DJ Azzy"),
        (9, 2, "Alim Osmanov (Qara Deñiz) - Tañ yildizi", "Alim Osmanov (Qara Deñiz)"),
        (10, 2, "Edem İbragimov-İbrahim Paşanıñ kemanesi", "Edem İbragimov"),
    ],
    "2026-04": [
        (1, 4, "Garik ve Garik-Ablâz haytarması", "Garik ve Garik"),
        (2, 3, "Garik ve Garik-Arpaçıq haytarması", "Garik ve Garik"),
        (3, 3, "Garik ve Garik-Avdet haytarması", "Garik ve Garik"),
        (4, 2, "Arsen Kursaitov ve Leniye Cepparova-Боль разлуки", "Arsen Kursaitov"),
        (5, 2, "Garik ve Garik-Ayrılıq", "Garik ve Garik"),
        (6, 2, "Deli Damir ve Temircan - Sana", "Temircan"),
        (7, 2, "İsmail Lümanov (DJ Smail)-Qamışım", "DJ Smail (İsmail Lümanov)"),
        (8, 2, "SEYRAN7&#39;62, FATMA CAPPAR - OL (special for DEV)", "Seyran 7'62"),
        (9, 2, "Server Kakura - Sevilâ", "Server Kakura"),
        (10, 2, "Dilâver Settarov-Köydeşler (Cj Tematik)", "Dilâver Settarov"),
    ],
    "2026-05": [
        (1, 1, "Aziza İbragimova-Янголи", "Aziza İbragimova"),
        (2, 1, "Maqam-Bağçasaray haytarması", "Maqam"),
        (3, 1, "Zera Kenjikayeva ve DJ Bebek-A, qızım, seni kime vereyim (Ringtone)", "Ringtones"),
        (4, 1, "Emiliya Ablayeva - Elvida", "Emiliya Ablayeva"),
        (5, 1, "Dilyara Tukyanji - Duyam", "Dilyara Tukyanji"),
        (6, 1, "Afize Kassara - Uch qaranfil", "Afize Kassara"),
        (7, 1, "Ablâz Gerey - Yeşilim aman", "Ablâz Gerey"),
        (8, 1, "Sevil Veliyeva - День опять погас (Prod. Tematik 2014)", "Sevil Veliyeva"),
        (9, 1, "Elzara Şakirova-Bahtlı olacam", "Elzara Şakirova"),
        (10, 1, "Asiye Saale-Girdim yarin bağçasina (Live)", "Asiye Saale"),
    ],
    "2026-06": [
        (1, 1, "Belâlova Gülsüm İlyas qızı-Sevdim seni (halq icrası)", "Halq icrası"),
        (2, 1, "Dilâver Osmanov-Noğay beyitleri", "Dilâver Osmanov"),
        (3, 1, "Fevzi Aliyev-Sarı kelin", "Destan (Fevzi Aliyev)"),
        (4, 1, "Dilâver Osmanov-Noğay beyitleri (C'vgk remix)", "Dilâver Osmanov"),
        (5, 1, "Marlen Mamutov - Бонги", "Marlen Mamutov"),
        (6, 1, "Garik ve Garik-Peşraf haytarması", "Garik ve Garik"),
        (7, 1, "Ruslan Çir-Çir-Meyhaneci", "Ruslan Çir-Çir"),
        (8, 1, "Şefika Tatarisova-Чорнобривці", "Şefika Tatarisova"),
        (9, 1, "Refat Asanov-Çalbaş-bora", "Refat Asanov"),
        (10, 1, "Україна", "Emine Ziadin"),
    ],
}


def fold(s):
    s = html.unescape(s).replace("ı", "i").replace("İ", "i")
    s = unicodedata.normalize("NFKD", s)
    return "".join(c for c in s if not unicodedata.combining(c)).lower()


def norm(s):  # collapsed, no separators
    return re.sub(r"[^a-z0-9а-яё]+", "", fold(s))


def toks(s):  # significant tokens
    return [t for t in re.split(r"[^a-z0-9а-яё]+", fold(s)) if len(t) >= 2]


def ratio(a, b):
    return SequenceMatcher(None, a, b).ratio()


# Index all audio files once.
FILES = []  # (path, stem_norm, folder_norm)
for root, _dirs, names in os.walk(MUSIC):
    folder = os.path.basename(root)
    fn = norm(folder)
    for n in names:
        if n.lower().endswith(EXTS):
            FILES.append((os.path.join(root, n), norm(os.path.splitext(n)[0]), fn))
print(f"Indexed {len(FILES)} audio files\n")


def best_match(title, artist):
    tn, an = norm(title), norm(artist)
    art = set(toks(artist))
    # distinctive title tokens = title words that aren't part of the artist name
    tt = [t for t in toks(title) if t not in art] or toks(title)
    best, best_score = None, -1.0
    for path, sn, fn in FILES:
        r = ratio(tn, sn)
        cov = sum(1 for t in tt if t in sn) / len(tt) if tt else 0.0
        score = 0.4 * r + 0.6 * cov
        # bonus when the file's folder matches the chart artist
        if an and (an == fn or an in fn or fn in an or ratio(an, fn) >= 0.85):
            score += 0.1
        if score > best_score:
            best, best_score = path, score
    return best, best_score


def process(rows, destdir, label):
    os.makedirs(destdir, exist_ok=True)
    print(f"== {label} -> {destdir} ==")
    for rank, plays, title, artist in rows:
        path, score = best_match(title, artist)
        flag = "  " if score >= 0.62 else "??"
        base = os.path.basename(path) if path else "(none)"
        print(f" {flag} {rank:02d} {plays:>3}p  score={score:.2f}  {title[:48]:48}  ->  {base}")
        if path:
            dest = os.path.join(destdir, f"{rank:02d}_{plays}p_{os.path.basename(path)}")
            shutil.copy2(path, dest)
    print()


process(YEAR_2025, os.path.join(OUT, "2025"), "2025 (top 20)")
for ym, rows in MONTHS_2026.items():
    process(rows, os.path.join(OUT, "2026", ym), f"2026 / {ym}")

print(f"Done. Output: {OUT}")
print("Rows marked ?? have low confidence — verify those manually.")
