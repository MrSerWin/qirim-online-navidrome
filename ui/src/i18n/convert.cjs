#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Flatten nested JSON object to dot notation
function flattenJSON(obj, prefix = '') {
  const result = [];

  for (const key in obj) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      // Check if it's an empty object
      if (Object.keys(obj[key]).length === 0) {
        result.push({ key: fullKey, value: '__EMPTY_OBJECT__' });
      } else {
        result.push(...flattenJSON(obj[key], fullKey));
      }
    } else {
      result.push({ key: fullKey, value: obj[key] });
    }
  }

  return result;
}

// Unflatten dot notation to nested JSON object
function unflattenJSON(flatArray) {
  const result = {};

  flatArray.forEach(({ key, value }) => {
    const keys = key.split('.');
    let current = result;

    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
    }

    // Restore empty objects
    current[keys[keys.length - 1]] = value === '__EMPTY_OBJECT__' ? {} : value;
  });

  return result;
}

// Convert JSON to CSV
function jsonToCSV(jsonPath, csvPath) {
  const jsonContent = fs.readFileSync(jsonPath, 'utf8');
  const jsonData = JSON.parse(jsonContent);
  const flatData = flattenJSON(jsonData);

  // Create CSV content
  let csvContent = 'key,value\n';
  flatData.forEach(({ key, value }) => {
    // Always quote values and escape quotes with double quotes (CSV standard)
    const escapedValue = String(value).replace(/"/g, '""');
    csvContent += `${key},"${escapedValue}"\n`;
  });

  fs.writeFileSync(csvPath, csvContent, 'utf8');
  console.log(`✓ Converted ${jsonPath} to ${csvPath}`);
}

// Convert CSV to JSON
function csvToJSON(csvPath, jsonPath) {
  const csvContent = fs.readFileSync(csvPath, 'utf8');

  // Proper CSV parser that handles multi-line quoted values
  const flatData = [];
  let currentKey = '';
  let currentValue = '';
  let insideQuotes = false;
  let afterComma = false;

  const lines = csvContent.split('\n');

  // Skip header
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];

    if (!line.trim()) continue;

    if (!insideQuotes) {
      // Start of a new entry
      const commaIndex = line.indexOf(',');
      if (commaIndex === -1) continue;

      currentKey = line.substring(0, commaIndex);
      const rest = line.substring(commaIndex + 1);

      if (rest.startsWith('"')) {
        insideQuotes = true;
        currentValue = rest.substring(1);

        // Check if quote closes on same line
        const endQuoteIndex = currentValue.lastIndexOf('"');
        if (endQuoteIndex !== -1 && endQuoteIndex === currentValue.length - 1) {
          // Quote closes on same line
          currentValue = currentValue.substring(0, endQuoteIndex).replace(/""/g, '"');
          flatData.push({ key: currentKey, value: currentValue });
          currentKey = '';
          currentValue = '';
          insideQuotes = false;
        }
      } else {
        // Value is not quoted
        flatData.push({ key: currentKey, value: rest });
        currentKey = '';
      }
    } else {
      // Inside a multi-line quoted value
      const endQuoteIndex = line.lastIndexOf('"');
      if (endQuoteIndex !== -1 && endQuoteIndex === line.length - 1) {
        // This line ends the quote
        currentValue += '\n' + line.substring(0, endQuoteIndex);
        currentValue = currentValue.replace(/""/g, '"');
        flatData.push({ key: currentKey, value: currentValue });
        currentKey = '';
        currentValue = '';
        insideQuotes = false;
      } else {
        // Quote continues
        currentValue += '\n' + line;
      }
    }
  }

  const jsonData = unflattenJSON(flatData);

  // Write with 2-space indentation to match original format
  fs.writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2) + '\n', 'utf8');
  console.log(`✓ Converted ${csvPath} to ${jsonPath}`);
}

// Main
const args = process.argv.slice(2);
const command = args[0];
const inputFile = args[1];

if (!command || !inputFile) {
  console.log(`
Usage:
  node convert.js to-csv <json-file>     Convert JSON to CSV
  node convert.js to-json <csv-file>     Convert CSV to JSON

Examples:
  node convert.js to-csv en.json         Creates en.csv
  node convert.js to-json en.csv         Creates en.json
  `);
  process.exit(1);
}

const inputPath = path.resolve(inputFile);
const ext = path.extname(inputFile);
const baseName = path.basename(inputFile, ext);
const dirName = path.dirname(inputPath);

try {
  if (command === 'to-csv') {
    const outputPath = path.join(dirName, `${baseName}.csv`);
    jsonToCSV(inputPath, outputPath);
  } else if (command === 'to-json') {
    const outputPath = path.join(dirName, `${baseName}.json`);
    csvToJSON(inputPath, outputPath);
  } else {
    console.error(`Unknown command: ${command}`);
    process.exit(1);
  }
} catch (error) {
  console.error('Error:', error.message);
  process.exit(1);
}
