#!/usr/bin/env node

/**
 * Translation Script using OpenAI API
 *
 * Usage:
 *   node scripts/translate.js --key YOUR_OPENAI_KEY
 *   node scripts/translate.js --key YOUR_OPENAI_KEY --add de,fr,es
 *   node scripts/translate.js --key YOUR_OPENAI_KEY --sync
 *   node scripts/translate.js --key YOUR_OPENAI_KEY --all
 *
 * Options:
 *   --key, -k     OpenAI API key (required)
 *   --add, -a     Add new languages (comma-separated)
 *   --sync, -s    Sync missing translations for existing languages
 *   --all         Translate to all supported European languages
 *   --dry-run     Show what would be translated without making changes
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Supported European languages
const EUROPEAN_LANGUAGES = {
  en: 'English',
  pl: 'Polish',
  de: 'German',
  fr: 'French',
  es: 'Spanish',
  it: 'Italian',
  pt: 'Portuguese',
  nl: 'Dutch',
  sv: 'Swedish',
  cs: 'Czech',
  ro: 'Romanian',
  hu: 'Hungarian',
  uk: 'Ukrainian',
  da: 'Danish',
  fi: 'Finnish',
  no: 'Norwegian',
  sk: 'Slovak',
  bg: 'Bulgarian',
  hr: 'Croatian',
  el: 'Greek'
};

const LOCALES_DIR = path.join(__dirname, '..', 'public', 'locales');
const SOURCE_LANG = 'en';

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    key: null,
    add: [],
    sync: false,
    all: false,
    dryRun: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--key' || arg === '-k') {
      options.key = args[++i];
    } else if (arg === '--add' || arg === '-a') {
      options.add = args[++i]?.split(',').map(l => l.trim().toLowerCase()) || [];
    } else if (arg === '--sync' || arg === '-s') {
      options.sync = true;
    } else if (arg === '--all') {
      options.all = true;
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
  }

  return options;
}

function printHelp() {
  console.log(`
Translation Script - Translate i18n files using OpenAI

Usage:
  node scripts/translate.js [options]

Options:
  --key, -k <key>    OpenAI API key (required)
  --add, -a <langs>  Add new languages (comma-separated codes)
  --sync, -s         Sync missing translations for existing languages
  --all              Add all supported European languages
  --dry-run          Preview changes without writing files
  --help, -h         Show this help message

Supported European Languages:
${Object.entries(EUROPEAN_LANGUAGES).map(([code, name]) => `  ${code} - ${name}`).join('\n')}

Examples:
  # Sync missing translations for existing languages
  node scripts/translate.js --key sk-xxx --sync

  # Add German, French, Spanish translations
  node scripts/translate.js --key sk-xxx --add de,fr,es

  # Add all European languages
  node scripts/translate.js --key sk-xxx --all

  # Preview what would be translated
  node scripts/translate.js --key sk-xxx --sync --dry-run
`);
}

// Get all namespace files from source language
function getNamespaces() {
  const sourceDir = path.join(LOCALES_DIR, SOURCE_LANG);
  if (!fs.existsSync(sourceDir)) {
    throw new Error(`Source language directory not found: ${sourceDir}`);
  }

  return fs.readdirSync(sourceDir)
    .filter(f => f.endsWith('.json'))
    .map(f => f.replace('.json', ''));
}

// Get existing language directories
function getExistingLanguages() {
  if (!fs.existsSync(LOCALES_DIR)) {
    return [];
  }
  return fs.readdirSync(LOCALES_DIR)
    .filter(f => fs.statSync(path.join(LOCALES_DIR, f)).isDirectory());
}

// Read translation file
function readTranslations(lang, namespace) {
  const filePath = path.join(LOCALES_DIR, lang, `${namespace}.json`);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch (e) {
    console.error(`Error reading ${filePath}: ${e.message}`);
    return null;
  }
}

// Write translation file
function writeTranslations(lang, namespace, translations) {
  const langDir = path.join(LOCALES_DIR, lang);
  if (!fs.existsSync(langDir)) {
    fs.mkdirSync(langDir, { recursive: true });
  }

  const filePath = path.join(langDir, `${namespace}.json`);
  fs.writeFileSync(filePath, JSON.stringify(translations, null, 2) + '\n', 'utf-8');
  console.log(`  ✓ Written: ${filePath}`);
}

// Flatten nested object to dot-notation keys
function flattenObject(obj, prefix = '') {
  const result = {};

  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key;

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, flattenObject(value, newKey));
    } else {
      result[newKey] = value;
    }
  }

  return result;
}

// Unflatten dot-notation keys to nested object
function unflattenObject(obj) {
  const result = {};

  for (const [key, value] of Object.entries(obj)) {
    const keys = key.split('.');
    let current = result;

    for (let i = 0; i < keys.length - 1; i++) {
      if (!(keys[i] in current)) {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
    }

    current[keys[keys.length - 1]] = value;
  }

  return result;
}

// Check if a value looks like a translation key (e.g., "editor.characters", "login.github")
// These are placeholder values that were never properly translated
function isKeyLikeValue(value) {
  if (typeof value !== 'string') return false;
  // Pattern: word.word or word.word.word (looks like a key path)
  // But exclude real values like "e.g., main.js" or URLs
  if (value.includes(' ') || value.includes(',')) return false;
  if (value.startsWith('http') || value.startsWith('/')) return false;
  // Must have exactly format: lowercase.lowercase or camelCase.camelCase
  return /^[a-zA-Z_]+\.[a-zA-Z_]+(\.[a-zA-Z_]+)*$/.test(value);
}

// Find missing keys in target compared to source
// Also detects keys with "__MISSING__" placeholder value
// Also detects keys with key-like values (e.g., "login.github")
function findMissingKeys(source, target) {
  const flatSource = flattenObject(source);
  const flatTarget = target ? flattenObject(target) : {};

  const missing = {};

  // 1. Keys that exist in source but missing or need translation in target
  for (const [key, value] of Object.entries(flatSource)) {
    if (!(key in flatTarget)) {
      // Key doesn't exist in target
      missing[key] = value;
    } else if (flatTarget[key] === '__MISSING__') {
      // Key exists but has __MISSING__ placeholder
      missing[key] = value;
    } else if (isKeyLikeValue(flatTarget[key])) {
      // Key exists but value looks like a translation key (placeholder)
      missing[key] = value;
    }
  }

  // 2. Keys that exist ONLY in target with __MISSING__ or key-like values
  // (e.g., Polish plural forms _few, _many)
  for (const [key, value] of Object.entries(flatTarget)) {
    const needsTranslation = value === '__MISSING__' || isKeyLikeValue(value);

    if (needsTranslation && !(key in missing)) {
      // Find a related key to use as context for translation
      const baseKey = key.replace(/_(one|few|many|other|zero|two)$/, '');
      const relatedKey = Object.keys(flatSource).find(k =>
        k.startsWith(baseKey + '_') || k === baseKey
      );

      if (relatedKey && !isKeyLikeValue(flatSource[relatedKey])) {
        // Use related key's value as context
        const pluralSuffix = key.match(/_(one|few|many|other|zero|two)$/);
        if (pluralSuffix) {
          missing[key] = `[PLURAL_FORM:${pluralSuffix[1]}] ${flatSource[relatedKey]}`;
        } else {
          missing[key] = flatSource[relatedKey];
        }
      } else {
        // No good related key found, use a descriptive placeholder
        missing[key] = `[NEEDS_TRANSLATION] ${key}`;
      }
    }
  }

  return missing;
}

// Call OpenAI API for translation
async function translateWithOpenAI(apiKey, texts, targetLang, targetLangName) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a professional translator specializing in software localization. Translate the following JSON object values from English to ${targetLangName} (${targetLang}).

Rules:
1. Only translate the VALUES, keep the keys unchanged
2. Preserve any placeholders like {{variable}}, {{count}}, {count}, etc.
3. Keep technical terms, brand names, and abbreviations unchanged
4. Use natural, idiomatic language appropriate for software UI
5. Maintain the same JSON structure
6. Return ONLY valid JSON, no markdown or explanations

IMPORTANT - Plural forms:
- Values starting with [PLURAL_FORM:X] indicate plural forms needed for the target language
- For keys ending in _one: use singular form (1 item)
- For keys ending in _few: use form for 2-4 items (in Slavic languages like Polish)
- For keys ending in _many: use form for 5+ items (in Slavic languages like Polish)
- For keys ending in _other: use general plural form
- Remove the [PLURAL_FORM:X] prefix from the translated value
- Example for Polish: "Comparing {{count}} Models" ->
  - _one: "Porównywanie {{count}} modelu"
  - _few: "Porównywanie {{count}} modeli" (2-4)
  - _many: "Porównywanie {{count}} modeli" (5+)
  - _other: "Porównywanie {{count}} modeli"`
        },
        {
          role: 'user',
          content: JSON.stringify(texts, null, 2)
        }
      ],
      temperature: 0.3
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content;

  // Parse the response, handling potential markdown wrapping
  let jsonStr = content;
  if (content.includes('```')) {
    jsonStr = content.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
  }

  return JSON.parse(jsonStr);
}

// Translate missing keys for a language
async function translateMissing(apiKey, targetLang, dryRun = false) {
  const targetLangName = EUROPEAN_LANGUAGES[targetLang] || targetLang;
  console.log(`\n📝 Translating to ${targetLangName} (${targetLang})...`);

  const namespaces = getNamespaces();
  let totalMissing = 0;
  let totalTranslated = 0;

  for (const namespace of namespaces) {
    const source = readTranslations(SOURCE_LANG, namespace);
    if (!source || Object.keys(source).length === 0) {
      continue;
    }

    const target = readTranslations(targetLang, namespace);
    const missing = findMissingKeys(source, target);
    const missingCount = Object.keys(missing).length;

    if (missingCount === 0) {
      console.log(`  ○ ${namespace}.json - up to date`);
      continue;
    }

    totalMissing += missingCount;
    console.log(`  → ${namespace}.json - ${missingCount} missing keys`);

    if (dryRun) {
      console.log(`    Would translate: ${Object.keys(missing).slice(0, 3).join(', ')}${missingCount > 3 ? '...' : ''}`);
      continue;
    }

    try {
      // Translate in batches to avoid token limits
      const missingEntries = Object.entries(missing);
      const batchSize = 50;
      let translated = {};

      for (let i = 0; i < missingEntries.length; i += batchSize) {
        const batch = Object.fromEntries(missingEntries.slice(i, i + batchSize));
        const batchTranslated = await translateWithOpenAI(apiKey, batch, targetLang, targetLangName);
        translated = { ...translated, ...batchTranslated };

        if (missingEntries.length > batchSize) {
          console.log(`    Batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(missingEntries.length / batchSize)} complete`);
        }
      }

      // Merge with existing translations
      const mergedFlat = {
        ...(target ? flattenObject(target) : {}),
        ...translated
      };

      const merged = unflattenObject(mergedFlat);
      writeTranslations(targetLang, namespace, merged);
      totalTranslated += missingCount;

    } catch (error) {
      console.error(`    ✗ Error translating ${namespace}: ${error.message}`);
    }
  }

  return { missing: totalMissing, translated: totalTranslated };
}

// Main function
async function main() {
  const options = parseArgs();

  if (!options.key) {
    console.error('Error: OpenAI API key is required. Use --key or -k option.');
    console.error('Run with --help for usage information.');
    process.exit(1);
  }

  console.log('🌍 i18n Translation Script');
  console.log('==========================');

  // Determine which languages to process
  let targetLangs = [];

  if (options.all) {
    // Add all European languages except source
    targetLangs = Object.keys(EUROPEAN_LANGUAGES).filter(l => l !== SOURCE_LANG);
    console.log(`\nAdding all European languages: ${targetLangs.join(', ')}`);
  } else if (options.add.length > 0) {
    // Validate and add specified languages
    for (const lang of options.add) {
      if (!EUROPEAN_LANGUAGES[lang]) {
        console.warn(`Warning: Unknown language code "${lang}". Supported: ${Object.keys(EUROPEAN_LANGUAGES).join(', ')}`);
      } else if (lang === SOURCE_LANG) {
        console.warn(`Warning: Cannot translate to source language (${SOURCE_LANG})`);
      } else {
        targetLangs.push(lang);
      }
    }
    console.log(`\nAdding languages: ${targetLangs.map(l => `${EUROPEAN_LANGUAGES[l]} (${l})`).join(', ')}`);
  } else if (options.sync) {
    // Sync existing languages
    targetLangs = getExistingLanguages().filter(l => l !== SOURCE_LANG);
    console.log(`\nSyncing existing languages: ${targetLangs.join(', ')}`);
  } else {
    console.log('\nNo action specified. Use --sync, --add, or --all');
    console.log('Run with --help for usage information.');
    process.exit(0);
  }

  if (options.dryRun) {
    console.log('\n🔍 DRY RUN MODE - No files will be modified\n');
  }

  // Process each target language
  let totalStats = { missing: 0, translated: 0 };

  for (const lang of targetLangs) {
    const stats = await translateMissing(options.key, lang, options.dryRun);
    totalStats.missing += stats.missing;
    totalStats.translated += stats.translated;
  }

  // Summary
  console.log('\n==========================');
  console.log('📊 Summary:');
  console.log(`   Languages processed: ${targetLangs.length}`);
  console.log(`   Missing keys found: ${totalStats.missing}`);
  if (!options.dryRun) {
    console.log(`   Keys translated: ${totalStats.translated}`);
  }
  console.log('');

  // Update i18n config if new languages were added
  if (options.add.length > 0 || options.all) {
    const newLangs = targetLangs.filter(l => !getExistingLanguages().includes(l));
    if (newLangs.length > 0 && !options.dryRun) {
      console.log('📝 Don\'t forget to update src/lib/i18n.ts with new languages:');
      console.log(`   supportedLngs: ['en', 'pl', ${newLangs.map(l => `'${l}'`).join(', ')}]`);
    }
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
