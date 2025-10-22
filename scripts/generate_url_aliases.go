package main

import (
	"database/sql"
	"fmt"
	"log"

	_ "github.com/mattn/go-sqlite3"
	"github.com/navidrome/navidrome/utils"
)

func main() {
	// Open database
	db, err := sql.Open("sqlite3", "../navidrome-data/navidrome.db")
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	// Generate aliases for albums
	fmt.Println("Generating aliases for albums...")
	err = generateAlbumAliases(db)
	if err != nil {
		log.Fatal(err)
	}

	// Generate aliases for artists
	fmt.Println("Generating aliases for artists...")
	err = generateArtistAliases(db)
	if err != nil {
		log.Fatal(err)
	}

	// Generate aliases for songs
	fmt.Println("Generating aliases for songs...")
	err = generateSongAliases(db)
	if err != nil {
		log.Fatal(err)
	}

	fmt.Println("All aliases generated successfully!")
}

func generateAlbumAliases(db *sql.DB) error {
	rows, err := db.Query("SELECT id, name, album_artist FROM album WHERE missing = 0")
	if err != nil {
		return err
	}
	defer rows.Close()

	existingAliases := make(map[string]bool)
	for rows.Next() {
		var id, name, albumArtist string
		if err := rows.Scan(&id, &name, &albumArtist); err != nil {
			return err
		}

		alias := utils.GenerateUniqueURLAlias(utils.GenerateAlbumAlias(name, albumArtist), existingAliases)
		if alias != "" {
			existingAliases[alias] = true
			_, err = db.Exec("UPDATE album SET url_alias = ? WHERE id = ?", alias, id)
			if err != nil {
				return err
			}
			fmt.Printf("Album: %s -> %s\n", name, alias)
		}
	}
	return nil
}

func generateArtistAliases(db *sql.DB) error {
	rows, err := db.Query("SELECT id, name FROM artist WHERE missing = 0")
	if err != nil {
		return err
	}
	defer rows.Close()

	existingAliases := make(map[string]bool)
	for rows.Next() {
		var id, name string
		if err := rows.Scan(&id, &name); err != nil {
			return err
		}

		alias := utils.GenerateUniqueURLAlias(utils.GenerateArtistAlias(name), existingAliases)
		if alias != "" {
			existingAliases[alias] = true
			_, err = db.Exec("UPDATE artist SET url_alias = ? WHERE id = ?", alias, id)
			if err != nil {
				return err
			}
			fmt.Printf("Artist: %s -> %s\n", name, alias)
		}
	}
	return nil
}

func generateSongAliases(db *sql.DB) error {
	rows, err := db.Query("SELECT id, title, artist FROM media_file WHERE missing = 0")
	if err != nil {
		return err
	}
	defer rows.Close()

	existingAliases := make(map[string]bool)
	for rows.Next() {
		var id, title, artist string
		if err := rows.Scan(&id, &title, &artist); err != nil {
			return err
		}

		alias := utils.GenerateUniqueURLAlias(utils.GenerateSongAlias(title, artist), existingAliases)
		if alias != "" {
			existingAliases[alias] = true
			_, err = db.Exec("UPDATE media_file SET url_alias = ? WHERE id = ?", alias, id)
			if err != nil {
				return err
			}
			fmt.Printf("Song: %s - %s -> %s\n", artist, title, alias)
		}
	}
	return nil
}
