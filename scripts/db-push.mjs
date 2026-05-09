/**
 * BP & AF — Database setup script
 * Runs migration SQL + seed SQL directly against the Supabase Postgres DB.
 *
 * Usage:  npm run db:push
 */

import { readFileSync, readdirSync } from "fs";
import { createInterface } from "readline";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import pg from "pg";

const { Client } = pg;
const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

function loadEnv() {
  try {
    const lines = readFileSync(join(ROOT, ".env.local"), "utf8").split("\n");
    for (const line of lines) {
      const clean = line.trim();
      if (!clean || clean.startsWith("#")) continue;
      const eq = clean.indexOf("=");
      if (eq === -1) continue;
      const k = clean.slice(0, eq).trim();
      const v = clean.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
      if (!process.env[k]) process.env[k] = v;
    }
  } catch {}
}
loadEnv();

function getProjectRef() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const m = url.match(/https:\/\/([^.]+)\.supabase\.co/);
  return m ? m[1] : null;
}

function parsePassword(raw) {
  if (!raw) return null;
  const m = raw.match(/^postgresql:\/\/[^:]+:(.+)@[^@]+:\d+\//);
  if (m) {
    const extracted = m[1].replace(/^\[|\]$/g, "");
    try { return decodeURIComponent(extracted); } catch { return extracted; }
  }
  return raw;
}

function stripLineComments(sql) {
  let result = "";
  let inDollar = false;
  let tag = "";
  let i = 0;
  while (i < sql.length) {
    if (!inDollar) {
      const dm = sql.slice(i).match(/^(\$[^$]*\$)/);
      if (dm) { inDollar = true; tag = dm[1]; result += tag; i += tag.length; continue; }
      if (sql[i] === "-" && sql[i+1] === "-") {
        while (i < sql.length && sql[i] !== "\n") i++;
        continue;
      }
    } else {
      if (sql.slice(i).startsWith(tag)) { inDollar = false; result += tag; i += tag.length; continue; }
    }
    result += sql[i]; i++;
  }
  return result;
}

function splitSQL(sql) {
  const cleaned = stripLineComments(sql);
  const stmts = [];
  let cur = "";
  let inDollar = false;
  let tag = "";
  let i = 0;
  while (i < cleaned.length) {
    if (!inDollar) {
      const m = cleaned.slice(i).match(/^(\$[^$]*\$)/);
      if (m) { inDollar = true; tag = m[1]; cur += tag; i += tag.length; continue; }
    } else {
      if (cleaned.slice(i).startsWith(tag)) { inDollar = false; cur += tag; i += tag.length; continue; }
    }
    const ch = cleaned[i];
    if (ch === ";" && !inDollar) {
      const t = cur.trim();
      if (t && t !== ";") stmts.push(t);
      cur = "";
    } else { cur += ch; }
    i++;
  }
  const t = cur.trim();
  if (t) stmts.push(t);
  return stmts.filter(s => s.trim().length > 1);
}

async function runStatements(client, stmts, label) {
  let applied = 0, skipped = 0, fatalErrors = 0;
  for (let i = 0; i < stmts.length; i++) {
    const stmt = stmts[i];
    const preview = stmt.replace(/\s+/g, " ").substring(0, 70);
    try {
      await client.query(stmt);
      applied++;
      process.stdout.write(`\r   [${i+1}/${stmts.length}] Applied   `);
    } catch (err) {
      const isExisting = err.message.includes("already exists") || err.message.includes("duplicate") ||
        ["42710","42P07","42723","23505"].includes(err.code);
      if (isExisting) {
        skipped++;
        process.stdout.write(`\r   [${i+1}/${stmts.length}] (skipped existing)`);
      } else {
        fatalErrors++;
        console.error(`\n\n ERROR ${label} stmt ${i+1}: ${err.message}`);
        console.error(`   SQL: ${preview}...`);
      }
    }
  }
  console.log(`\n\n ${label} complete: ${applied} applied, ${skipped} skipped, ${fatalErrors} errors\n`);
  return fatalErrors;
}

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  if (!supabaseUrl) { console.error("NEXT_PUBLIC_SUPABASE_URL not set"); process.exit(1); }

  const ref = getProjectRef(); // null for local
  const isLocal = !ref; // true when URL is localhost / not *.supabase.co

  let rawValue = process.env.SUPABASE_DB_PASSWORD;
  if (!rawValue) {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    rawValue = await new Promise(res => { rl.question("Enter DB Password: ", ans => { rl.close(); res(ans.trim()); }); });
  }

  const password = parsePassword(rawValue);
  if (!password) { console.error("No password provided"); process.exit(1); }

  let connStr, clientOpts;
  if (isLocal) {
    // Local Supabase Docker: Postgres on localhost:5432 (or custom DB_PORT)
    const dbHost = process.env.DB_HOST || "localhost";
    const dbPort = process.env.DB_PORT || "5432";
    const dbUser = process.env.DB_USER || "postgres";
    connStr = `postgresql://${dbUser}:${encodeURIComponent(password)}@${dbHost}:${dbPort}/postgres`;
    clientOpts = { connectionString: connStr, connectionTimeoutMillis: 15000 };
  } else {
    // Supabase Cloud
    connStr = `postgresql://postgres:${encodeURIComponent(password)}@db.${ref}.supabase.co:5432/postgres`;
    const rejectUnauthorized = process.env.DB_REJECT_UNAUTHORIZED === "true";
    clientOpts = { connectionString: connStr, ssl: { rejectUnauthorized }, connectionTimeoutMillis: 15000 };
  }

  const client = new Client(clientOpts);
  const displayHost = isLocal ? `localhost` : `db.${ref}.supabase.co`;

  try {
    console.log(`\nConnecting to ${displayHost}...`);
    await client.connect();
    console.log("Connected\n");
  } catch (err) {
    console.error(`Connection failed: ${err.message}`);
    process.exit(1);
  }

  let totalFatalErrors = 0;

  // ── Run ALL migrations in order ──────────────────────────────
  const migrationsDir = join(ROOT, "supabase/migrations");
  const migrationFiles = readdirSync(migrationsDir)
    .filter(f => f.endsWith(".sql"))
    .sort(); // alphabetical sort ensures 001, 002, ..., 012 order

  console.log(`Step 1/2 - Running ${migrationFiles.length} schema migrations...\n`);

  for (let m = 0; m < migrationFiles.length; m++) {
    const file = migrationFiles[m];
    console.log(`  [${m + 1}/${migrationFiles.length}] ${file}`);
    const migSQL = readFileSync(join(migrationsDir, file), "utf8");
    const migStmts = splitSQL(migSQL);
    console.log(`   Found ${migStmts.length} statements`);
    totalFatalErrors += await runStatements(client, migStmts, file);
  }

  console.log("Step 2/2 - Running seed data...");
  const seedSQL = readFileSync(join(ROOT, "supabase/seed.sql"), "utf8");
  const seedStmts = splitSQL(seedSQL);
  console.log(`   Found ${seedStmts.length} statements\n`);
  totalFatalErrors += await runStatements(client, seedStmts, "Seed");

  console.log("Verification:");
  const checks = [
    { label: "Users",            q: "SELECT COUNT(*) FROM public.users" },
    { label: "Customers",        q: "SELECT COUNT(*) FROM customers" },
    { label: "Policies",         q: "SELECT COUNT(*) FROM policies" },
    { label: "Premiums",         q: "SELECT COUNT(*) FROM premiums" },
    { label: "Commissions",      q: "SELECT COUNT(*) FROM commissions" },
    { label: "Commission Rules", q: "SELECT COUNT(*) FROM commission_rules" },
    { label: "Notifications",    q: "SELECT COUNT(*) FROM notifications" },
    { label: "Sales Leads",      q: "SELECT COUNT(*) FROM sales_leads" },
    { label: "Lead Reminders",   q: "SELECT COUNT(*) FROM lead_reminders" },
  ];
  for (const { label, q } of checks) {
    try { const r = await client.query(q); console.log(`   ${label.padEnd(20)} ${r.rows[0].count} rows`); }
    catch (err) { console.log(`   ${label.padEnd(20)} ERROR: ${err.message}`); }
  }

  console.log("\nDatabase setup complete!\n");
  console.log("Test credentials:");
  console.log("   admin@bpaf.com      / Admin@123456    (admin)");
  console.log("   manager@bpaf.com    / Manager@123456  (manager)");
  console.log("   employee@bpaf.com   / Employee@123456 (employee)");
  console.log("\nRun: npm run dev  ->  http://localhost:3000\n");

  await client.end();

  if (totalFatalErrors > 0) {
    console.error(`\n${totalFatalErrors} fatal error(s) encountered. Exiting with code 1.\n`);
    process.exit(1);
  }
}

main().catch(err => { console.error("Fatal:", err.message); process.exit(1); });
