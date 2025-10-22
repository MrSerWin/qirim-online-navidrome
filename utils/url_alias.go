package utils

import (
	"regexp"
	"strings"
	"unicode"
)

// transliterate converts special characters to ASCII equivalents
func transliterate(input string) string {
	// Crimean Tatar, Turkish, and other special characters
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

		// French (excluding ç which is already in Turkish section)
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

// GenerateURLAlias creates a URL-friendly alias from a given string
// It converts to lowercase, removes special characters, and replaces spaces with hyphens
func GenerateURLAlias(input string) string {
	if input == "" {
		return ""
	}

	// First, transliterate special characters to ASCII
	alias := transliterate(input)

	// Convert to lowercase
	alias = strings.ToLower(alias)

	// Replace common special characters with their equivalents
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
		// Make sure we don't end with a hyphen
		alias = strings.TrimSuffix(alias, "-")
	}

	return alias
}

// GenerateUniqueURLAlias creates a unique URL alias by appending a number if needed
func GenerateUniqueURLAlias(base string, existingAliases map[string]bool) string {
	alias := GenerateURLAlias(base)
	
	if alias == "" {
		return ""
	}

	originalAlias := alias
	counter := 1

	for existingAliases[alias] {
		alias = originalAlias + "-" + string(rune(counter+'0'))
		counter++
	}

	return alias
}

// IsValidURLAlias checks if a string is a valid URL alias
func IsValidURLAlias(alias string) bool {
	if alias == "" {
		return false
	}

	// Check if it contains only lowercase letters, numbers, and hyphens
	for _, r := range alias {
		if !unicode.IsLower(r) && !unicode.IsDigit(r) && r != '-' {
			return false
		}
	}

	// Check if it starts or ends with hyphen
	if strings.HasPrefix(alias, "-") || strings.HasSuffix(alias, "-") {
		return false
	}

	// Check length
	if len(alias) > 100 {
		return false
	}

	return true
}

// GenerateAlbumAlias creates an alias for an album
func GenerateAlbumAlias(albumName, artistName string) string {
	if albumName == "" {
		return ""
	}

	// For albums, use format: "artist-name-album-name"
	if artistName != "" && artistName != "Various Artists" {
		return GenerateURLAlias(artistName + " - " + albumName)
	}
	
	return GenerateURLAlias(albumName)
}

// GenerateArtistAlias creates an alias for an artist
func GenerateArtistAlias(artistName string) string {
	if artistName == "" {
		return ""
	}
	
	return GenerateURLAlias(artistName)
}

// GenerateSongAlias creates an alias for a song
func GenerateSongAlias(songTitle, artistName string) string {
	if songTitle == "" {
		return ""
	}

	// For songs, use format: "artist-name-song-title"
	if artistName != "" {
		return GenerateURLAlias(artistName + " - " + songTitle)
	}
	
	return GenerateURLAlias(songTitle)
}
