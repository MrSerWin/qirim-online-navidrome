#!/bin/bash
# Тест функций извлечения артистов и названий

# Импортируем функции из основного скрипта
source "$(dirname "$0")/update-music-tags.sh" 2>/dev/null || true

# Функция извлечения артистов (копия из основного скрипта для теста)
extract_artists_from_filename() {
    local filename="$1"
    local artists=""

    # Убрать расширение
    filename="${filename%.*}"

    # Попробовать найти разделители между артистом и названием
    local artist_part=""

    if [[ "$filename" =~ ^(.+)[–—-](.+)$ ]]; then
        artist_part="${BASH_REMATCH[1]}"
    else
        artist_part="$filename"
    fi

    # Убрать пробелы по краям
    artist_part=$(echo "$artist_part" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')

    # Проверить на наличие нескольких артистов
    if [[ "$artist_part" =~ ,|\ \&\ |\ feat\.?\ |\ ft\.?\ |\ featuring\  ]]; then
        artists="$artist_part"
        # feat./ft./featuring → ,
        artists=$(echo "$artists" | sed -E 's/ feat\.? / , /gi; s/ ft\.? / , /gi; s/ featuring / , /gi')
        # & → ,
        artists=$(echo "$artists" | sed 's/ & / , /g')
        # Заменить , на ;
        artists=$(echo "$artists" | sed 's/ *, */; /g')
        # Убрать лишние пробелы
        artists=$(echo "$artists" | sed 's/; */; /g; s/ *;/;/g')
    else
        artists="$artist_part"
    fi

    echo "$artists"
}

extract_title_from_filename() {
    local filename="$1"
    local title=""

    filename="${filename%.*}"

    if [[ "$filename" =~ ^(.+)[–—-](.+)$ ]]; then
        title="${BASH_REMATCH[2]}"
    else
        title="$filename"
    fi

    title=$(echo "$title" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
    echo "$title"
}

# Тестовые примеры
echo "Тест извлечения артистов и названий:"
echo "======================================="

test_cases=(
    "Emine Ziadin, Nazife Reizova – ILACIM.mp3"
    "Artist1 & Artist2 - Song Title.mp3"
    "Artist1 feat. Artist2 - Song.mp3"
    "Artist1 ft Artist2 - Song.mp3"
    "Artist1 featuring Artist2 - Song.mp3"
    "Single Artist - Song Title.mp3"
    "Just Song Title.mp3"
)

for test in "${test_cases[@]}"; do
    echo ""
    echo "Файл: $test"
    artists=$(extract_artists_from_filename "$test")
    title=$(extract_title_from_filename "$test")
    echo "  → Artist: $artists"
    echo "  → Title: $title"
done

echo ""
echo "======================================="
