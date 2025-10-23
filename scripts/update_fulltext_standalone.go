package main

import (
	"database/sql"
	"flag"
	"fmt"
	"log"
	"os"
	"regexp"
	"slices"
	"strings"

	_ "github.com/mattn/go-sqlite3"
)

// transliterate converts special characters to ASCII equivalents
func transliterate(input string) string {
	transliterations := map[rune]string{
		// Crimean Tatar / Turkish
		'ç': "c", 'Ç': "C",
		'ğ': "g", 'Ğ': "G",
		'ñ': "n", 'Ñ': "N",
		'ö': "o", 'Ö': "O",
		'ş': "s", 'Ş': "S",
		'ü': "u", 'Ü': "U",
		'ı': "i", 'İ': "I",

		// Russian Cyrillic
		'а': "a", 'А': "A",
		'б': "b", 'Б': "B",
		'в': "v", 'В': "V",
		'г': "g", 'Г': "G",
		'д': "d", 'Д': "D",
		'е': "e", 'Е': "E",
		'ё': "e", 'Ё': "E",
		'ж': "zh", 'Ж': "Zh",
		'з': "z", 'З': "Z",
		'и': "i", 'И': "I",
		'й': "y", 'Й': "Y",
		'к': "k", 'К': "K",
		'л': "l", 'Л': "L",
		'м': "m", 'М': "M",
		'н': "n", 'Н': "N",
		'о': "o", 'О': "O",
		'п': "p", 'П': "P",
		'р': "r", 'Р': "R",
		'с': "s", 'С': "S",
		'т': "t", 'Т': "T",
		'у': "u", 'У': "U",
		'ф': "f", 'Ф': "F",
		'х': "h", 'Х': "H",
		'ц': "ts", 'Ц': "Ts",
		'ч': "ch", 'Ч': "Ch",
		'ш': "sh", 'Ш': "Sh",
		'щ': "sch", 'Щ': "Sch",
		'ъ': "", 'Ъ': "",
		'ы': "y", 'Ы': "Y",
		'ь': "", 'Ь': "",
		'э': "e", 'Э': "E",
		'ю': "yu", 'Ю': "Yu",
		'я': "ya", 'Я': "Ya",

		// German umlauts
		'ä': "ae", 'Ä': "Ae",
		'ë': "e", 'Ë': "E",
		'ï': "i", 'Ï': "I",

		// French
		'à': "a", 'À': "A",
		'â': "a", 'Â': "A",
		'é': "e", 'É': "E",
		'è': "e", 'È': "E",
		'ê': "e", 'Ê': "E",
		'î': "i", 'Î': "I",
		'ô': "o", 'Ô': "O",
		'û': "u", 'Û': "U",
		'ù': "u", 'Ù': "U",
		'ÿ': "y", 'Ÿ': "Y",

		// Spanish / Portuguese
		'á': "a", 'Á': "A",
		'í': "i", 'Í': "I",
		'ó': "o", 'Ó': "O",
		'ú': "u", 'Ú': "U",
		'ã': "a", 'Ã': "A",
		'õ': "o", 'Õ': "O",

		// Other common
		'æ': "ae", 'Æ': "Ae",
		'œ': "oe", 'Œ': "Oe",
		'ß': "ss",
		'ð': "d", 'Ð': "D",
		'þ': "th", 'Þ': "Th",
		'ø': "o", 'Ø': "O",
		'å': "a", 'Å': "A",
	}

	var result strings.Builder
	for _, r := range input {
		if replacement, ok := transliterations[r]; ok {
			result.WriteString(replacement)
		} else {
			result.WriteRune(r)
		}
	}
	return result.String()
}

var ignoredCharsRegex = regexp.MustCompile(`[""'''"\\[\](){},]`)
var slashRemover = strings.NewReplacer("\\", " ", "/", " ")

func clear(str string) string {
	// Simplified version - just remove extra whitespace
	return strings.TrimSpace(str)
}

// sanitizeStrings replicates the logic from utils/str/sanitize_strings.go
func sanitizeStrings(text ...string) string {
	// Concatenate all strings
	sanitizedText := strings.Builder{}
	for _, txt := range text {
		sanitizedText.WriteString(strings.TrimSpace(txt))
		sanitizedText.WriteByte(' ')
	}

	// Remove special symbols, transliterate, lowercase
	sanitizedStrings := slashRemover.Replace(clear(sanitizedText.String()))
	sanitizedStrings = transliterate(sanitizedStrings)
	sanitizedStrings = strings.ToLower(sanitizedStrings)
	sanitizedStrings = ignoredCharsRegex.ReplaceAllString(sanitizedStrings, "")
	fullText := strings.Fields(sanitizedStrings)

	// Remove duplicated words
	slices.Sort(fullText)
	fullText = slices.Compact(fullText)

	// Returns the sanitized text as a single string
	return strings.Join(fullText, " ")
}

