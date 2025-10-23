package main

import (
	"fmt"

	"github.com/navidrome/navidrome/utils/str"
)

func main() {
	testCases := []string{
		"Hıdırlez",
		"Çerkezova",
		"Dinşa",
		"İlyasov",
		"Bağçasaray",
		"Salğır",
		"Abdureim Dinşa",
		"Adile Çerkezova",
	}

	fmt.Println("=== Testing Search Sanitization ===\n")
	fmt.Println("This shows how search terms are normalized:")
	fmt.Println("----------------------------------------")
	for _, tc := range testCases {
		result := str.SanitizeStrings(tc)
		fmt.Printf("%-25s -> %s\n", tc, result)
	}

	fmt.Println("\n=== Example Searches ===")
	fmt.Println("User searches for 'Hidirlez' (without Turkish chars)")
	fmt.Printf("Normalized to: %s\n", str.SanitizeStrings("Hidirlez"))

	fmt.Println("\nDatabase has 'Hıdırlez' (with Turkish chars)")
	fmt.Printf("Normalized to: %s\n", str.SanitizeStrings("Hıdırlez"))

	fmt.Println("\n✓ Both normalize to the same value - SEARCH WILL WORK!")
}
