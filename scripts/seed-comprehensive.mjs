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

    // 2. Users
    console.log("👥 Seeding Users...");
    await client.query(`
      INSERT INTO users (id, email, name, role, status, branch_id, designation, mobile)
      VALUES 
        ('00000000-0000-0000-0000-000000000001', 'admin@bpaf.com', 'Rajesh Kumar', 'admin', 'active', '10000000-0000-0000-0000-000000000001', 'employee', '+91 98765 43210'),
        ('00000000-0000-0000-0000-000000000002', 'manager@bpaf.com', 'Priya Sharma', 'manager', 'active', '10000000-0000-0000-0000-000000000002', 'employee', '+91 98765 43211'),
        ('00000000-0000-0000-0000-000000000003', 'employee@bpaf.com', 'Amit Patel', 'employee', 'active', '10000000-0000-0000-0000-000000000003', 'employee', '+91 98765 43212'),
        ('00000000-0000-0000-0000-000000000004', 'bqp@bpaf.com', 'Vikram Singh', 'employee', 'active', '10000000-0000-0000-0000-000000000001', 'bqp', '+91 98765 43213'),
        ('00000000-0000-0000-0000-000000000005', 'posp@bpaf.com', 'Neha Gupta', 'employee', 'active', '10000000-0000-0000-0000-000000000002', 'posp', '+91 98765 43214')
      ON CONFLICT (id) DO NOTHING
    `);

    // 3. Customers - Individual & Corporate
    console.log("👨‍👩‍👧‍👦 Seeding Customers...");
    await client.query(`
      INSERT INTO customers (id, uid, name, email, phone, address, city, state, pincode, status, customer_type, created_by, entity_meta)
      VALUES 
        ('c0000000-0000-0000-0000-000000000001', 'CUST-1001', 'Amit Malhotra', 'amit.m@example.com', '+91 98100 12345', '123 Golf Links, New Delhi', 'New Delhi', 'Delhi', '110001', 'active', 'individual', '00000000-0000-0000-0000-000000000001', '{"dob": "1985-06-15", "pan_number": "ABCDE1234F", "gender": "male", "marital_status": "married", "annual_income": 1500000}'),
        ('c0000000-0000-0000-0000-000000000002', 'CUST-1002', 'Sunita Sharma', 'sunita.s@example.com', '+91 98100 54321', '456 Marine Drive, Mumbai', 'Mumbai', 'Maharashtra', '400001', 'active', 'individual', '00000000-0000-0000-0000-000000000002', '{"dob": "1990-03-22", "pan_number": "FGHIJ5678K", "gender": "female", "marital_status": "single", "annual_income": 1200000}'),
        ('c0000000-0000-0000-0000-000000000003', 'CUST-1003', 'TechCorp Solutions Pvt Ltd', 'contact@techcorp.com', '+91 80 1234 5678', '789 Electronic City, Bangalore', 'Bangalore', 'Karnataka', '560001', 'active', 'corporate', '00000000-0000-0000-0000-000000000003', '{"turnover": 50000000, "pan_number": "LMNOP9012R", "gst_number": "29AAAPL1234C1ZV", "industry": "IT Services"}'),
        ('c0000000-0000-0000-0000-000000000004', 'CUST-1004', 'Rahul Verma', 'rahul.v@example.com', '+91 98100 98765', '321 Park Street, Kolkata', 'Kolkata', 'West Bengal', '700001', 'active', 'individual', '00000000-0000-0000-0000-000000000001', '{"dob": "1988-11-08", "pan_number": "STUVW3456Y", "gender": "male", "marital_status": "married", "annual_income": 2000000}'),
        ('c0000000-0000-0000-0000-000000000005', 'CUST-1005', 'Global Logistics Ltd', 'info@globallog.com', '+91 22 8765 4321', '654 Nehru Place, New Delhi', 'New Delhi', 'Delhi', '110019', 'active', 'corporate', '00000000-0000-0000-0000-000000000002', '{"turnover": 75000000, "pan_number": "XYZAB7890C", "gst_number": "07AAAPG5678D1ZV", "industry": "Logistics"}')
      ON CONFLICT (id) DO NOTHING
    `);

    // 4. Policies - All Types
    console.log("📋 Seeding Policies...");
    
    // Motor Policy 1
    await client.query(`
      INSERT INTO policies (id, policy_number, policy_type, customer_id, customer_name, insurer_name, premium_amount, sum_insured, status, start_date, end_date, assigned_to, created_by, branch_id, motor_category, vehicle_number, vehicle_type)
      VALUES ('00000000-0000-0000-0000-000000000004', 'POL-MOT-2024-001', 'motor', 'c0000000-0000-0000-0000-000000000001', 'Amit Malhotra', 'HDFC ERGO', 15000, 500000, 'active', CURRENT_DATE - INTERVAL '6 months', CURRENT_DATE + INTERVAL '6 months', '00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 'retail', 'MH01AB1234', 'Sedan')
      ON CONFLICT (id) DO NOTHING
    `);

    // Health Policy
    await client.query(`
      INSERT INTO policies (id, policy_number, policy_type, customer_id, customer_name, insurer_name, premium_amount, sum_insured, status, start_date, end_date, assigned_to, created_by, branch_id, health_policy_type)
      VALUES ('00000000-0000-0000-0000-000000000005', 'POL-HEA-2024-001', 'health', 'c0000000-0000-0000-0000-000000000002', 'Sunita Sharma', 'Star Health', 25000, 1000000, 'active', CURRENT_DATE - INTERVAL '4 months', CURRENT_DATE + INTERVAL '8 months', '00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000002', 'floater')
      ON CONFLICT (id) DO NOTHING
    `);

    // Life Policy
    await client.query(`
      INSERT INTO policies (id, policy_number, policy_type, customer_id, customer_name, insurer_name, premium_amount, sum_insured, status, start_date, end_date, assigned_to, created_by, branch_id, health_policy_type)
      VALUES ('00000000-0000-0000-0000-000000000006', 'POL-LIF-2024-001', 'life', 'c0000000-0000-0000-0000-000000000001', 'Amit Malhotra', 'LIC India', 50000, 5000000, 'active', CURRENT_DATE - INTERVAL '2 months', CURRENT_DATE + INTERVAL '10 months', '00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', 'term')
      ON CONFLICT (id) DO NOTHING
    `);

    // Fire Policy
    await client.query(`
      INSERT INTO policies (id, policy_number, policy_type, customer_id, customer_name, insurer_name, premium_amount, sum_insured, status, start_date, end_date, assigned_to, created_by, branch_id)
      VALUES ('00000000-0000-0000-0000-000000000007', 'POL-FIR-2024-001', 'fire', 'c0000000-0000-0000-0000-000000000003', 'TechCorp Solutions', 'ICICI Lombard', 75000, 20000000, 'active', CURRENT_DATE - INTERVAL '3 months', CURRENT_DATE + INTERVAL '9 months', '00000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000003')
      ON CONFLICT (id) DO NOTHING
    `);

    // Motor Policy 2 (Fleet)
    await client.query(`
      INSERT INTO policies (id, policy_number, policy_type, customer_id, customer_name, insurer_name, premium_amount, sum_insured, status, start_date, end_date, assigned_to, created_by, branch_id, motor_category)
      VALUES ('00000000-0000-0000-0000-000000000008', 'POL-MOT-2024-002', 'motor', 'c0000000-0000-0000-0000-000000000005', 'Global Logistics', 'Bajaj Allianz', 120000, 15000000, 'active', CURRENT_DATE - INTERVAL '1 month', CURRENT_DATE + INTERVAL '11 months', '00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000002', 'fleet')
      ON CONFLICT (id) DO NOTHING
    `);

    // 5. Sales Leads
    console.log("🎯 Seeding Sales Leads...");
    const leads = [
      ['LEAD-001', 'Rohan Kapoor', 'rohan.k@example.com', '+91 99000 11111', 'new', 'online', '00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'medium', 'Looking for car insurance for new Honda City'],
      ['LEAD-002', 'Suresh Iyer', 'suresh.i@example.com', '+91 99000 22222', 'contacted', 'referral', '00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'high', 'Corporate health insurance for 50 employees'],
      ['LEAD-003', 'Pooja Bhatt', 'pooja.b@example.com', '+91 99000 33333', 'follow_up', 'social_media', '00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000002', 'urgent', 'Fire insurance for warehouse - immediate requirement'],
      ['LEAD-004', 'Anand Kumar', 'anand.k@example.com', '+91 99000 44444', 'interested', 'walk_in', '00000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000002', 'medium', 'Life insurance coverage comparison'],
      ['LEAD-005', 'Meera Reddy', 'meera.r@example.com', '+91 99000 55555', 'proposal_sent', 'telecall', '00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'low', 'Marine insurance for import/export business']
    ];

    for (const lead of leads) {
      await client.query(`
        INSERT INTO sales_leads (lead_number, customer_name, email, mobile, status, source, assigned_to, created_by, priority, notes)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (lead_number) DO NOTHING
      `, lead);
    }

    // ============ FINANCIAL MODULES ============

    // 6. Premiums
    console.log("💰 Seeding Premiums...");
    const premiums = [
      ['00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000004', 'POL-MOT-2024-001', 'c0000000-0000-0000-0000-000000000001', 'Amit Malhotra', 15000, 'collected', CURRENT_DATE - INTERVAL '5 months', CURRENT_DATE - INTERVAL '5 months', '00000000-0000-0000-0000-000000000003'],
      ['00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000005', 'POL-HEA-2024-001', 'c0000000-0000-0000-0000-000000000002', 'Sunita Sharma', 25000, 'collected', CURRENT_DATE - INTERVAL '3 months', CURRENT_DATE - INTERVAL '3 months', '00000000-0000-0000-0000-000000000003'],
      ['00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000006', 'POL-LIF-2024-001', 'c0000000-0000-0000-0000-000000000001', 'Amit Malhotra', 50000, 'pending', CURRENT_DATE + INTERVAL '1 month', null, null],
      ['00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000007', 'POL-FIR-2024-001', 'c0000000-0000-0000-0000-000000000003', 'TechCorp Solutions', 75000, 'overdue', CURRENT_DATE - INTERVAL '1 month', null, null]
    ];

    for (const premium of premiums) {
      await client.query(`
        INSERT INTO premiums (id, policy_id, policy_number, customer_id, customer_name, amount, status, due_date, collected_at, collected_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (id) DO NOTHING
      `, premium);
    }

    // 7. Commissions
    console.log("📊 Seeding Commissions...");
    const commissions = [
      ['00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000004', 'POL-MOT-2024-001', '00000000-0000-0000-0000-000000000003', 'Amit Patel', 1500, 'percentage', 'paid', CURRENT_DATE - INTERVAL '5 months'],
      ['00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000005', 'POL-HEA-2024-001', '00000000-0000-0000-0000-000000000003', 'Amit Patel', 2500, 'percentage', 'approved', CURRENT_DATE - INTERVAL '3 months'],
      ['00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000006', 'POL-LIF-2024-001', '00000000-0000-0000-0000-000000000004', 'Vikram Singh', 5000, 'percentage', 'pending', null],
      ['00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000007', 'POL-FIR-2024-001', '00000000-0000-0000-0000-000000000005', 'Neha Gupta', 7500, 'percentage', 'pending', null]
    ];

    for (const commission of commissions) {
      await client.query(`
        INSERT INTO commissions (id, policy_id, policy_number, user_id, user_name, amount, commission_type, status, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (id) DO NOTHING
      `, commission);
    }

    // 8. Renewals
    console.log("🔄 Seeding Renewals...");
    const renewals = [
      ['00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000004', 'POL-MOT-2024-001', 'c0000000-0000-0000-0000-000000000001', 'Amit Malhotra', 'due', CURRENT_DATE + INTERVAL '1 month', 16000, '00000000-0000-0000-0000-000000000003'],
      ['00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000005', 'POL-HEA-2024-001', 'c0000000-0000-0000-0000-000000000002', 'Sunita Sharma', 'contacted', CURRENT_DATE + INTERVAL '2 months', 26000, '00000000-0000-0000-0000-000000000003']
    ];

    for (const renewal of renewals) {
      await client.query(`
        INSERT INTO renewals (id, policy_id, policy_number, customer_id, customer_name, status, due_date, proposed_premium, assigned_to)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (id) DO NOTHING
      `, renewal);
    }

    // ============ OPERATIONAL MODULES ============

    // 9. Attendance
    console.log("⏰ Seeding Attendance...");
    const attendance = [
      ['00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', CURRENT_DATE, CURRENT_DATE + '09:00:00'::time, CURRENT_DATE + '18:30:00'::time, 'present', '10000000-0000-0000-0000-000000000003'],
      ['00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000004', CURRENT_DATE, CURRENT_DATE + '09:15:00'::time, CURRENT_DATE + '18:00:00'::time, 'late', '10000000-0000-0000-0000-000000000001'],
      ['00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000005', CURRENT_DATE, CURRENT_DATE + '08:45:00'::time, CURRENT_DATE + '17:30:00'::time, 'present', '10000000-0000-0000-0000-000000000002'],
      ['00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000002', CURRENT_DATE, null, null, 'leave', '10000000-0000-0000-0000-000000000002']
    ];

    for (const att of attendance) {
      await client.query(`
        INSERT INTO attendance (id, user_id, date, check_in, check_out, status, branch_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (id) DO NOTHING
      `, att);
    }

    // 10. Claims
    console.log("🚑 Seeding Claims...");
    const claims = [
      ['00000000-0000-0000-0000-000000000001', 'CLM-2024-001', '00000000-0000-0000-0000-000000000004', 'POL-MOT-2024-001', 'c0000000-0000-0000-0000-000000000001', 'Amit Malhotra', 'motor', 'accident', 200000, 'processing', CURRENT_DATE - INTERVAL '1 week', CURRENT_DATE - INTERVAL '1 week', '00000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001'],
      ['00000000-0000-0000-0000-000000000002', 'CLM-2024-002', '00000000-0000-0000-0000-000000000005', 'POL-HEA-2024-001', 'c0000000-0000-0000-0000-000000000002', 'Sunita Sharma', 'health', 'hospitalization', 150000, 'open', CURRENT_DATE - INTERVAL '3 days', CURRENT_DATE - INTERVAL '3 days', '00000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000002']
    ];

    for (const claim of claims) {
      await client.query(`
        INSERT INTO claims (id, claim_number, policy_id, policy_number, customer_id, customer_name, claim_type, claim_category, estimated_amount, status, claim_date, created_at, assigned_to, branch_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        ON CONFLICT (id) DO NOTHING
      `, claim);
    }

    // 11. Documents
    console.log("📄 Seeding Documents...");
    const documents = [
      ['00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000001', 'Policy Document', 'policy_doc_motor.pdf', '/storage/policies/POL-MOT-2024-001.pdf', 'https://example.com/storage/policies/POL-MOT-2024-001.pdf', '00000000-0000-0000-0000-000000000003'],
      ['00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0000-000000000002', 'Medical Reports', 'medical_reports.pdf', '/storage/claims/medical_reports.pdf', 'https://example.com/storage/claims/medical_reports.pdf', '00000000-0000-0000-0000-000000000004'],
      ['00000000-0000-0000-0000-000000000003', null, 'c0000000-0000-0000-0000-000000000001', 'KYC Documents', 'kyc_documents.pdf', '/storage/kyc/kyc_amit.pdf', 'https://example.com/storage/kyc/kyc_amit.pdf', '00000000-0000-0000-0000-000000000003']
    ];

    for (const doc of documents) {
      await client.query(`
        INSERT INTO documents (id, policy_id, customer_id, file_name, file_path, file_url, uploaded_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (id) DO NOTHING
      `, doc);
    }

    // ============ CRM EXTENSIONS ============

    // 12. Proposals
    console.log("📝 Seeding Proposals...");
    const proposals = [
      ['00000000-0000-0000-0000-000000000001', 'PROP-2024-001', 'c0000000-0000-0000-0000-000000000003', 'TechCorp Solutions', 'contact@techcorp.com', 'fire', 'draft', 75000, 20000000, '00000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000003'],
      ['00000000-0000-0000-0000-000000000002', 'PROP-2024-002', 'c0000000-0000-0000-0000-000000000004', 'Rahul Verma', 'rahul.v@example.com', 'life', 'sent', 45000, 5000000, '00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001']
    ];

    for (const proposal of proposals) {
      await client.query(`
        INSERT INTO proposals (id, proposal_number, customer_id, customer_name, customer_email, policy_type, status, premium_amount, sum_insured, assigned_to, created_by, branch_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (id) DO NOTHING
      `, proposal);
    }

    // 13. Service Tickets
    console.log("🎫 Seeding Service Tickets...");
    const tickets = [
      ['00000000-0000-0000-0000-000000000001', 'TKT-2024-001', 'c0000000-0000-0000-0000-000000000001', 'Amit Malhotra', 'policy', 'general_query', 'open', 'Query about policy coverage details', '00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001'],
      ['00000000-0000-0000-0000-000000000002', 'TKT-2024-002', 'c0000000-0000-0000-0000-000000000002', 'Sunita Sharma', 'claim', 'claim_assistance', 'in_progress', 'Need help with claim submission', '00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000002']
    ];

    for (const ticket of tickets) {
      await client.query(`
        INSERT INTO service_tickets (id, ticket_number, customer_id, customer_name, category, subcategory, status, description, assigned_to, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (id) DO NOTHING
      `, ticket);
    }

    // 14. KYC Documents
    console.log("🔍 Seeding KYC Documents...");
    const kycDocs = [
      ['00000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'pan_card', 'ABCDE1234F', '/storage/kyc/pan_amit.pdf', 'https://example.com/storage/kyc/pan_amit.pdf', 'verified', CURRENT_DATE - INTERVAL '1 month'],
      ['00000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001', 'aadhaar_card', '123456789012', '/storage/kyc/aadhaar_amit.pdf', 'https://example.com/storage/kyc/aadhaar_amit.pdf', 'verified', CURRENT_DATE - INTERVAL '1 month'],
      ['00000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000002', 'pan_card', 'FGHIJ5678K', '/storage/kyc/pan_sunita.pdf', 'https://example.com/storage/kyc/pan_sunita.pdf', 'pending', CURRENT_DATE - INTERVAL '2 weeks']
    ];

    for (const kyc of kycDocs) {
      await client.query(`
        INSERT INTO kyc_documents (id, customer_id, document_type, document_number, file_path, file_url, status, uploaded_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (id) DO NOTHING
      `, kyc);
    }

    // 15. Invoices
    console.log("🧾 Seeding Invoices...");
    const invoices = [
      ['00000000-0000-0000-0000-000000000001', 'INV-2024-001', 'c0000000-0000-0000-0000-000000000001', 'Amit Malhotra', '00000000-0000-0000-0000-000000000004', 'POL-MOT-2024-001', 15000, 'paid', CURRENT_DATE - INTERVAL '5 months', CURRENT_DATE - INTERVAL '5 months'],
      ['00000000-0000-0000-0000-000000000002', 'INV-2024-002', 'c0000000-0000-0000-0000-000000000002', 'Sunita Sharma', '00000000-0000-0000-0000-000000000005', 'POL-HEA-2024-001', 25000, 'paid', CURRENT_DATE - INTERVAL '3 months', CURRENT_DATE - INTERVAL '3 months'],
      ['00000000-0000-0000-0000-000000000003', 'INV-2024-003', 'c0000000-0000-0000-0000-000000000001', 'Amit Malhotra', '00000000-0000-0000-0000-000000000006', 'POL-LIF-2024-001', 50000, 'pending', CURRENT_DATE + INTERVAL '1 month', null]
    ];

    for (const invoice of invoices) {
      await client.query(`
        INSERT INTO invoices (id, invoice_number, customer_id, customer_name, policy_id, policy_number, amount, status, issued_date, paid_date)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (id) DO NOTHING
      `, invoice);
    }

    // ============ SYSTEM & COMPLIANCE ============

    // 16. Notifications
    console.log("🔔 Seeding Notifications...");
    const notifications = [
      ['00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 'Policy Expiry Reminder', 'Your motor policy POL-MOT-2024-001 is due for renewal next month', 'policy_expiry', '/dashboard/policies', false],
      ['00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000004', 'New Lead Assigned', 'New high-priority lead assigned: Pooja Bhatt - Fire Insurance', 'lead_assignment', '/dashboard/sales-leads', false],
      ['00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000005', 'Commission Approved', 'Your commission for policy POL-HEA-2024-001 has been approved', 'commission', '/dashboard/commissions', false]
    ];

    for (const notif of notifications) {
      await client.query(`
        INSERT INTO notifications (id, user_id, title, message, type, link, is_read)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (id) DO NOTHING
      `, notif);
    }

    // 17. Audit Logs
    console.log("📋 Seeding Audit Logs...");
    const auditLogs = [
      ['00000000-0000-0000-0000-000000000001', 'create', 'policies', '00000000-0000-0000-0000-000000000003', 'Amit Patel', 'employee', 'Created new motor policy POL-MOT-2024-001 for Amit Malhotra', CURRENT_DATE - INTERVAL '6 months'],
      ['00000000-0000-0000-0000-000000000002', 'update', 'customers', '00000000-0000-0000-0000-000000000004', 'Vikram Singh', 'employee', 'Updated contact details for Rahul Verma', CURRENT_DATE - INTERVAL '2 weeks'],
      ['00000000-0000-0000-0000-000000000003', 'create', 'claims', '00000000-0000-0000-0000-000000000003', 'Amit Patel', 'employee', 'Registered new claim CLM-2024-001 for Amit Malhotra', CURRENT_DATE - INTERVAL '1 week'],
      ['00000000-0000-0000-0000-000000000004', 'login', 'system', '00000000-0000-0000-0000-000000000001', 'Rajesh Kumar', 'admin', 'Admin logged into system', CURRENT_DATE]
    ];

    for (const audit of auditLogs) {
      await client.query(`
        INSERT INTO audit_logs (id, action, module, user_id, user_name, user_role, details, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (id) DO NOTHING
      `, audit);
    }

    // 18. Commission Rules
    console.log("⚖️ Seeding Commission Rules...");
    await client.query(`
      INSERT INTO commission_rules (id, insurer_name, policy_type, commission_type, commission_value, is_active, created_by)
      VALUES 
        ('00000000-0000-0000-0000-000000000001', 'HDFC ERGO', 'motor', 'percentage', 10.0, true, '00000000-0000-0000-0000-000000000001'),
        ('00000000-0000-0000-0000-000000000002', 'Star Health', 'health', 'percentage', 15.0, true, '00000000-0000-0000-0000-000000000001'),
        ('00000000-0000-0000-0000-000000000003', 'LIC India', 'life', 'percentage', 25.0, true, '00000000-0000-0000-0000-000000000001'),
        ('00000000-0000-0000-0000-000000000004', 'ICICI Lombard', 'fire', 'percentage', 12.5, true, '00000000-0000-0000-0000-000000000001')
      ON CONFLICT (id) DO NOTHING
    `);

    // 19. Holidays
    console.log("🎉 Seeding Holidays...");
    await client.query(`
      INSERT INTO holidays (id, name, date, type, is_optional, branch_id)
      VALUES 
        ('00000000-0000-0000-0000-000000000001', 'Republic Day', '2024-01-26', 'national', false, null),
        ('00000000-0000-0000-0000-000000000002', 'Independence Day', '2024-08-15', 'national', false, null),
        ('00000000-0000-0000-0000-000000000003', 'Diwali', '2024-11-01', 'festival', false, null),
        ('00000000-0000-0000-0000-000000000004', 'Maharashtra Day', '2024-05-01', 'state', false, '10000000-0000-0000-0000-000000000001')
      ON CONFLICT (id) DO NOTHING
    `);

    // 20. System Config
    console.log("⚙️ Seeding System Configuration...");
    await client.query(`
      INSERT INTO system_config (key, value, description, category, is_public)
      VALUES 
        ('company_name', 'BP & AF Insurance Brokers Pvt Ltd', 'Company legal name', 'general', true),
        ('company_email', 'info@bpaf.com', 'Company contact email', 'contact', true),
        ('company_phone', '+91 22 1234 5678', 'Company contact phone', 'contact', true),
        ('renewal_reminder_days', '30', 'Days before expiry to send renewal reminder', 'renewals', false),
        ('commission_approval_threshold', '10000', 'Commission amount requiring approval', 'commissions', false),
        ('max_file_upload_size', '10485760', 'Maximum file upload size in bytes', 'uploads', false)
      ON CONFLICT (key) DO NOTHING
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
        (SELECT COUNT(*) FROM invoices) as invoices,
        (SELECT COUNT(*) FROM kyc_documents) as kyc_docs,
        (SELECT COUNT(*) FROM notifications) as notifications,
        (SELECT COUNT(*) FROM audit_logs) as audit_logs
    `);
    
    console.log("\n📊 Data Summary:");
    const summary = res.rows[0];
    Object.entries(summary).forEach(([key, value]) => {
      console.log(`   ${key}: ${value}`);
    });

    await client.end();
  } catch (err) {
    console.error("❌ Seeding failed:", err.message);
    process.exit(1);
  }
}

seed();
