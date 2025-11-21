package persistence

import (
	"strings"

	. "github.com/Masterminds/squirrel"
	"github.com/google/uuid"
	"github.com/navidrome/navidrome/conf"
	"github.com/navidrome/navidrome/model"
	"github.com/navidrome/navidrome/utils/str"
)

func formatFullText(text ...string) string {
	fullText := str.SanitizeStrings(text...)
	return " " + fullText
}

// doSearch performs a full-text search with the specified parameters.
// The naturalOrder is used to sort results when no full-text filter is applied. It is useful for cases like
// OpenSubsonic, where an empty search query should return all results in a natural order. Normally the parameter
// should be `tableName + ".rowid"`, but some repositories (ex: artist) may use a different natural order.
func (r sqlRepository) doSearch(sq SelectBuilder, q string, offset, size int, results any, naturalOrder string, orderBys ...string) error {
	q = strings.TrimSpace(q)
	q = strings.TrimSuffix(q, "*")
	if len(q) < 2 {
		return nil
	}

	filter := fullTextExpr(r.tableName, q)
	if filter != nil {
		sq = sq.Where(filter)
		sq = sq.OrderBy(orderBys...)
	} else {
		// This is to speed up the results of `search3?query=""`, for OpenSubsonic
		// If the filter is empty, we sort by the specified natural order.
		sq = sq.OrderBy(naturalOrder)
	}
	sq = sq.Where(Eq{r.tableName + ".missing": false})
	sq = sq.Limit(uint64(size)).Offset(uint64(offset))
	return r.queryAll(sq, results, model.QueryOptions{Offset: offset})
}

func (r sqlRepository) searchByMBID(sq SelectBuilder, mbid string, mbidFields []string, results any) error {
	sq = sq.Where(mbidExpr(r.tableName, mbid, mbidFields...))
	sq = sq.Where(Eq{r.tableName + ".missing": false})

	return r.queryAll(sq, results)
}

func mbidExpr(tableName, mbid string, mbidFields ...string) Sqlizer {
	if uuid.Validate(mbid) != nil || len(mbidFields) == 0 {
		return nil
	}
	mbid = strings.ToLower(mbid)
	var cond []Sqlizer
	for _, mbidField := range mbidFields {
		cond = append(cond, Eq{tableName + "." + mbidField: mbid})
	}
	return Or(cond)
}

func fullTextExpr(tableName string, s string) Sqlizer {
	q := str.SanitizeStrings(s)
	if q == "" {
		return nil
	}

	// Create both exact phrase search and individual word search
	var conditions []Sqlizer

	// 1. Exact phrase search (for "song name" queries)
	conditions = append(conditions, Like{tableName + ".full_text": "%" + q + "%"})

	// 2. Individual word search (for "song" queries)
	var sep string
	if !conf.Server.SearchFullString {
		sep = " "
	}
	parts := strings.Split(q, " ")
	if len(parts) > 1 {
		// For multi-word queries, ensure all words are present
		filters := And{}
		for _, part := range parts {
			filters = append(filters, Like{tableName + ".full_text": "%" + sep + part + "%"})
		}
		conditions = append(conditions, filters)
	} else {
		// For single word queries, search without separator requirement
		conditions = append(conditions, Like{tableName + ".full_text": "%" + parts[0] + "%"})
	}

	return Or(conditions)
}

// enhancedSearchExpr provides more flexible search across specific fields
// It supports both original text and transliterated text for Cyrillic/Turkish input
func enhancedSearchExpr(tableName string, s string, searchFields []string) Sqlizer {
	q := str.SanitizeStrings(s)
	if q == "" {
		return nil
	}

	var conditions []Sqlizer

	// Original query (case-insensitive)
	qLower := strings.ToLower(strings.TrimSpace(s))

	// Search in each specified field
	for _, field := range searchFields {
		fieldName := tableName + "." + field

		// 1. Exact phrase match (sanitized - this is already transliterated by SanitizeStrings)
		// This will match: "Сейран" -> "seyran" in full_text
		conditions = append(conditions, Like{fieldName: "%" + q + "%"})

		// 2. Exact phrase match (original case-insensitive - for direct field search)
		// This will match: "сейран" in database if stored as is
		if qLower != q {
			conditions = append(conditions, Expr("LOWER("+fieldName+") LIKE ?", "%"+qLower+"%"))
		}

		// 3. Individual word matches (sanitized)
		// This will match each word after transliteration
		parts := strings.Fields(q)
		for _, part := range parts {
			if len(part) > 1 { // Skip single characters
				conditions = append(conditions, Like{fieldName: "%" + part + "%"})
			}
		}

		// 4. Individual word matches (original case-insensitive)
		// This will match each word as typed by user
		partsOriginal := strings.Fields(qLower)
		for _, part := range partsOriginal {
			if len(part) > 1 && !containsString(parts, part) { // Skip if already in sanitized parts
				conditions = append(conditions, Expr("LOWER("+fieldName+") LIKE ?", "%"+part+"%"))
			}
		}
	}

	return Or(conditions)
}

// containsString checks if a string exists in a slice
func containsString(slice []string, s string) bool {
	for _, item := range slice {
		if item == s {
			return true
		}
	}
	return false
}
