package main

import (
	"database/sql"
	"flag"
	"fmt"
	"log"
	"os"

	_ "github.com/mattn/go-sqlite3"
	"github.com/navidrome/navidrome/utils/str"
)

func main() {
	dbPath := flag.String("db", "data/navidrome.db", "Path to navidrome.db")
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

	// Update albums
	fmt.Println("\n=== Updating album full_text ===")
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

		// Format full_text the same way as formatFullText in sql_search.go
		fullText := str.SanitizeStrings(name, sortAlbumName, albumArtist, sortAlbumArtistName, genre)
		fullText = " " + fullText // Add leading space like formatFullText does

		_, err = db.Exec("UPDATE album SET full_text = ? WHERE id = ?", fullText, id)
		if err != nil {
			return count, err
		}

		if count < 5 {
			fmt.Printf("  %s -> %s\n", name, fullText)
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

		fullText := str.SanitizeStrings(name, sortArtistName)
		fullText = " " + fullText

		_, err = db.Exec("UPDATE artist SET full_text = ? WHERE id = ?", fullText, id)
		if err != nil {
			return count, err
		}

		if count < 5 {
			fmt.Printf("  %s -> %s\n", name, fullText)
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

		fullText := str.SanitizeStrings(title, album, artist, albumArtist, sortArtistName,
			sortAlbumArtistName, genre)
		fullText = " " + fullText

		_, err = db.Exec("UPDATE media_file SET full_text = ? WHERE id = ?", fullText, id)
		if err != nil {
			return count, err
		}
		count++
	}
	return count, nil
}
