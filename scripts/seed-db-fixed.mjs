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
    console.log("📍 Seeding Branches...");
    await client.query(`
      INSERT INTO branches (id, name, address, city, state, pincode, phone, is_active)
      VALUES 
        ('10000000-0000-0000-0000-000000000001', 'BP & AF Corporate Headquarters', '42 Insurance Tower, MG Road', 'Mumbai', 'Maharashtra', '400001', '+91 22 1234 5678', true),
        ('10000000-0000-0000-0000-000000000002', 'BP & AF Delhi Branch', '15 Connaught Place', 'New Delhi', 'Delhi', '110001', '+91 11 2345 6789', true),
        ('10000000-0000-0000-0000-000000000003', 'BP & AF Bangalore Branch', '88 Residency Road', 'Bangalore', 'Karnataka', '560001', '+91 80 3456 7890', true)
      ON CONFLICT (id) DO NOTHING
    `);

    // 2. Users
    console.log("👥 Seeding Users...");
    await client.query(`
      INSERT INTO users (id, email, name, role, status, branch_id, phone)
      VALUES 
        ('00000000-0000-0000-0000-000000000001', 'admin@bpaf.com', 'Rajesh Kumar', 'admin', 'active', '10000000-0000-0000-0000-000000000001', '9876543210'),
        ('00000000-0000-0000-0000-000000000002', 'manager@bpaf.com', 'Priya Sharma', 'manager', 'active', '10000000-0000-0000-0000-000000000002', '9876543211'),
        ('00000000-0000-0000-0000-000000000003', 'employee@bpaf.com', 'Amit Patel', 'employee', 'active', '10000000-0000-0000-0000-000000000003', '9876543212'),
        ('00000000-0000-0000-0000-000000000004', 'bqp@bpaf.com', 'Vikram Singh', 'employee', 'active', '10000000-0000-0000-0000-000000000001', '9876543213'),
        ('00000000-0000-0000-0000-000000000005', 'posp@bpaf.com', 'Neha Gupta', 'employee', 'active', '10000000-0000-0000-0000-000000000002', '9876543214')
      ON CONFLICT (id) DO NOTHING
    `);

    // 3. Customers
    console.log("👨‍👩‍👧‍👦 Seeding Customers...");
    await client.query(`
      INSERT INTO customers (id, uid, name, email, phone, address, city, state, pincode, status, customer_type, created_by, entity_meta)
      VALUES 
        ('c0000000-0000-0000-0000-000000000001', 'CUST-1001', 'Amit Malhotra', 'amit.m@example.com', '9810012345', '123 Golf Links, New Delhi', 'New Delhi', 'Delhi', '110001', 'active', 'individual', '00000000-0000-0000-0000-000000000001', '{"dob": "1985-06-15", "pan_number": "ABCDE1234F", "gender": "male", "marital_status": "married", "annual_income": 1500000}'),
        ('c0000000-0000-0000-0000-000000000002', 'CUST-1002', 'Sunita Sharma', 'sunita.s@example.com', '9810054321', '456 Marine Drive, Mumbai', 'Mumbai', 'Maharashtra', '400001', 'active', 'individual', '00000000-0000-0000-0000-000000000002', '{"dob": "1990-03-22", "pan_number": "FGHIJ5678K", "gender": "female", "marital_status": "single", "annual_income": 1200000}'),
        ('c0000000-0000-0000-0000-000000000003', 'CUST-1003', 'TechCorp Solutions Pvt Ltd', 'contact@techcorp.com', '8012345678', '789 Electronic City, Bangalore', 'Bangalore', 'Karnataka', '560001', 'active', 'corporate', '00000000-0000-0000-0000-000000000003', '{"turnover": 50000000, "pan_number": "LMNOP9012R", "gst_number": "29AAAPL1234C1ZV", "industry": "IT Services"}'),
        ('c0000000-0000-0000-0000-000000000004', 'CUST-1004', 'Rahul Verma', 'rahul.v@example.com', '9810098765', '321 Park Street, Kolkata', 'Kolkata', 'West Bengal', '700001', 'active', 'individual', '00000000-0000-0000-0000-000000000001', '{"dob": "1988-11-08", "pan_number": "STUVW3456Y", "gender": "male", "marital_status": "married", "annual_income": 2000000}'),
        ('c0000000-0000-0000-0000-000000000005', 'CUST-1005', 'Global Logistics Ltd', 'info@globallog.com', '9876543210', '654 Nehru Place, New Delhi', 'New Delhi', 'Delhi', '110019', 'active', 'corporate', '00000000-0000-0000-0000-000000000002', '{"turnover": 75000000, "pan_number": "XYZAB7890C", "gst_number": "07AAAPG5678D1ZV", "industry": "Logistics"}')
      ON CONFLICT (id) DO NOTHING
    `);

    // 4. Policies - Fixed UUIDs without line breaks
    console.log("Seeding Policies...");
    const policyData1 = '00000000-0000-0000-0000-000000000004';
    const policyData2 = '00000000-0000-0000-0000-000000000005';
    
    await client.query(
      `INSERT INTO policies (id, policy_number, policy_type, customer_id, customer_name, insurer_name, premium_amount, sum_insured, status, start_date, end_date, assigned_to, created_by, branch_id)
      VALUES 
        ($1, 'POL-MOTOR-001', 'motor', 'c0000000-0000-0000-0000-000000000001', 'Amit Malhotra', 'HDFC ERGO', 15000, 500000, 'active', CURRENT_DATE - INTERVAL '3 months', CURRENT_DATE + INTERVAL '9 months', '00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001'),
        ($2, 'POL-HEALTH-002', 'health', 'c0000000-0000-0000-0000-000000000002', 'Sunita Sharma', 'Star Health', 25000, 1000000, 'active', CURRENT_DATE - INTERVAL '1 month', CURRENT_DATE + INTERVAL '11 months', '00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001')
      ON CONFLICT (id) DO NOTHING`,
      [policyData1, policyData2]
    );

    // 5. Sales Leads
    console.log("Seeding Sales Leads...");
    await client.query(`
      INSERT INTO sales_leads (lead_number, customer_name, email, mobile, status, source, assigned_to, created_by)
      VALUES 
        ('LEAD-001', 'Rohan Kapoor', 'rohan.k@example.com', '9900011111', 'new', 'online', '00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001'),
        ('LEAD-002', 'Suresh Iyer', 'suresh.i@example.com', '9900022222', 'contacted', 'referral', '00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001'),
        ('LEAD-003', 'Pooja Bhatt', 'pooja.b@example.com', '9900033333', 'proposal_sent', 'other', '00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001')
      ON CONFLICT (lead_number) DO NOTHING
    `);

    // 6. Premiums
    console.log("💰 Seeding Premiums...");
    await client.query(`
      INSERT INTO premiums (id, policy_id, policy_number, customer_id, customer_name, amount, status, due_date, collected_at, collected_by)
      VALUES 
        ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000004', 'POL-MOTOR-001', 'c0000000-0000-0000-0000-000000000001', 'Amit Malhotra', 15000, 'collected', CURRENT_DATE - INTERVAL '5 months', CURRENT_DATE - INTERVAL '5 months', '00000000-0000-0000-0000-000000000003'),
        ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000005', 'POL-HEALTH-002', 'c0000000-0000-0000-0000-000000000002', 'Sunita Sharma', 25000, 'collected', CURRENT_DATE - INTERVAL '3 months', CURRENT_DATE - INTERVAL '3 months', '00000000-0000-0000-0000-000000000003')
      ON CONFLICT (id) DO NOTHING
    `);

    // 7. Commissions
    console.log("📊 Seeding Commissions...");
    await client.query(`
      INSERT INTO commissions (id, policy_id, policy_number, user_id, user_name, amount, commission_type, status, created_at)
      VALUES 
        ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000004', 'POL-MOTOR-001', '00000000-0000-0000-0000-000000000003', 'Amit Patel', 1500, 'percentage', 'paid', CURRENT_DATE - INTERVAL '5 months'),
        ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000005', 'POL-HEALTH-002', '00000000-0000-0000-0000-000000000003', 'Amit Patel', 2500, 'percentage', 'approved', CURRENT_DATE - INTERVAL '3 months')
      ON CONFLICT (id) DO NOTHING
    `);

    // 8. Renewals
    console.log("🔄 Seeding Renewals...");
    await client.query(`
      INSERT INTO renewals (id, policy_id, policy_number, customer_id, customer_name, status, due_date, proposed_premium, assigned_to)
      VALUES 
        ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000004', 'POL-MOTOR-001', 'c0000000-0000-0000-0000-000000000001', 'Amit Malhotra', 'due', CURRENT_DATE + INTERVAL '1 month', 16000, '00000000-0000-0000-0000-000000000003')
      ON CONFLICT (id) DO NOTHING
    `);

    // 9. Claims
    console.log("🚑 Seeding Claims...");
    await client.query(`
      INSERT INTO claims (id, claim_number, policy_id, policy_number, customer_id, customer_name, claim_type, claim_category, estimated_amount, status, claim_date, created_at, assigned_to, branch_id)
      VALUES 
        ('00000000-0000-0000-0000-000000000001', 'CLM-2024-001', '00000000-0000-0000-0000-000000000004', 'POL-MOTOR-001', 'c0000000-0000-0000-0000-000000000001', 'Amit Malhotra', 'motor', 'accident', 200000, 'processing', CURRENT_DATE - INTERVAL '1 week', CURRENT_DATE - INTERVAL '1 week', '00000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001')
      ON CONFLICT (id) DO NOTHING
    `);

    // 10. Documents
    console.log("📄 Seeding Documents...");
    await client.query(`
      INSERT INTO documents (id, policy_id, customer_id, file_name, file_path, file_url, uploaded_by)
      VALUES 
        ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000001', 'Policy Document', 'policy_doc_motor.pdf', '/storage/policies/POL-MOTOR-001.pdf', 'https://example.com/storage/policies/POL-MOTOR-001.pdf', '00000000-0000-0000-0000-000000000003')
      ON CONFLICT (id) DO NOTHING
    `);

    // 11. Service Tickets
    console.log("🎫 Seeding Service Tickets...");
    await client.query(`
      INSERT INTO service_tickets (id, ticket_number, customer_id, customer_name, category, subcategory, status, description, assigned_to, created_by)
      VALUES 
        ('00000000-0000-0000-0000-000000000001', 'TKT-2024-001', 'c0000000-0000-0000-0000-000000000001', 'Amit Malhotra', 'policy', 'general_query', 'open', 'Query about policy coverage details', '00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001')
      ON CONFLICT (id) DO NOTHING
    `);

    // 12. Proposals
    console.log("📝 Seeding Proposals...");
    await client.query(`
      INSERT INTO proposals (id, proposal_number, customer_id, customer_name, customer_email, policy_type, status, premium_amount, sum_insured, assigned_to, created_by, branch_id)
      VALUES 
        ('00000000-0000-0000-0000-000000000001', 'PROP-2024-001', 'c0000000-0000-0000-0000-000000000003', 'TechCorp Solutions', 'contact@techcorp.com', 'fire', 'draft', 75000, 20000000, '00000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000003')
      ON CONFLICT (id) DO NOTHING
    `);

    // 13. Notifications
    console.log("🔔 Seeding Notifications...");
    await client.query(`
      INSERT INTO notifications (id, user_id, title, message, type, link, is_read)
      VALUES 
        ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 'Policy Expiry Reminder', 'Your motor policy POL-MOTOR-001 is due for renewal next month', 'policy_expiry', '/dashboard/policies', false),
        ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000004', 'New Lead Assigned', 'New high-priority lead assigned', 'lead_assignment', '/dashboard/sales-leads', false)
      ON CONFLICT (id) DO NOTHING
    `);

    // 14. Attendance
    console.log("⏰ Seeding Attendance...");
    await client.query(`
      INSERT INTO attendance (user_id, date, check_in, check_out, status, branch_id)
      VALUES 
        ('00000000-0000-0000-0000-000000000003', CURRENT_DATE, CURRENT_DATE + '09:00:00'::time, CURRENT_DATE + '18:00:00'::time, 'present', '10000000-0000-0000-0000-000000000003'),
        ('00000000-0000-0000-0000-000000000002', CURRENT_DATE, CURRENT_DATE + '09:15:00'::time, CURRENT_DATE + '18:30:00'::time, 'present', '10000000-0000-0000-0000-000000000002'),
        ('00000000-0000-0000-0000-000000000004', CURRENT_DATE, CURRENT_DATE + '09:15:00'::time, CURRENT_DATE + '18:00:00'::time, 'late', '10000000-0000-0000-0000-000000000001')
      ON CONFLICT DO NOTHING
    `);

    console.log("\n✅ Comprehensive seeding complete!");
    
    // Verification
    const res = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM users) as users,
        (SELECT COUNT(*) FROM customers) as customers,
        (SELECT COUNT(*) FROM policies) as policies,
        (SELECT COUNT(*) FROM sales_leads) as leads,
        (SELECT COUNT(*) FROM premiums) as premiums,
        (SELECT COUNT(*) FROM claims) as claims,
        (SELECT COUNT(*) FROM documents) as documents,
        (SELECT COUNT(*) FROM commissions) as commissions,
        (SELECT COUNT(*) FROM renewals) as renewals,
        (SELECT COUNT(*) FROM proposals) as proposals,
        (SELECT COUNT(*) FROM service_tickets) as tickets,
        (SELECT COUNT(*) FROM notifications) as notifications,
        (SELECT COUNT(*) FROM attendance) as attendance
    `);
    
    console.log("\n📊 Demo Data Summary:");
    const summary = res.rows[0];
    Object.entries(summary).forEach(([key, value]) => {
      console.log(`   ${key}: ${value}`);
    });

    console.log("\n🚀 Your BP & AF Insurance System is now ready for client demonstration!");
    console.log("📱 Login credentials:");
    console.log("   Admin: admin@bpaf.com");
    console.log("   Manager: manager@bpaf.com");
    console.log("   Employee: employee@bpaf.com");

    await client.end();
  } catch (err) {
    console.error("Seeding failed:", err.message);
    process.exit(1);
  }
}

seed();
