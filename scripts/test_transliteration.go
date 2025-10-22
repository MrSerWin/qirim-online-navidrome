package main

import (
	"fmt"

	"github.com/navidrome/navidrome/utils"
)

func main() {
	fmt.Println("=== Testing Transliteration ===\n")

	testCases := []struct {
		name     string
		input    string
	}{
		{"Album 1", "Abdureim Dinşa"},
		{"Album 2", "Adile Çerkezova"},
		{"Album 3", "Ahmed Saidov"},
		{"Album 4", "Adam İsmail"},
		{"Album 5", "Ahtem Bulatov"},
		{"Album 6", "Ahtem İlyasov"},
		{"Album 7", "Albat"},
		{"Album 8", "Aleksandra Yevçuk"},
		{"Album 9", "ATR ansambli"},
		{"Album 10", "Alen Osmanov"},
		{"Mixed", "Café Şehir Москва"},
		{"Complex", "Destan (Fevzi Aliyev) - Alım"},
	}

	fmt.Println("Testing individual names:")
	fmt.Println("----------------------------------------")
	for _, tc := range testCases {
		alias := utils.GenerateURLAlias(tc.input)
		fmt.Printf("%-30s -> %s\n", tc.input, alias)
	}

	fmt.Println("\n\nTesting album aliases (Artist - Album):")
	fmt.Println("----------------------------------------")
	albumTests := []struct {
		artist string
		album  string
	}{
		{"Destan", "Fevzi Aliyev"},
		{"Abdureim", "Dinşa"},
		{"Adile", "Çerkezova Songs"},
		{"Салгър", "Live in Concert"},
	}

	for _, tc := range albumTests {
		alias := utils.GenerateAlbumAlias(tc.album, tc.artist)
		fmt.Printf("%-20s - %-20s -> %s\n", tc.artist, tc.album, alias)
	}

	fmt.Println("\n✅ All tests completed!")
}
