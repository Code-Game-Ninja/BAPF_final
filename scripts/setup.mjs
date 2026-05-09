import { execSync } from "child_process";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createInterface } from "readline";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function main() {
  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║           BP & AF Insurance Broker — Setup Wizard        ║");
  console.log("╚══════════════════════════════════════════════════════════╝\n");

  // Step 1: Check and create .env.local
  const envLocalPath = join(ROOT, ".env.local");
  const envExamplePath = join(ROOT, ".env.example");

  if (!existsSync(envLocalPath)) {
    console.log("📄 Creating .env.local from .env.example...");
    if (existsSync(envExamplePath)) {
      const exampleContent = readFileSync(envExamplePath, "utf-8");
      writeFileSync(envLocalPath, exampleContent, "utf-8");
      console.log("   ✅ Created .env.local\n");
    } else {
      console.error("   ❌ .env.example not found! Please create .env.local manually.");
      process.exit(1);
    }
  } else {
    console.log("📄 .env.local already exists. Skipping creation.\n");
  }

  // Step 2: Read current .env.local and check if Supabase URL and Password are set
  let envContent = readFileSync(envLocalPath, "utf-8");
  const hasSupabaseUrl = envContent.includes("NEXT_PUBLIC_SUPABASE_URL=") && !envContent.match(/NEXT_PUBLIC_SUPABASE_URL=\s*\n/);
  const hasServiceKey = envContent.includes("SUPABASE_SERVICE_ROLE_KEY=") && !envContent.match(/SUPABASE_SERVICE_ROLE_KEY=\s*\n/);
  
  if (!hasSupabaseUrl || !hasServiceKey) {
    console.log("⚠️ Supabase credentials are missing or incomplete in .env.local.");
    console.log("   Please provide your Supabase project details.\n");

    const url = await question("   👉 Enter NEXT_PUBLIC_SUPABASE_URL (e.g. https://xxx.supabase.co): ");
    const anonKey = await question("   👉 Enter NEXT_PUBLIC_SUPABASE_ANON_KEY: ");
    const serviceKey = await question("   👉 Enter SUPABASE_SERVICE_ROLE_KEY: ");

    // Update the env content
    envContent = envContent.replace(/NEXT_PUBLIC_SUPABASE_URL=.*/, `NEXT_PUBLIC_SUPABASE_URL=${url}`);
    envContent = envContent.replace(/NEXT_PUBLIC_SUPABASE_ANON_KEY=.*/, `NEXT_PUBLIC_SUPABASE_ANON_KEY=${anonKey}`);
    envContent = envContent.replace(/SUPABASE_SERVICE_ROLE_KEY=.*/, `SUPABASE_SERVICE_ROLE_KEY=${serviceKey}`);
    
    writeFileSync(envLocalPath, envContent, "utf-8");
    console.log("\n   ✅ Updated .env.local with Supabase credentials.\n");
  } else {
    console.log("✅ Supabase credentials found in .env.local.\n");
  }

  // Ensure SUPABASE_DB_PASSWORD is known if pushing DB (db-push will ask if missing, but we can instruct the user)
  console.log("📦 Step 3: Installing NPM dependencies...");
  try {
    execSync("npm install", { stdio: "inherit", cwd: ROOT });
    console.log("\n   ✅ Dependencies installed.\n");
  } catch (error) {
    console.error("\n   ❌ Error installing dependencies.");
    process.exit(1);
  }

  // Step 4: Push DB Schema and Seed
  console.log("🗄️  Step 4: Pushing Database Migrations and Seed Data...");
  console.log("   You may be prompted for your database password.");
  try {
    execSync("npm run db:push", { stdio: "inherit", cwd: ROOT });
    console.log("\n   ✅ Database setup and seeding complete.\n");
  } catch (error) {
    console.error("\n   ❌ Error setting up database. Please check your credentials.");
    process.exit(1);
  }

  // Step 5: Finish
  console.log("🎉 Setup complete! The project is ready to run.\n");
  console.log("   To start the development server, run:");
  console.log("   $ npm run dev\n");
  console.log("   Login with test credentials:");
  console.log("   Admin:    admin@bpaf.com      / Admin@123456");
  console.log("   Manager:  manager@bpaf.com    / Manager@123456");
  console.log("   Employee: employee@bpaf.com   / Employee@123456\n");

  rl.close();
}

main().catch((err) => {
  console.error("Fatal Error:", err);
  rl.close();
  process.exit(1);
});
