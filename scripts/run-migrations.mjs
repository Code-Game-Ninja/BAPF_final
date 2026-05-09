/**
 * run-migrations.mjs
 * ─────────────────────────────────────────────────────────────
 * Runs all 4 phase SQL migrations against your Supabase database.
 *
 * Usage:
 *   node scripts/run-migrations.mjs              # run all phases
 *   node scripts/run-migrations.mjs --phase 1    # run only phase 1
 *   node scripts/run-migrations.mjs --phase 1,2  # run phases 1 and 2
 *
 * Prerequisites:
 *   npm install pg dotenv   (or: node --env-file=.env.local ...)
 *
 * Environment variables needed (from .env.local):
 *   DATABASE_URL  — postgres connection string
 *   OR
 *   NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 */

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Load env ─────────────────────────────────────────────────
function loadEnv() {
  try {
    const envFile = readFileSync(join(__dirname, "../.env.local"), "utf8");
    for (const line of envFile.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    // .env.local not found — rely on process.env
  }
}

loadEnv();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("❌  Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  console.error("    Add them to .env.local and retry.");
  process.exit(1);
}

// ── Parse --phase argument ────────────────────────────────────
const args = process.argv.slice(2);
const phaseArg = args[args.indexOf("--phase") + 1];
const requestedPhases = phaseArg
  ? phaseArg.split(",").map(Number)
  : [1, 2, 3, 4];

const PHASE_FILES = {
  1: "migrate-phase-1.sql",
  2: "migrate-phase-2.sql",
  3: "migrate-phase-3.sql",
  4: "migrate-phase-4.sql",
};

// ── Execute via Supabase REST (rpc exec_sql) ──────────────────
// Supabase doesn't expose raw SQL via JS client directly,
// so we use the pg driver if DATABASE_URL is set,
// otherwise we print instructions.

async function runWithPg(sql, phase) {
  const { default: pg } = await import("pg");
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    console.log(`  Executing SQL...`);
    await client.query(sql);
    console.log(`  ✅  Phase ${phase} complete`);
  } finally {
    await client.end();
  }
}

async function runPhase(phase) {
  const fileName = PHASE_FILES[phase];
  const filePath = join(__dirname, fileName);

  let sql;
  try {
    sql = readFileSync(filePath, "utf8");
  } catch {
    console.error(`  ❌  File not found: ${filePath}`);
    return false;
  }

  console.log(`\n${"─".repeat(60)}`);
  console.log(`🚀  Running Phase ${phase}: ${fileName}`);
  console.log(`${"─".repeat(60)}`);

  if (process.env.DATABASE_URL) {
    try {
      await runWithPg(sql, phase);
      return true;
    } catch (err) {
      console.error(`  ❌  Phase ${phase} failed:`, err.message);
      return false;
    }
  } else {
    // No DATABASE_URL — print the SQL for manual execution
    console.log(`\n⚠️   DATABASE_URL not set.`);
    console.log(`    Copy and run the following SQL in your Supabase SQL Editor:\n`);
    console.log(`    File: scripts/${fileName}`);
    console.log(`\n    Or set DATABASE_URL in .env.local and re-run this script.`);
    console.log(`    Format: postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres`);
    return false;
  }
}

// ── Main ─────────────────────────────────────────────────────
async function main() {
  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║     BP & AF Insurance CRM — Database Migration Runner    ║");
  console.log("╚══════════════════════════════════════════════════════════╝");
  console.log(`\nTarget: ${SUPABASE_URL}`);
  console.log(`Phases: ${requestedPhases.join(", ")}`);

  let allPassed = true;
  for (const phase of requestedPhases) {
    if (!PHASE_FILES[phase]) {
      console.error(`\n❌  Unknown phase: ${phase}`);
      allPassed = false;
      continue;
    }
    const ok = await runPhase(phase);
    if (!ok) allPassed = false;
  }

  console.log(`\n${"═".repeat(60)}`);
  if (allPassed) {
    console.log("✅  All migrations completed successfully!");
    console.log("\nNext steps:");
    console.log("  1. Verify tables in Supabase Dashboard → Table Editor");
    console.log("  2. Enable pg_cron extension if not already enabled:");
    console.log("     Dashboard → Database → Extensions → pg_cron → Enable");
    console.log("  3. Start your dev server: npm run dev");
  } else {
    console.log("⚠️   Some migrations need manual attention.");
    console.log("    Run the .sql files directly in Supabase SQL Editor.");
    console.log("    Files are in: scripts/migrate-phase-*.sql");
  }
  console.log(`${"═".repeat(60)}\n`);
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
