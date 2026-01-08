#!/usr/bin/env node
/**
 * Deduplicate tracks by comparing new downloads with existing library
 * Uses cyr2lat transliteration for normalization
 */

const fs = require('fs');
const path = require('path');

// Load transliteration rules
const cyr2latPath = path.join(__dirname, '..', 'transliteration', 'cyr2lat.js');
const cyr2latContent = fs.readFileSync(cyr2latPath, 'utf8');

// Extract the array from the file
const match = cyr2latContent.match(/var cyr2lat = \(\[[\s\S]*?\]\);?/);
if (!match) {
    console.error('Failed to parse cyr2lat.js');
    process.exit(1);
}

// Evaluate the regex array (safe since it's our own file)
let cyr2lat;
try {
    cyr2lat = eval(match[0].replace('var cyr2lat = (', '('));
} catch (e) {
    console.error('Failed to evaluate cyr2lat rules:', e.message);
    process.exit(1);
}

/**
 * Apply cyr2lat transliteration
 */
function transliterate(text) {
    if (!text) return '';
    let result = ' ' + text + ' ';
    for (const [regex, replacement] of cyr2lat) {
        result = result.replace(regex, replacement);
    }
    return result.substring(1, result.length - 1);
}

/**
 * Normalize text for comparison
 * - Transliterate cyr->lat
 * - Lowercase
 * - Remove special characters
 * - Collapse whitespace
 */
function normalize(text) {
    if (!text) return '';

    // First transliterate
    let result = transliterate(text);

    // Lowercase
    result = result.toLowerCase();

    // Remove punctuation and special chars (keep letters and spaces)
    result = result.replace(/[^\p{L}\p{N}\s]/gu, ' ');

    // Collapse whitespace
    result = result.replace(/\s+/g, ' ').trim();

    return result;
}

/**
 * Extract artist and title from filename
 * Format: "Artist - Title.mp3"
 */
function parseFilename(filename) {
    const base = path.basename(filename, '.mp3');
    const parts = base.split(' - ');

    if (parts.length >= 2) {
        return {
            artist: parts[0].trim(),
            title: parts.slice(1).join(' - ').trim()
        };
    }

    return { artist: '', title: base };
}

/**
 * Get all MP3 files from a directory recursively
 */
function getMP3Files(dir) {
    const files = [];

    if (!fs.existsSync(dir)) return files;

    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
            files.push(...getMP3Files(fullPath));
        } else if (entry.name.endsWith('.mp3')) {
            files.push(fullPath);
        }
    }

    return files;
}

/**
 * Build index of existing tracks
 */
function buildExistingIndex(libraryDir) {
    const index = new Map();
    const files = getMP3Files(libraryDir);

    console.log(`📚 Indexing ${files.length} existing tracks...`);

    for (const file of files) {
        const { artist, title } = parseFilename(file);
        const normalizedTitle = normalize(title);
        const normalizedArtist = normalize(artist);

        // Create key from normalized title (main matching)
        if (normalizedTitle) {
            if (!index.has(normalizedTitle)) {
                index.set(normalizedTitle, []);
            }
            index.get(normalizedTitle).push({
                file,
                artist: normalizedArtist,
                originalArtist: artist,
                originalTitle: title
            });
        }
    }

    return index;
}

/**
 * Check if track is duplicate
 */
function isDuplicate(newTrack, existingIndex) {
    const normalizedTitle = normalize(newTrack.title);

    if (!existingIndex.has(normalizedTitle)) {
        return { isDupe: false };
    }

    const candidates = existingIndex.get(normalizedTitle);
    const normalizedArtist = normalize(newTrack.artist);

    // Check if any existing track has similar artist
    for (const existing of candidates) {
        // Check if artists overlap (one contains the other or fuzzy match)
        if (artistsMatch(normalizedArtist, existing.artist)) {
            return {
                isDupe: true,
                existingFile: existing.file,
                existingArtist: existing.originalArtist,
                existingTitle: existing.originalTitle
            };
        }
    }

    // Title matches but artist doesn't - could be different song
    return {
        isDupe: false,
        potentialMatches: candidates.map(c => ({
            file: c.file,
            artist: c.originalArtist
        }))
    };
}

/**
 * Check if two artist strings match
 */
function artistsMatch(a1, a2) {
    if (!a1 || !a2) return false;

    // Exact match
    if (a1 === a2) return true;

    // One contains the other
    if (a1.includes(a2) || a2.includes(a1)) return true;

    // Check word overlap
    const words1 = new Set(a1.split(' ').filter(w => w.length > 2));
    const words2 = new Set(a2.split(' ').filter(w => w.length > 2));

    let overlap = 0;
    for (const w of words1) {
        if (words2.has(w)) overlap++;
    }

    // If more than half of words match
    const minSize = Math.min(words1.size, words2.size);
    if (minSize > 0 && overlap >= minSize * 0.5) return true;

    return false;
}