func formatFullText(text ...string) string {
	fullText := sanitizeStrings(text...)
	return " " + fullText
}

func main() {
	dbPath := flag.String("db", "/opt/navidrome/data/navidrome.db", "Path to navidrome.db")
	flag.Parse()

	if _, err := os.Stat(*dbPath); os.IsNotExist(err) {
		log.Fatalf("Database not found: %s", *dbPath)
	}

	fmt.Printf("Opening database: %s\n", *dbPath)
	fmt.Println("Using built-in transliteration for Turkish, Cyrillic, etc.")
	fmt.Println()

	db, err := sql.Open("sqlite3", *dbPath)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	if err := db.Ping(); err != nil {
		log.Fatalf("Cannot connect to database: %v", err)
	}

	// Test transliteration
	fmt.Println("=== Testing Transliteration ===")
	testInput := "Hıdırlez Çerkezova Dinşa"
	testOutput := sanitizeStrings(testInput)
	fmt.Printf("Input:  %s\n", testInput)
	fmt.Printf("Output: %s\n", testOutput)
	fmt.Println()

	// Update albums
	fmt.Println("=== Updating album full_text ===")
	count, err := updateAlbumFullText(db)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("✓ Updated %d albums\n", count)

	// Update artists
	fmt.Println("\n=== Updating artist full_text ===")
	count, err = updateArtistFullText(db)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("✓ Updated %d artists\n", count)

	// Update media files
	fmt.Println("\n=== Updating media_file full_text ===")
	count, err = updateMediaFileFullText(db)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("✓ Updated %d media files\n", count)

	fmt.Println("\n✅ All full_text columns updated!")
}

func updateAlbumFullText(db *sql.DB) (int, error) {
	rows, err := db.Query(`SELECT id, name, sort_album_name, album_artist, sort_album_artist_name,
		genre FROM album WHERE missing = 0`)
	if err != nil {
		return 0, err
	}
	defer rows.Close()

	count := 0
	for rows.Next() {
		var id, name, sortAlbumName, albumArtist, sortAlbumArtistName, genre string

		if err := rows.Scan(&id, &name, &sortAlbumName, &albumArtist, &sortAlbumArtistName,
			&genre); err != nil {
			return count, err
		}

		fullText := formatFullText(name, sortAlbumName, albumArtist, sortAlbumArtistName, genre)

		_, err = db.Exec("UPDATE album SET full_text = ? WHERE id = ?", fullText, id)
		if err != nil {
			return count, err
		}

		if count < 5 {
			fmt.Printf("  %s ->%s\n", name, fullText)
		}
		count++
	}
	return count, nil
}

func updateArtistFullText(db *sql.DB) (int, error) {
	rows, err := db.Query("SELECT id, name, sort_artist_name FROM artist WHERE missing = 0")
	if err != nil {
		return 0, err
	}
	defer rows.Close()

	count := 0
	for rows.Next() {
		var id, name, sortArtistName string
		if err := rows.Scan(&id, &name, &sortArtistName); err != nil {
			return count, err
		}

		fullText := formatFullText(name, sortArtistName)

		_, err = db.Exec("UPDATE artist SET full_text = ? WHERE id = ?", fullText, id)
		if err != nil {
			return count, err
		}

		if count < 5 {
			fmt.Printf("  %s ->%s\n", name, fullText)
		}
		count++
	}
	return count, nil
}

func updateMediaFileFullText(db *sql.DB) (int, error) {
	rows, err := db.Query(`SELECT id, title, album, artist, album_artist, sort_artist_name,
		sort_album_artist_name, genre FROM media_file WHERE missing = 0`)
	if err != nil {
		return 0, err
	}
	defer rows.Close()

	count := 0
	for rows.Next() {
		var id, title, album, artist, albumArtist, sortArtistName, sortAlbumArtistName, genre string
		if err := rows.Scan(&id, &title, &album, &artist, &albumArtist,
			&sortArtistName, &sortAlbumArtistName, &genre); err != nil {
			return count, err
		}

		fullText := formatFullText(title, album, artist, albumArtist, sortArtistName,
			sortAlbumArtistName, genre)

		_, err = db.Exec("UPDATE media_file SET full_text = ? WHERE id = ?", fullText, id)
		if err != nil {
			return count, err
		}
		count++
	}
	return count, nil
}
