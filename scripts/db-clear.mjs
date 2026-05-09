/**
 * BP & AF — Database Clear Script
 * Clears all data from tables while preserving schema.
 *
 * Usage:  node scripts/db-clear.mjs
 */

import { readFileSync } from "fs";
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

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  if (!supabaseUrl) { console.error("NEXT_PUBLIC_SUPABASE_URL not set"); process.exit(1); }

  const ref = getProjectRef();
  const isLocal = !ref;

  let rawValue = process.env.SUPABASE_DB_PASSWORD;
  if (!rawValue) {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    rawValue = await new Promise(res => { rl.question("Enter DB Password: ", ans => { rl.close(); res(ans.trim()); }); });
  }

  const password = parsePassword(rawValue);
  if (!password) { console.error("No password provided"); process.exit(1); }

  let connStr, clientOpts;
  if (isLocal) {
    const dbHost = process.env.DB_HOST || "localhost";
    const dbPort = process.env.DB_PORT || "5432";
    const dbUser = process.env.DB_USER || "postgres";
    connStr = `postgresql://${dbUser}:${encodeURIComponent(password)}@${dbHost}:${dbPort}/postgres`;
    clientOpts = { connectionString: connStr, connectionTimeoutMillis: 15000 };
  } else {
    connStr = `postgresql://postgres:${encodeURIComponent(password)}@db.${ref}.supabase.co:5432/postgres`;
    const rejectUnauthorized = process.env.DB_REJECT_UNAUTHORIZED === "true";
    clientOpts = { connectionString: connStr, ssl: { rejectUnauthorized }, connectionTimeoutMillis: 15000 };
  }

  const client = new Client(clientOpts);
  const displayHost = isLocal ? `localhost` : `db.${ref}.supabase.co`;

  // Confirm with user
  console.log("\n⚠️  WARNING: This will DELETE ALL DATA from the database!");
  console.log("   Database:", displayHost);
  console.log("   Tables affected: All business data (users, customers, policies, etc.)");
  console.log("   Schema will be preserved.\n");

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const confirm = await new Promise(res => {
    rl.question("Type 'DELETE ALL DATA' to confirm: ", ans => { rl.close(); res(ans.trim()); });
  });

  if (confirm !== "DELETE ALL DATA") {
    console.log("\nCancelled. No data was deleted.");
    process.exit(0);
  }

  try {
    console.log(`\nConnecting to ${displayHost}...`);
    await client.connect();
    console.log("Connected\n");
  } catch (err) {
    console.error(`Connection failed: ${err.message}`);
    process.exit(1);
  }

  // Read and execute clear script
  const clearSQL = readFileSync(join(ROOT, "supabase/clear-data.sql"), "utf8");

  console.log("Clearing all data...");
  console.log("   Disabling foreign key checks...");
  await client.query("SET session_replication_role = 'replica';");

  console.log("   Truncating tables...");

  // List of tables to truncate in correct order (children first)
  const tables = [
    // Monitoring & Logs
    'api_metrics', 'error_logs', 'performance_logs', 'system_health', 'login_attempts', 'audit_logs',
    // Documents
    'claim_documents', 'lead_documents', 'kyc_documents', 'documents',
    // Timelines
    'claim_timeline', 'lead_timeline', 'proposal_timeline',
    // Transactions
    'invoice_items', 'invoices', 'ledger_entries', 'commissions', 'premiums', 'endorsements',
    // Core Business
    'validity_registry', 'archives', 'policy_verification_logs', 'claims', 'proposals', 'sales_leads',
    'business_cases', 'renewals', 'policies',
    // Customer
    'customer_family_members', 'customer_portal_users', 'customers',
    // System
    'communication_logs', 'communication_templates', 'company_templates', 'sops', 'reports',
    'system_config', 'service_tickets', 'daily_reminders', 'lead_reminders', 'notifications',
    'counters',
    // HR
    'early_checkout_requests', 'attendance', 'holidays',
    // Campaigns & Rules
    'campaigns', 'commission_rules',
    // Users & Branches (parents)
    'users', 'branches', 'aggregations'
  ];

  let truncated = 0;
  for (const table of tables) {
    try {
      await client.query(`TRUNCATE TABLE ${table} CASCADE`);
      truncated++;
      process.stdout.write(`\r   [${truncated}/${tables.length}] ${table.padEnd(30)}`);
    } catch (err) {
      // Table might not exist, skip
      process.stdout.write(`\r   [${truncated}/${tables.length}] ${table.padEnd(30)} (skipped)`);
    }
  }

  console.log("\n\n   Re-enabling foreign key checks...");
  await client.query("SET session_replication_role = 'origin';");

  // Reset counter
  await client.query("UPDATE counters SET count = 0 WHERE id = 'customers'");

  console.log("\n✅ All data cleared successfully!\n");

  // Show verification
  console.log("Verification (should all be 0):");
  const checks = [
    { label: "Users",            q: "SELECT COUNT(*) FROM public.users" },
    { label: "Customers",        q: "SELECT COUNT(*) FROM customers" },
    { label: "Policies",         q: "SELECT COUNT(*) FROM policies" },
    { label: "Sales Leads",      q: "SELECT COUNT(*) FROM sales_leads" },
    { label: "Documents",        q: "SELECT COUNT(*) FROM documents" },
  ];
  for (const { label, q } of checks) {
    try {
      const r = await client.query(q);
      const count = r.rows[0].count;
      const status = count === '0' ? '✅' : '⚠️';
      console.log(`   ${status} ${label.padEnd(20)} ${count} rows`);
    } catch (err) {
      console.log(`   ⚠️ ${label.padEnd(20)} ERROR: ${err.message}`);
    }
  }

  console.log("\nNext steps:");
  console.log("   1. Run: npm run db:push  (to seed fresh data)");
  console.log("   2. Run: npm run dev       (to start the app)\n");

  await client.end();
}

main().catch(err => { console.error("Fatal:", err.message); process.exit(1); });
