# Frontend i18n

This directory contains **only hardcoded translations** for English and Russian that are bundled with the frontend.

## Files in this directory:
- `en.json` - English translations (bundled)
- `ru.json` - Russian translations (bundled)
- `provider.js` - i18n provider that loads translations
- Other utility files

## All other languages
**All other languages** (Ukrainian, Crimean Tatar, Turkish, etc.) are loaded **dynamically from the backend** via API.

The translations for these languages are located in:
```
/resources/i18n/
```

## How it works:
1. English and Russian are bundled and loaded immediately
2. All other languages are fetched from the backend API at runtime
3. The backend serves translations from `/resources/i18n/`

## To add/edit translations:

### For English and Russian:
Edit files in this directory (`ui/src/i18n/en.json` or `ui/src/i18n/ru.json`)

### For all other languages (crh, uk, tr, etc.):
Edit files in `/resources/i18n/` directory

**DO NOT** create duplicate translation files in this directory for languages other than English and Russian!
