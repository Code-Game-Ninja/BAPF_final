#!/usr/bin/env node
// ============================================================
// BAPF — One-Command Local Startup
// Starts:
//   1. Self-hosted Supabase (Docker) - localhost:8000
//   2. Admin Portal (Next.js) - localhost:3000
//   3. Customer Portal (Next.js) - localhost:3001
// Usage: npm run dev:local
// Works on Windows, macOS, and Linux (no bash required)
// ============================================================

const { execSync, spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

const SUPABASE_DIRS = [
  path.resolve(__dirname, "../../supabase-docker/docker"),
  path.resolve(__dirname, "../supabase-docker/docker"),
  "E:\\BAPF-WORK\\supabase-docker\\docker",
];

function log(icon, msg) {
  console.log(icon + " " + msg);
}

function exec(cmd, opts) {
  return execSync(cmd, Object.assign({ encoding: "utf-8", stdio: "pipe" }, opts)).trim();
}

function findSupabaseDir() {
  for (const dir of SUPABASE_DIRS) {
    try {
      if (fs.existsSync(path.join(dir, "docker-compose.yml"))) return dir;
    } catch {}
  }
  return null;
}

function sleep(ms) {
  return new Promise(function (r) { setTimeout(r, ms); });
}

async function main() {
  console.log("");
  console.log("==========================================");
  console.log("  BAPF Local Development — Starting...");
  console.log("==========================================");
  console.log("");

  // Step 1: Check Docker
  try {
    exec("docker info");
    log("[OK]", "Docker is running");
  } catch (e) {
    log("[ERROR]", "Docker is not running!");
    log("", "  Start Docker Desktop and try again.");
    process.exit(1);
  }

  // Step 2: Find Supabase directory
  var supabaseDir = findSupabaseDir();
  if (!supabaseDir) {
    log("[ERROR]", "Supabase Docker not found!");
    log("", "  See docs/self-hosted-supabase-setup.md for setup instructions.");
    process.exit(1);
  }

  // Step 3: Start Supabase containers if not running
  var isRunning = false;
  try {
    var status = exec('docker ps --filter "name=supabase-db" --format "{{.Status}}"');
    isRunning = status.includes("Up");
  } catch (e) {}

  if (isRunning) {
    log("[OK]", "Supabase containers already running");
  } else {
    log("[...]", "Starting Supabase Docker containers...");
    try {
      execSync("docker compose up -d", { cwd: supabaseDir, stdio: "inherit" });
    } catch (e) {
      log("[ERROR]", "Failed to start Supabase containers");
      process.exit(1);
    }

    // Wait for DB to be healthy (max 60 seconds)
    log("[...]", "Waiting for database to be healthy...");
    for (var i = 0; i < 30; i++) {
      try {
        var health = exec("docker inspect --format={{.State.Health.Status}} supabase-db");
        if (health === "healthy") break;
      } catch (e) {}
      await sleep(2000);
    }

    // Wait for Kong (API gateway)
    for (var j = 0; j < 20; j++) {
      try {
        var kongHealth = exec("docker inspect --format={{.State.Health.Status}} supabase-kong");
        if (kongHealth === "healthy") break;
      } catch (e) {}
      await sleep(2000);
    }

    log("[OK]", "Supabase containers started");
  }

  // Step 4: Quick API health check
  log("[...]", "Verifying Supabase API...");
  try {
    exec("curl -s -o /dev/null -w %{http_code} http://localhost:8000/rest/v1/");
    log("[OK]", "Supabase API responding on http://localhost:8000");
  } catch (e) {
    log("[WARN]", "Supabase API not ready yet, but starting app anyway...");
  }

  // Step 5: Print info
  console.log("");
  console.log("==========================================");
  console.log("  Services:");
  console.log("    Admin Portal:    http://localhost:3000");
  console.log("    Customer Portal: http://localhost:3001");
  console.log("    Supabase API:    http://localhost:8000");
  console.log("    Supabase Studio: http://localhost:8001");
  console.log("    DB:              localhost:5432");
  console.log("");
  console.log("  Admin Login: admin@bpaf.com / Admin@123456");
  console.log("==========================================");
  console.log("");

  // Step 6: Start both Next.js dev servers using concurrently
  log("[...]", "Starting Admin Portal and Customer Portal...");
  console.log("");

  var devAll = spawn("npm", ["run", "dev:all"], {
    cwd: path.resolve(__dirname, ".."),
    stdio: "inherit",
    shell: true,
  });

  devAll.on("close", function (code) {
    process.exit(code || 0);
  });

  // Forward signals for clean shutdown
  process.on("SIGINT", function () { devAll.kill("SIGINT"); });
  process.on("SIGTERM", function () { devAll.kill("SIGTERM"); });
}

main().catch(function (err) {
  console.error(err);
  process.exit(1);
});
