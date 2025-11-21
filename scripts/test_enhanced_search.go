package main

import (
	"fmt"
	"strings"

	"github.com/navidrome/navidrome/utils"
	"github.com/navidrome/navidrome/utils/str"
)

func main() {
	// Test cases for search
	testCases := []string{
		"Сейран",          // Cyrillic (Russian/Crimean Tatar name)
		"seyran",          // Latin equivalent
		"Qırım",           // Crimean Tatar with special chars
		"Kirim",           // Latin without special chars
		"Анавтан",         // Cyrillic
		"anavtan",         // Latin
		"Şarkı",           // Turkish
		"sarki",           // Latin without special chars
		"Enver Baltayev",  // Mixed case
		"энвер балтаев",   // Cyrillic equivalent
	}

	fmt.Println("=== Testing Enhanced Search Transliteration ===\n")

	for _, testCase := range testCases {
		fmt.Printf("Input: %s\n", testCase)

		// Test SanitizeStrings (what goes into full_text field)
		sanitized := str.SanitizeStrings(testCase)
		fmt.Printf("  Sanitized (full_text): %s\n", sanitized)

		// Test Transliterate directly
		transliterated := utils.Transliterate(testCase)
		fmt.Printf("  Transliterated: %s\n", transliterated)

		// Test lowercase + trimspace (what enhancedSearchExpr uses)
		qTranslit := strings.ToLower(strings.TrimSpace(testCase))
		fmt.Printf("  Search variant: %s\n", qTranslit)

		fmt.Println()
	}

	// Show how a typical search would work
	fmt.Println("=== Example Search Scenario ===")
	fmt.Println("\nScenario 1: User types 'Сейран' (Cyrillic)")
	cyrillic := "Сейран"
	fmt.Printf("  User input: %s\n", cyrillic)
	fmt.Printf("  Sanitized for DB: %s\n", str.SanitizeStrings(cyrillic))
	fmt.Printf("  Direct search: %s\n", strings.ToLower(cyrillic))
	fmt.Printf("  Will match: 'Seyran', 'seyran', 'Сейран' in database\n")

	fmt.Println("\nScenario 2: User types 'seyran' (Latin)")
	latin := "seyran"
	fmt.Printf("  User input: %s\n", latin)
	fmt.Printf("  Sanitized for DB: %s\n", str.SanitizeStrings(latin))
	fmt.Printf("  Direct search: %s\n", strings.ToLower(latin))
	fmt.Printf("  Will match: 'Seyran', 'seyran' in database\n")

	fmt.Println("\nScenario 3: User types 'Qırım' (Crimean Tatar with special chars)")
	crh := "Qırım"
	fmt.Printf("  User input: %s\n", crh)
	fmt.Printf("  Sanitized for DB: %s\n", str.SanitizeStrings(crh))
	fmt.Printf("  Direct search: %s\n", strings.ToLower(crh))
	fmt.Printf("  Will match: 'Qırım', 'qirim', 'Kirim' in database\n")
}
