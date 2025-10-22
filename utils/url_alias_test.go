package utils

import (
	"testing"
)

func TestTransliterate(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected string
	}{
		// Crimean Tatar / Turkish
		{"Turkish ç", "Çeşme", "Cesme"},
		{"Turkish ğ", "Değer", "Deger"},
		{"Turkish ş", "Şehir", "Sehir"},
		{"Turkish ü", "Üzüm", "Uzum"},
		{"Turkish ö", "Göl", "Gol"},
		{"Turkish ı", "Ayşe Hanım", "Ayse Hanim"},

		// Real examples from your data
		{"Abdureim Dinşa", "Abdureim Dinşa", "Abdureim Dinsa"},
		{"Adile Çerkezova", "Adile Çerkezova", "Adile Cerkezova"},
		{"Ahtem İlyasov", "Ahtem İlyasov", "Ahtem Ilyasov"},

		// Russian Cyrillic
		{"Russian text", "Привет", "Privet"},
		{"Russian mix", "Салгър", "Salgr"},

		// Mixed
		{"Mixed characters", "Café Москва", "Cafe Moskva"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := transliterate(tt.input)
			if result != tt.expected {
				t.Errorf("transliterate(%q) = %q, want %q", tt.input, result, tt.expected)
			}
		})
	}
}

func TestGenerateURLAlias(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected string
	}{
		// Basic tests
		{"Simple name", "Test Album", "test-album"},
		{"With special chars", "Test & Album", "test-and-album"},
		{"Multiple spaces", "Test   Album", "test-album"},
		{"Leading/trailing spaces", "  Test Album  ", "test-album"},

		// Crimean Tatar examples
		{"Turkish ç", "Çerkezova", "cerkezova"},
		{"Turkish ğ", "Değer", "deger"},
		{"Turkish ş", "Dinşa", "dinsa"},
		{"Turkish ü", "Üzüm", "uzum"},
		{"Turkish ö", "Göl", "gol"},
		{"Turkish ı", "Ayşe Hanım", "ayse-hanim"},

		// Real album examples
		{"Album 1", "Abdureim Dinşa", "abdureim-dinsa"},
		{"Album 2", "Adile Çerkezova", "adile-cerkezova"},
		{"Album 3", "Ahtem İlyasov", "ahtem-ilyasov"},

		// Russian examples (ъ and ь are removed as they're hard/soft signs)
		{"Cyrillic", "Салгър", "salgr"},
		{"Russian word", "Привет", "privet"},

		// Complex cases
		{"Special chars", "Test & Co. (2024)", "test-and-co-2024"},
		{"Slashes", "AC/DC", "ac-dc"},
		{"Multiple hyphens", "Test---Album", "test-album"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := GenerateURLAlias(tt.input)
			if result != tt.expected {
				t.Errorf("GenerateURLAlias(%q) = %q, want %q", tt.input, result, tt.expected)
			}
		})
	}
}

func TestGenerateAlbumAlias(t *testing.T) {
	tests := []struct {
		albumName  string
		artistName string
		expected   string
	}{
		{"Abbey Road", "The Beatles", "the-beatles-abbey-road"},
		{"Dinşa", "Abdureim", "abdureim-dinsa"},
		{"Test Album", "", "test-album"},
		{"Test Album", "Various Artists", "test-album"},
		{"Şehir", "Çerkezova", "cerkezova-sehir"},
	}

	for _, tt := range tests {
		t.Run(tt.albumName, func(t *testing.T) {
			result := GenerateAlbumAlias(tt.albumName, tt.artistName)
			if result != tt.expected {
				t.Errorf("GenerateAlbumAlias(%q, %q) = %q, want %q",
					tt.albumName, tt.artistName, result, tt.expected)
			}
		})
	}
}

func TestGenerateArtistAlias(t *testing.T) {
	tests := []struct {
		input    string
		expected string
	}{
		{"The Beatles", "the-beatles"},
		{"Abdureim Dinşa", "abdureim-dinsa"},
		{"Adile Çerkezova", "adile-cerkezova"},
		{"AC/DC", "ac-dc"},
		{"Салгър", "salgr"},
	}

	for _, tt := range tests {
		t.Run(tt.input, func(t *testing.T) {
			result := GenerateArtistAlias(tt.input)
			if result != tt.expected {
				t.Errorf("GenerateArtistAlias(%q) = %q, want %q", tt.input, result, tt.expected)
			}
		})
	}
}
