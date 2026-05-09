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
    console.log("🔗 Connected to database");

    // Check existing users
    console.log("👥 Checking existing users...");
    const existingUsers = await client.query("SELECT id, email, name FROM users LIMIT 10");
    console.log(`Found ${existingUsers.rows.length} existing users`);
    
    if (existingUsers.rows.length === 0) {
      console.log("⚠️ No users found. Please create users through the authentication system first.");
      console.log("📝 You can create users by:");
      console.log("   1. Running the development server");
      console.log("   2. Signing up through the UI");
      console.log("   3. Then running this seed script again");
      await client.end();
      return;
    }

    const firstUser = existingUsers.rows[0];
    console.log(`Using existing user: ${firstUser.name} (${firstUser.email})`);

    // Clear existing demo data (keep users)
    console.log("🧹 Cleaning existing demo data...");
    try {
      await client.query("DELETE FROM attendance WHERE id IS NOT NULL");
      await client.query("DELETE FROM notifications WHERE id IS NOT NULL");
      await client.query("DELETE FROM service_tickets WHERE id IS NOT NULL");
      await client.query("DELETE FROM proposals WHERE id IS NOT NULL");
      await client.query("DELETE FROM documents WHERE id IS NOT NULL");
      await client.query("DELETE FROM claims WHERE id IS NOT NULL");
      await client.query("DELETE FROM renewals WHERE id IS NOT NULL");
      await client.query("DELETE FROM commissions WHERE id IS NOT NULL");
      await client.query("DELETE FROM premiums WHERE id IS NOT NULL");
      await client.query("DELETE FROM sales_leads WHERE lead_number IS NOT NULL");
      await client.query("DELETE FROM policies WHERE id IS NOT NULL");
      await client.query("DELETE FROM customers WHERE id IS NOT NULL");
      await client.query("DELETE FROM branches WHERE id IS NOT NULL");
    } catch (err) {
      console.log("⚠️ Some cleanup failed, proceeding with seeding...");
    }

    // ============ CORE ENTITIES ============
    
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

    // 2. Customers
    console.log("👨‍👩‍👧‍👦 Seeding Customers...");
    await client.query(`
      INSERT INTO customers (id, uid, name, email, phone, address, city, state, pincode, status, customer_type, created_by, entity_meta)
      VALUES 
        ('c0000000-0000-0000-0000-000000000001', 'CUST-1001', 'Amit Malhotra', 'amit.m@example.com', '9810012345', '123 Golf Links, New Delhi', 'New Delhi', 'Delhi', '110001', 'active', 'individual', $1, '{"dob": "1985-06-15", "pan_number": "ABCDE1234F", "gender": "male", "marital_status": "married", "annual_income": 1500000}'),
        ('c0000000-0000-0000-0000-000000000002', 'CUST-1002', 'Sunita Sharma', 'sunita.s@example.com', '9810054321', '456 Marine Drive, Mumbai', 'Mumbai', 'Maharashtra', '400001', 'active', 'individual', $1, '{"dob": "1990-03-22", "pan_number": "FGHIJ5678K", "gender": "female", "marital_status": "single", "annual_income": 1200000}'),
        ('c0000000-0000-0000-0000-000000000003', 'CUST-1003', 'TechCorp Solutions Pvt Ltd', 'contact@techcorp.com', '8012345678', '789 Electronic City, Bangalore', 'Bangalore', 'Karnataka', '560001', 'active', 'corporate', $1, '{"turnover": 50000000, "pan_number": "LMNOP9012R", "gst_number": "29AAAPL1234C1ZV", "industry": "IT Services"}'),
        ('c0000000-0000-0000-0000-000000000004', 'CUST-1004', 'Rahul Velma', 'rahul.v@example.com', '9810098765', '321 Park Street, Kolkata', 'Kolkata', 'West Bengal', '700001', 'active', 'individual', $1, '{"dob": "1988-11-08", "pan_number": "STUVW3456Y", "gender": "male", "marital_status": "married", "annual_income": 2000000}'),
        ('c0000000-0000-0000-0000-000000000005', 'CUST-1005', 'Global Logistics Ltd', 'info@globallog.com', '9876543210', '654 Nehru Place, New Delhi', 'New Delhi', 'Delhi', '110019', 'active', 'corporate', $1, '{"turnover": 75000000, "pan_number": "XYZAB7890C", "gst_number": "07AAAPG5678D1ZV", "industry": "Logistics"}')
      ON CONFLICT (id) DO NOTHING
    `, [firstUser.id]);

    // 3. Policies
    console.log("📋 Seeding Policies...");
    
    // Motor Policy
    await client.query(`
      INSERT INTO policies (id, policy_number, policy_type, customer_id, customer_name, insurer_name, premium_amount, sum_insured, status, start_date, end_date, assigned_to, created_by, branch_id, motor_category, vehicle_number, vehicle_type)
      VALUES ('00000000-0000-0000-0000-000000000004', 'POL-MOT-2024-001', 'motor', 'c0000000-0000-0000-0000-000000000001', 'Amit Malhotra', 'HDFC ERGO', 15000, 500000, 'active', CURRENT_DATE - INTERVAL '6 months', CURRENT_DATE + INTERVAL '6 months', $1, $1, '10000000-0000-0000-0000-000000000001', 'retail', 'MH01AB1234', 'Sedan')
      ON CONFLICT (id) DO NOTHING
    `, [firstUser.id]);

    // Health Policy
    await client.query(`
      INSERT INTO policies (id, policy_number, policy_type, customer_id, customer_name, insurer_name, premium_amount, sum_insured, status, start_date, end_date, assigned_to, created_by, branch_id, health_policy_type)
      VALUES ('00000000-0000-0000-0000-000000000005', 'POL-HEA-2024-001', 'health', 'c0000000-0000-0000-0000-000000000002', 'Sunita Sharma', 'Star Health', 25000, 1000000, 'active', CURRENT_DATE - INTERVAL '4 months', CURRENT_DATE + INTERVAL '8 months', $1, $1, '10000000-0000-0000-0000-000000000002', 'floater')
      ON CONFLICT (id) DO NOTHING
    `, [firstUser.id]);

    // Life Policy
    await client.query(`
      INSERT INTO policies (id, policy_number, policy_type, customer_id, customer_name, insurer_name, premium_amount, sum_insured, status, start_date, end_date, assigned_to, created_by, branch_id)
      VALUES ('00000000-0000-0000-0000-000000000006', 'POL-LIF-2024-001', 'life', 'c0000000-0000-0000-0000-000000000001', 'Amit Malhotra', 'LIC India', 50000, 5000000, 'active', CURRENT_DATE - INTERVAL '2 months', CURRENT_DATE + INTERVAL '10 months', $1, $1, '10000000-0000-0000-0000-000000000001')
      ON CONFLICT (id) DO NOTHING
    `, [firstUser.id]);

    // Fire Policy
    await client.query(`
      INSERT INTO policies (id, policy_number, policy_type, customer_id, customer_name, insurer_name, premium_amount, sum_insured, status, start_date, end_date, assigned_to, created_by, branch_id)
      VALUES ('00000000-0000-0000-0000-000000000007', 'POL-FIR-2024-001', 'fire', 'c0000000-0000-0000-0000-000000000003', 'TechCorp Solutions', 'ICICI Lombard', 75000, 20000000, 'active', CURRENT_DATE - INTERVAL '3 months', CURRENT_DATE + INTERVAL '9 months', $1, $1, '10000000-0000-0000-0000-000000000003')
      ON CONFLICT (id) DO NOTHING
    `, [firstUser.id]);

    // 4. Sales Leads
    console.log("🎯 Seeding Sales Leads...");
    await client.query(`
      INSERT INTO sales_leads (lead_number, customer_name, email, mobile, status, source, assigned_to, created_by, priority, notes)
      VALUES 
        ('LEAD-001', 'Rohan Kapoor', 'rohan.k@example.com', '9900011111', 'new', 'online', $1, $1, 'medium', 'Looking for car insurance for new Honda City'),
        ('LEAD-002', 'Suresh Iyer', 'suresh.i@example.com', '9900022222', 'contacted', 'referral', $1, $1, 'high', 'Corporate health insurance for 50 employees'),
        ('LEAD-003', 'Pooja Bhatt', 'pooja.b@example.com', '9900033333', 'follow_up', 'social_media', $1, $1, 'urgent', 'Fire insurance for warehouse - immediate requirement'),
        ('LEAD-004', 'Anand Kumar', 'anand.k@example.com', '9900044444', 'interested', 'walk_in', $1, $1, 'medium', 'Life insurance coverage comparison'),
        ('LEAD-005', 'Meera Reddy', 'meera.r@example.com', '9900055555', 'proposal_sent', 'telecall', $1, $1, 'low', 'Marine insurance for import/export business')
      ON CONFLICT (lead_number) DO NOTHING
    `, [firstUser.id]);

    // 5. Premiums
    console.log("💰 Seeding Premiums...");
    await client.query(`
      INSERT INTO premiums (id, policy_id, policy_number, customer_id, customer_name, amount, status, due_date, collected_at, collected_by)
      VALUES 
        ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000004', 'POL-MOT-2024-001', 'c0000000-0000-0000-0000-000000000001', 'Amit Malhotra', 15000, 'collected', CURRENT_DATE - INTERVAL '5 months', CURRENT_DATE - INTERVAL '5 months', $1),
        ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000005', 'POL-HEA-2024-001', 'c0000000-0000-0000-0000-000000000002', 'Sunita Sharma', 25000, 'collected', CURRENT_DATE - INTERVAL '3 months', CURRENT_DATE - INTERVAL '3 months', $1),
        ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000006', 'POL-LIF-2024-001', 'c0000000-0000-0000-0000-000000000001', 'Amit Malhotra', 50000, 'pending', CURRENT_DATE + INTERVAL '1 month', null, null),
        ('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000007', 'POL-FIR-2024-001', 'c0000000-0000-0000-0000-000000000003', 'TechCorp Solutions', 75000, 'overdue', CURRENT_DATE - INTERVAL '1 month', null, null)
      ON CONFLICT (id) DO NOTHING
    `, [firstUser.id]);

    // 6. Commissions
    console.log("📊 Seeding Commissions...");
    await client.query(`
      INSERT INTO commissions (id, policy_id, policy_number, user_id, user_name, amount, status, created_at)
      VALUES 
        ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000004', 'POL-MOT-2024-001', $1, $2, 1500, 'paid', CURRENT_DATE - INTERVAL '5 months'),
        ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000005', 'POL-HEA-2024-001', $1, $2, 2500, 'approved', CURRENT_DATE - INTERVAL '3 months'),
        ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000006', 'POL-LIF-2024-001', $1, $2, 5000, 'pending', CURRENT_DATE - INTERVAL '2 months'),
        ('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000007', 'POL-FIR-2024-001', $1, $2, 7500, 'pending', CURRENT_DATE - INTERVAL '3 months')
      ON CONFLICT (id) DO NOTHING
    `, [firstUser.id, firstUser.name]);

    // 7. Renewals
    console.log("🔄 Seeding Renewals...");
    await client.query(`
      INSERT INTO renewals (id, policy_id, policy_number, customer_id, customer_name, status, due_date, updated_by)
      VALUES 
        ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000004', 'POL-MOT-2024-001', 'c0000000-0000-0000-0000-000000000001', 'Amit Malhotra', 'due', CURRENT_DATE + INTERVAL '1 month', $1),
        ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000005', 'POL-HEA-2024-001', 'c0000000-0000-0000-0000-000000000002', 'Sunita Sharma', 'contacted', CURRENT_DATE + INTERVAL '2 months', $1)
      ON CONFLICT (id) DO NOTHING
    `, [firstUser.id]);

    // 8. Claims
    console.log("🚑 Seeding Claims...");
    await client.query(`
      INSERT INTO claims (id, claim_number, policy_id, policy_number, customer_id, customer_name, claim_type, claim_amount, status, claim_date, created_at, created_by)
      VALUES 
        ('00000000-0000-0000-0000-000000000001', 'CLM-2024-001', '00000000-0000-0000-0000-000000000004', 'POL-MOT-2024-001', 'c0000000-0000-0000-0000-000000000001', 'Amit Malhotra', 'accident', 200000, 'under_review', CURRENT_DATE - INTERVAL '1 week', CURRENT_DATE - INTERVAL '1 week', $1),
        ('00000000-0000-0000-0000-000000000002', 'CLM-2024-002', '00000000-0000-0000-0000-000000000005', 'POL-HEA-2024-001', 'c0000000-0000-0000-0000-000000000002', 'Sunita Sharma', 'health', 150000, 'registered', CURRENT_DATE - INTERVAL '3 days', CURRENT_DATE - INTERVAL '3 days', $1)
      ON CONFLICT (id) DO NOTHING
    `, [firstUser.id]);

    // 9. Documents
    console.log("📄 Seeding Documents...");
    await client.query(`
      INSERT INTO documents (id, policy_id, customer_id, uploaded_by, file_path, file_url, document_type, file_name)
      VALUES 
        ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000001', $1, '/storage/policies/POL-MOT-2024-001.pdf', 'https://example.com/storage/policies/POL-MOT-2024-001.pdf', 'policy', 'policy_doc_motor.pdf'),
        ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0000-000000000002', $1, '/storage/claims/medical_reports.pdf', 'https://example.com/storage/claims/medical_reports.pdf', 'medical', 'medical_reports.pdf')
      ON CONFLICT (id) DO NOTHING
    `, [firstUser.id]);

    // 10. Service Tickets
    console.log("🎫 Seeding Service Tickets...");
    await client.query(`
      INSERT INTO service_tickets (id, ticket_number, customer_id, category, status, internal_notes, owner_id, created_by)
      VALUES 
        ('00000000-0000-0000-0000-000000000001', 'TKT-2024-001', 'c0000000-0000-0000-0000-000000000001', 'general_query', 'open', 'Query about policy coverage details', $1, $1),
        ('00000000-0000-0000-0000-000000000002', 'TKT-2024-002', 'c0000000-0000-0000-0000-000000000002', 'claim_assistance', 'in_progress', 'Need help with claim submission', $1, $1)
      ON CONFLICT (id) DO NOTHING
    `, [firstUser.id]);

    // 11. Proposals
    console.log("📝 Seeding Proposals...");
    await client.query(`
      INSERT INTO proposals (id, proposal_number, customer_id, customer_name, customer_email, policy_type, status, premium_quoted, sum_insured, assigned_to, created_by)
      VALUES 
        ('00000000-0000-0000-0000-000000000001', 'PROP-2024-001', 'c0000000-0000-0000-0000-000000000003', 'TechCorp Solutions', 'contact@techcorp.com', 'fire', 'draft', 75000, 20000000, $1, $1),
        ('00000000-0000-0000-0000-000000000002', 'PROP-2024-002', 'c0000000-0000-0000-0000-000000000004', 'Rahul Velma', 'rahul.v@example.com', 'life', 'submitted', 45000, 5000000, $1, $1)
      ON CONFLICT (id) DO NOTHING
    `, [firstUser.id]);

    // 12. Notifications
    console.log("🔔 Seeding Notifications...");
    await client.query(`
      INSERT INTO notifications (id, user_id, title, message, type, link, "read")
      VALUES 
        ('00000000-0000-0000-0000-000000000001', $1, 'Policy Expiry Reminder', 'Your motor policy POL-MOT-2024-001 is due for renewal next month', 'policy_expiry', '/dashboard/policies', false),
        ('00000000-0000-0000-0000-000000000002', $1, 'New Lead Assigned', 'New high-priority lead assigned: Pooja Bhatt - Fire Insurance', 'lead_assignment', '/dashboard/sales-leads', false),
        ('00000000-0000-0000-0000-000000000003', $1, 'Commission Approved', 'Your commission for policy POL-HEA-2024-001 has been approved', 'commission', '/dashboard/commissions', false)
      ON CONFLICT (id) DO NOTHING
    `, [firstUser.id]);

    // 13. Attendance
    console.log("⏰ Seeding Attendance...");
    await client.query(`
      INSERT INTO attendance (user_id, date, check_in, check_out, status, branch_id)
      VALUES 
        ($1, CURRENT_DATE, CURRENT_DATE + '09:00:00'::time, CURRENT_DATE + '18:00:00'::time, 'present', '10000000-0000-0000-0000-000000000001'),
        ($1, CURRENT_DATE - INTERVAL '1 day', CURRENT_DATE - INTERVAL '1 day' + '09:15:00'::time, CURRENT_DATE - INTERVAL '1 day' + '18:30:00'::time, 'present', '10000000-0000-0000-0000-000000000002'),
        ($1, CURRENT_DATE - INTERVAL '2 days', CURRENT_DATE - INTERVAL '2 days' + '09:15:00'::time, CURRENT_DATE - INTERVAL '2 days' + '18:00:00'::time, 'late', '10000000-0000-0000-0000-000000000003')
      ON CONFLICT DO NOTHING
    `, [firstUser.id]);

    console.log("\n✅ Comprehensive client demo seeding complete!");
    
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
    console.log("📱 Login with your existing user credentials to see the demo data.");

    await client.end();
  } catch (err) {
    console.error("❌ Seeding failed:", err.message);
    process.exit(1);
  }
}

seed();