// Configuration
const DOWNLOADS_DIR = path.join(__dirname, 'downloads');
const LIBRARY_DIR = '/Volumes/T9/MyOneDrive/Media/Music/Музыка/QirimTatar';
const UPLOAD_DIR = path.join(__dirname, 'Upload');

console.log('=' .repeat(70));
console.log('TRACK DEDUPLICATION');
console.log('=' .repeat(70));

// Build index of existing library
const existingIndex = buildExistingIndex(LIBRARY_DIR);
console.log(`📊 Indexed ${existingIndex.size} unique title patterns\n`);

// Get new downloads
const newFiles = getMP3Files(DOWNLOADS_DIR);
console.log(`📥 Found ${newFiles.length} new downloads\n`);

// Compare and classify
const unique = [];
const duplicates = [];
const uncertain = [];

for (const file of newFiles) {
    const { artist, title } = parseFilename(file);
    const artistFolder = path.basename(path.dirname(file));

    const result = isDuplicate({ artist, title }, existingIndex);

    if (result.isDupe) {
        duplicates.push({
            file,
            artist,
            title,
            artistFolder,
            existingFile: result.existingFile,
            existingArtist: result.existingArtist
        });
    } else if (result.potentialMatches && result.potentialMatches.length > 0) {
        uncertain.push({
            file,
            artist,
            title,
            artistFolder,
            potentialMatches: result.potentialMatches
        });
    } else {
        unique.push({
            file,
            artist,
            title,
            artistFolder
        });
    }
}

// Report
console.log('-'.repeat(70));
console.log('RESULTS');
console.log('-'.repeat(70));

console.log(`\n✅ UNIQUE (${unique.length} tracks):`);
for (const t of unique) {
    console.log(`   ${t.artistFolder}/${t.artist} - ${t.title}`);
}

console.log(`\n❌ DUPLICATES (${duplicates.length} tracks):`);
for (const t of duplicates) {
    console.log(`   ${t.artist} - ${t.title}`);
    console.log(`      → exists: ${path.basename(t.existingFile)}`);
}

if (uncertain.length > 0) {
    console.log(`\n⚠️  UNCERTAIN (${uncertain.length} tracks - same title, different artist):`);
    for (const t of uncertain) {
        console.log(`   ${t.artist} - ${t.title}`);
        for (const m of t.potentialMatches) {
            console.log(`      ? similar: ${m.artist}`);
        }
    }
}

// Move unique tracks to Upload folder
console.log('\n' + '-'.repeat(70));
console.log('MOVING UNIQUE TRACKS TO UPLOAD');
console.log('-'.repeat(70));

if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const movedArtists = new Set();

for (const track of unique) {
    const artistUploadDir = path.join(UPLOAD_DIR, track.artistFolder);

    if (!fs.existsSync(artistUploadDir)) {
        fs.mkdirSync(artistUploadDir, { recursive: true });
    }

    const destFile = path.join(artistUploadDir, path.basename(track.file));

    try {
        fs.copyFileSync(track.file, destFile);
        console.log(`✓ ${track.artistFolder}/${path.basename(track.file)}`);
        movedArtists.add(track.artistFolder);
    } catch (e) {
        console.log(`✗ Error: ${e.message}`);
    }
}

// Also move uncertain tracks (for manual review)
if (uncertain.length > 0) {
    const uncertainDir = path.join(UPLOAD_DIR, '_UNCERTAIN');
    if (!fs.existsSync(uncertainDir)) {
        fs.mkdirSync(uncertainDir, { recursive: true });
    }

    console.log(`\n⚠️  Moving uncertain tracks to _UNCERTAIN folder:`);

    for (const track of uncertain) {
        const destFile = path.join(uncertainDir, path.basename(track.file));
        try {
            fs.copyFileSync(track.file, destFile);
            console.log(`   ${path.basename(track.file)}`);
        } catch (e) {
            console.log(`   ✗ Error: ${e.message}`);
        }
    }
}

console.log('\n' + '='.repeat(70));
console.log('SUMMARY');
console.log('='.repeat(70));
console.log(`✅ Unique tracks moved to Upload: ${unique.length}`);
console.log(`❌ Duplicates skipped: ${duplicates.length}`);
console.log(`⚠️  Uncertain (in _UNCERTAIN): ${uncertain.length}`);
console.log(`\n📁 Upload folder: ${UPLOAD_DIR}`);
console.log(`\nArtists with new tracks: ${[...movedArtists].join(', ')}`);

// Save report as JSON
const report = {
    timestamp: new Date().toISOString(),
    unique: unique.map(t => ({ ...t, file: path.relative(__dirname, t.file) })),
    duplicates: duplicates.map(t => ({ ...t, file: path.relative(__dirname, t.file) })),
    uncertain: uncertain.map(t => ({ ...t, file: path.relative(__dirname, t.file) })),
    artists: [...movedArtists]
};

fs.writeFileSync(
    path.join(__dirname, 'dedup_report.json'),
    JSON.stringify(report, null, 2)
);

console.log(`\n📋 Report saved to: dedup_report.json`);
