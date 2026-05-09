import pg from "pg";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

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

async function seed() {
  const user = process.env.DB_USER || "postgres";
  const pass = process.env.SUPABASE_DB_PASSWORD;
  const host = process.env.DB_HOST || "localhost";
  const port = process.env.DB_PORT || "5432";
  
  const client = new Client({ connectionString: `postgresql://${user}:${pass}@${host}:${port}/postgres` });
  
  try {
    await client.connect();
    console.log("Connected to database");

    // 1. Branches
    console.log("Seeding Branches...");
    await client.query(`
      INSERT INTO branches (id, name, city, is_active)
      VALUES ('10000000-0000-0000-0000-000000000001', 'Delhi Corporate Office', 'New Delhi', true)
      ON CONFLICT (id) DO NOTHING
    `);

    // 2. Users
    console.log("Seeding Users...");
    await client.query(`
      INSERT INTO users (id, email, name, role, status, branch_id)
      VALUES 
        ('00000000-0000-0000-0000-000000000001', 'admin@bpaf.com', 'System Admin', 'admin', 'active', '10000000-0000-0000-0000-000000000001'),
        ('00000000-0000-0000-0000-000000000002', 'manager@bpaf.com', 'Branch Manager', 'manager', 'active', '10000000-0000-0000-0000-000000000001'),
        ('00000000-0000-0000-0000-000000000003', 'employee@bpaf.com', 'Sales Executive', 'employee', 'active', '10000000-0000-0000-0000-000000000001')
      ON CONFLICT (id) DO NOTHING
    `);

    // 3. Customers
    console.log("Seeding Customers...");
    await client.query(`
      INSERT INTO customers (id, uid, name, email, phone, city, status, customer_type, created_by)
      VALUES 
        ('c0000000-0000-0000-0000-000000000001', 'CUST-1001', 'Amit Malhotra', 'amit.m@example.com', '9810012345', 'Delhi', 'active', 'individual', '00000000-0000-0000-0000-000000000001'),
        ('c0000000-0000-0000-0000-000000000002', 'CUST-1002', 'Sunita Sharma', 'sunita.s@example.com', '9810054321', 'Mumbai', 'active', 'individual', '00000000-0000-0000-0000-000000000001')
      ON CONFLICT (id) DO NOTHING
    `);

    // 4. Policies
    console.log("Seeding Policies...");
    await client.query(`
      INSERT INTO policies (id, policy_number, policy_type, customer_id, customer_name, insurer_name, premium_amount, sum_insured, status, start_date, end_date, created_by, branch_id)
      VALUES 
        ('p0000000-0000-0000-0000-000000000001', 'POL-MOTOR-001', 'motor', 'c0000000-0000-0000-0000-000000000001', 'Amit Malhotra', 'HDFC ERGO', 15000, 500000, 'active', CURRENT_DATE - INTERVAL '3 months', CURRENT_DATE + INTERVAL '9 months', '00000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001'),
        ('p0000000-0000-0000-0000-000000000002', 'POL-HEALTH-002', 'health', 'c0000000-0000-0000-0000-000000000002', 'Sunita Sharma', 'Star Health', 25000, 1000000, 'active', CURRENT_DATE - INTERVAL '1 month', CURRENT_DATE + INTERVAL '11 months', '00000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001')
      ON CONFLICT (id) DO NOTHING
    `);

    // 5. Sales Leads
    console.log("Seeding Sales Leads...");
    await client.query(`
      INSERT INTO sales_leads (customer_name, email, mobile, status, source, assigned_to, created_by)
      VALUES 
        ('Rohan Kapoor', 'rohan.k@example.com', '9900011111', 'new', 'online', '00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001'),
        ('Suresh Iyer', 'suresh.i@example.com', '9900022222', 'contacted', 'referral', '00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001'),
        ('Pooja Bhatt', 'pooja.b@example.com', '9900033333', 'proposal_sent', 'other', '00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001')
      ON CONFLICT DO NOTHING
    `);

    // 6. Attendance
    console.log("Seeding Attendance...");
    await client.query(`
      INSERT INTO attendance (user_id, date, check_in, check_out, status, branch_id)
      VALUES 
        ('00000000-0000-0000-0000-000000000003', CURRENT_DATE, CURRENT_DATE + '09:00:00'::time, CURRENT_DATE + '18:00:00'::time, 'present', '10000000-0000-0000-0000-000000000001'),
        ('00000000-0000-0000-0000-000000000002', CURRENT_DATE, CURRENT_DATE + '09:15:00'::time, CURRENT_DATE + '18:30:00'::time, 'present', '10000000-0000-0000-0000-000000000001')
      ON CONFLICT DO NOTHING
    `);

    console.log("\n✅ Seeding complete!");
    
    // Verification
    const res = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM users) as users,
        (SELECT COUNT(*) FROM customers) as customers,
        (SELECT COUNT(*) FROM policies) as policies,
        (SELECT COUNT(*) FROM sales_leads) as leads
    `);
    console.log("Verification:", res.rows[0]);

    await client.end();
  } catch (err) {
    console.error("Seeding failed:", err.message);
    process.exit(1);
  }
}

seed();
