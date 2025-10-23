package main

import (
	"database/sql"
	"flag"
	"fmt"
	"log"
	"os"
	"regexp"
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

		// Spanish
		'á': "a", 'Á': "A",
		'í': "i", 'Í': "I",
		'ó': "o", 'Ó': "O",
		'ú': "u", 'Ú': "U",

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

// generateURLAlias creates a URL-friendly alias from a given string
func generateURLAlias(input string) string {
	if input == "" {
		return ""
	}

	// First, transliterate special characters to ASCII
	alias := transliterate(input)

	// Convert to lowercase
	alias = strings.ToLower(alias)

	// Replace common special characters
	replacements := map[string]string{
		"&":  "and",
		"+":  "plus",
		"@":  "at",
		"#":  "hash",
		"%":  "percent",
		"*":  "star",
		"(":  "",
		")":  "",
		"[":  "",
		"]":  "",
		"{":  "",
		"}":  "",
		"|":  "or",
		"\\": "",
		"/":  "-",
		":":  "",
		";":  "",
		"<":  "",
		">":  "",
		"=":  "equals",
		"?":  "",
		"!":  "",
		".":  "",
		",":  "",
		"'":  "",
		"\"": "",
		"`":  "",
		"~":  "",
		"^":  "",
		"$":  "",
	}

	for old, new := range replacements {
		alias = strings.ReplaceAll(alias, old, new)
	}

	// Remove any remaining non-alphanumeric characters except hyphens and spaces
	reg := regexp.MustCompile(`[^a-z0-9\s-]`)
	alias = reg.ReplaceAllString(alias, "")

	// Replace multiple spaces with single space
	reg = regexp.MustCompile(`\s+`)
	alias = reg.ReplaceAllString(alias, " ")

	// Replace spaces with hyphens
	alias = strings.ReplaceAll(alias, " ", "-")

	// Remove multiple consecutive hyphens
	reg = regexp.MustCompile(`-+`)
	alias = reg.ReplaceAllString(alias, "-")

	// Remove leading and trailing hyphens
	alias = strings.Trim(alias, "-")

	// Limit length to 100 characters
	if len(alias) > 100 {
		alias = alias[:100]
		alias = strings.TrimSuffix(alias, "-")
	}

	return alias
}

// generateUniqueURLAlias creates a unique URL alias by appending a number if needed
func generateUniqueURLAlias(base string, existingAliases map[string]bool) string {
	alias := generateURLAlias(base)

	if alias == "" {
		return ""
	}

	originalAlias := alias
	counter := 1

	for existingAliases[alias] {
		alias = fmt.Sprintf("%s-%d", originalAlias, counter)
		counter++
	}

	return alias
}

// generateAlbumAlias creates an alias for an album
func generateAlbumAlias(albumName, artistName string) string {
	if albumName == "" {
		return ""
	}

	if artistName != "" && artistName != "Various Artists" {
		return generateURLAlias(artistName + " - " + albumName)
	}

	return generateURLAlias(albumName)
}

// generateArtistAlias creates an alias for an artist
func generateArtistAlias(artistName string) string {
	if artistName == "" {
		return ""
	}

	return generateURLAlias(artistName)
}

// generateSongAlias creates an alias for a song
func generateSongAlias(songTitle, artistName string) string {
	if songTitle == "" {
		return ""
	}

	if artistName != "" {
		return generateURLAlias(artistName + " - " + songTitle)
	}

	return generateURLAlias(songTitle)
}

func main() {
	dbPath := flag.String("db", "/opt/navidrome/data/navidrome.db", "Path to navidrome.db")
	flag.Parse()

	if _, err := os.Stat(*dbPath); os.IsNotExist(err) {
		log.Fatalf("Database not found: %s", *dbPath)
	}

	fmt.Printf("Opening database: %s\n", *dbPath)

	db, err := sql.Open("sqlite3", *dbPath)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	if err := db.Ping(); err != nil {
		log.Fatalf("Cannot connect to database: %v", err)
	}

	// Generate aliases for albums
	fmt.Println("\n=== Generating aliases for albums ===")
	count, err := generateAlbumAliases(db)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("✓ Generated %d album aliases\n", count)

	// Generate aliases for artists
	fmt.Println("\n=== Generating aliases for artists ===")
	count, err = generateArtistAliases(db)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("✓ Generated %d artist aliases\n", count)

	// Generate aliases for songs
	fmt.Println("\n=== Generating aliases for songs ===")
	count, err = generateSongAliases(db)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("✓ Generated %d song aliases\n", count)

	fmt.Println("\n✅ All aliases generated successfully!")
}

func generateAlbumAliases(db *sql.DB) (int, error) {
	rows, err := db.Query("SELECT id, name, album_artist FROM album WHERE missing = 0")
	if err != nil {
		return 0, err
	}
	defer rows.Close()

	count := 0
	existingAliases := make(map[string]bool)
	for rows.Next() {
		var id, name, albumArtist string
		if err := rows.Scan(&id, &name, &albumArtist); err != nil {
			return count, err
		}

		alias := generateUniqueURLAlias(generateAlbumAlias(name, albumArtist), existingAliases)
		if alias != "" {
			existingAliases[alias] = true
			_, err = db.Exec("UPDATE album SET url_alias = ? WHERE id = ?", alias, id)
			if err != nil {
				return count, err
			}
			if count < 10 {
				fmt.Printf("  %s -> %s\n", name, alias)
			}
			count++
		}
	}
	return count, nil
}

func generateArtistAliases(db *sql.DB) (int, error) {
	rows, err := db.Query("SELECT id, name FROM artist WHERE missing = 0")
	if err != nil {
		return 0, err
	}
	defer rows.Close()

	count := 0
	existingAliases := make(map[string]bool)
	for rows.Next() {
		var id, name string
		if err := rows.Scan(&id, &name); err != nil {
			return count, err
		}

		alias := generateUniqueURLAlias(generateArtistAlias(name), existingAliases)
		if alias != "" {
			existingAliases[alias] = true
			_, err = db.Exec("UPDATE artist SET url_alias = ? WHERE id = ?", alias, id)
			if err != nil {
				return count, err
			}
			if count < 10 {
				fmt.Printf("  %s -> %s\n", name, alias)
			}
			count++
		}
	}
	return count, nil
}

func generateSongAliases(db *sql.DB) (int, error) {
	rows, err := db.Query("SELECT id, title, artist FROM media_file WHERE missing = 0")
	if err != nil {
		return 0, err
	}
	defer rows.Close()

	count := 0
	existingAliases := make(map[string]bool)
	for rows.Next() {
		var id, title, artist string
		if err := rows.Scan(&id, &title, &artist); err != nil {
			return count, err
		}

		alias := generateUniqueURLAlias(generateSongAlias(title, artist), existingAliases)
		if alias != "" {
			existingAliases[alias] = true
			_, err = db.Exec("UPDATE media_file SET url_alias = ? WHERE id = ?", alias, id)
			if err != nil {
				return count, err
			}
			count++
		}
	}
	return count, nil
}
