// Builds data/archetypes.js from 5etools source data (races + homebrew).
//
// Reads from the base URL/path configured in .env, which must point to a
// 5etools root containing:
//   homebrew/content-blocklist.json
//   homebrew/index.json
//   homebrew/*.json  (files listed in index.json)
//   data/races.json
//
// features.js and locations.js are local config files — this script never touches them.

import { readFileSync, existsSync, writeFileSync, mkdirSync } from "fs";
import { join, resolve } from "path";

const DATA_DIR = resolve(import.meta.dirname, "../data");

function loadEnv() {
  const envPath = resolve(import.meta.dirname, "../.env");
  if (!existsSync(envPath)) return {};
  const lines = readFileSync(envPath, "utf8").split("\n");
  const env = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    env[key] = val;
  }
  return env;
}

async function readJson(base, relativePath) {
  if (base.startsWith("http://") || base.startsWith("https://")) {
    const url = `${base.replace(/\/$/, "")}/${relativePath}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }
  const filePath = join(base, relativePath);
  if (!existsSync(filePath)) throw new Error(`not found: ${filePath}`);
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function processSourceFile(data, ancestries, archetypes, blocklist) {
  let sourceAbbr, shareAbbr;
  if (data._meta?.sources?.[0]) {
    sourceAbbr = data._meta.sources[0].json;
    shareAbbr = data._meta.sources[0].abbreviation;
  }

  if (data.race) {
    for (const ancestry of data.race) {
      const ancestrySource = ancestry.source || sourceAbbr;
      if (!ancestrySource) continue;

      const blocked = blocklist.some(
        (e) => e.source === ancestrySource && (e.category === "*" || e.category === "race") &&
               (e.displayName === "*" || e.displayName === undefined || e.displayName === ancestry.name)
      );
      if (blocked) continue;

      if (!ancestries.has(ancestry.name)) {
        ancestries.set(ancestry.name, {
          name: ancestry.name,
          source: ancestry.source || shareAbbr,
          archetypes: [],
        });
      }
    }
  }

  if (data.subrace) {
    for (const archetype of data.subrace) {
      const archetypeSource = archetype.source || sourceAbbr;
      if (!archetypeSource) continue;

      const parent = ancestries.get(archetype.raceName);
      if (!parent || archetypes.has(archetype.name)) continue;

      const blocked = blocklist.some(
        (e) => e.source === archetypeSource && e.category === "race" &&
               (e.displayName === archetype.name || e.displayName === "*")
      );
      if (blocked) continue;

      archetypes.set(archetype.name, archetype.raceName);
      if (!parent.archetypes.includes(archetype.name)) {
        parent.archetypes.push(archetype.name);
      }
    }
  }
}

async function buildArchetypes(base) {
  const ancestries = new Map();
  const archetypes = new Map();

  const { blocklist } = await readJson(base, "homebrew/content-blocklist.json");
  const { toImport } = await readJson(base, "homebrew/index.json");

  for (const file of toImport) {
    try {
      const data = await readJson(base, `homebrew/${file}`);
      processSourceFile(data, ancestries, archetypes, blocklist);
    } catch (err) {
      console.warn(`  [skip]   homebrew/${file} — ${err.message}`);
    }
  }

  const racesData = await readJson(base, "data/races.json");
  processSourceFile(racesData, ancestries, archetypes, blocklist);

  return { ancestries: Array.from(ancestries.values()) };
}

const env = loadEnv();

const sources = [
  { label: "local",   base: env.LOCAL_DATA_PATH  },
  { label: "network", base: env.NETWORK_DATA_URL  },
  { label: "remote",  base: env.REMOTE_DATA_URL   },
];

if (sources.every((s) => !s.base)) {
  console.error("No sources configured. Copy .env.example to .env and set at least one.");
  process.exit(1);
}

let result = null;
let usedSource = null;

for (const { label, base } of sources) {
  if (!base) continue;
  try {
    result = await buildArchetypes(base);
    usedSource = label;
    break;
  } catch (err) {
    console.warn(`  [${label}] failed — ${err.message}`);
  }
}

if (!result) {
  console.error("Could not load source data from any configured source.");
  process.exit(1);
}

mkdirSync(DATA_DIR, { recursive: true });
writeFileSync(
  join(DATA_DIR, "archetypes.js"),
  `var archetypesData = ${JSON.stringify(result, null, 2)};\n`,
  "utf8"
);
console.log(`  [${usedSource}] archetypes.js — ${result.ancestries.length} ancestries`);
