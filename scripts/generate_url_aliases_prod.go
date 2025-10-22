package main

import (
	"database/sql"
	"flag"
	"fmt"
	"log"
	"os"

	_ "github.com/mattn/go-sqlite3"
	"github.com/navidrome/navidrome/utils"
)

func main() {
	// Parse command line arguments
	dbPath := flag.String("db", "/opt/navidrome/data/navidrome.db", "Path to navidrome.db")
	flag.Parse()

	// Check if database exists
	if _, err := os.Stat(*dbPath); os.IsNotExist(err) {
		log.Fatalf("Database not found: %s", *dbPath)
	}

	fmt.Printf("Opening database: %s\n", *dbPath)

	// Open database
	db, err := sql.Open("sqlite3", *dbPath)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	// Test connection
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

		alias := utils.GenerateUniqueURLAlias(utils.GenerateAlbumAlias(name, albumArtist), existingAliases)
		if alias != "" {
			existingAliases[alias] = true
			_, err = db.Exec("UPDATE album SET url_alias = ? WHERE id = ?", alias, id)
			if err != nil {
				return count, err
			}
			fmt.Printf("  %s -> %s\n", name, alias)
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

		alias := utils.GenerateUniqueURLAlias(utils.GenerateArtistAlias(name), existingAliases)
		if alias != "" {
			existingAliases[alias] = true
			_, err = db.Exec("UPDATE artist SET url_alias = ? WHERE id = ?", alias, id)
			if err != nil {
				return count, err
			}
			fmt.Printf("  %s -> %s\n", name, alias)
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

		alias := utils.GenerateUniqueURLAlias(utils.GenerateSongAlias(title, artist), existingAliases)
		if alias != "" {
			existingAliases[alias] = true
			_, err = db.Exec("UPDATE media_file SET url_alias = ? WHERE id = ?", alias, id)
			if err != nil {
				return count, err
			}
			if count < 10 { // Show only first 10 songs
				fmt.Printf("  %s - %s -> %s\n", artist, title, alias)
			}
			count++
		}
	}
	return count, nil
}
