#!/usr/bin/env node
/**
 * CLI wrapper for cyr2lat transliteration
 * Usage: node transliterate_wrapper.js "text to transliterate"
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

// Read the cyr2lat.js file
const cyr2latPath = path.join(__dirname, '..', 'transliteration', 'cyr2lat.js');
let cyr2latContent = fs.readFileSync(cyr2latPath, 'utf8');

// Remove BOM if present
if (cyr2latContent.charCodeAt(0) === 0xFEFF) {
    cyr2latContent = cyr2latContent.slice(1);
}

// Create a sandbox context
const sandbox = { cyr2lat: null };
vm.createContext(sandbox);

// Execute the script in sandbox
try {
    vm.runInContext(cyr2latContent, sandbox);
} catch (e) {
    console.error('Error loading cyr2lat.js:', e.message);
    process.exit(1);
}

const cyr2lat = sandbox.cyr2lat;

if (!cyr2lat || !Array.isArray(cyr2lat)) {
    console.error('cyr2lat is not a valid array');
    process.exit(1);
}

function transliterate(text) {
    if (!text) return '';

    let str = ' ' + text + ' ';

    for (const rule of cyr2lat) {
        if (Array.isArray(rule) && rule.length >= 2) {
            str = str.replace(rule[0], rule[1]);
        }
    }

    return str.substring(1, str.length - 1);
}

// Get input from command line or stdin
const args = process.argv.slice(2);

if (args.length > 0) {
    // Input from command line argument
    const input = args.join(' ');
    console.log(transliterate(input));
} else {
    // Read from stdin
    let input = '';
    process.stdin.setEncoding('utf8');

    process.stdin.on('readable', () => {
        let chunk;
        while ((chunk = process.stdin.read()) !== null) {
            input += chunk;
        }
    });

    process.stdin.on('end', () => {
        const lines = input.trim().split('\n');
        for (const line of lines) {
            console.log(transliterate(line));
        }
    });
}
