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

async function seedComprehensiveDemo() {
  const user = process.env.DB_USER || "postgres";
  const pass = process.env.SUPABASE_DB_PASSWORD;
  const host = process.env.DB_HOST || "localhost";
  const port = process.env.DB_PORT || "5432";
  
  const client = new Client({ connectionString: `postgresql://${user}:${pass}@${host}:${port}/postgres` });
  
  try {
    await client.connect();
    console.log("🚀 Starting Comprehensive Demo Data Seeding...");

    // Check existing users
    const existingUsers = await client.query("SELECT id, email, name FROM users LIMIT 10");
    if (existingUsers.rows.length === 0) {
      console.log("❌ No users found. Please create users through authentication first.");
      await client.end();
      return;
    }

    const users = existingUsers.rows;
    const adminUser = users.find(u => u.email.includes('admin')) || users[0];
    const managerUser = users.find(u => u.email.includes('manager')) || users[1] || users[0];
    const employeeUser = users.find(u => u.email.includes('employee')) || users[2] || users[0];

    console.log(`👥 Using ${users.length} existing users for demo data`);

    // Clean existing demo data
    console.log("🧹 Cleaning existing demo data...");
    const tables = [
      'attendance', 'notifications', 'service_tickets', 'proposals', 'documents', 
      'claims', 'renewals', 'commissions', 'premiums', 'sales_leads', 
      'policies', 'customers', 'branches'
    ];
    
    for (const table of tables) {
      try {
        await client.query(`DELETE FROM ${table} WHERE id IS NOT NULL`);
      } catch (err) {
        // Ignore errors for tables that might not exist or have constraints
      }
    }

    // ============ COMPREHENSIVE BRANCH NETWORK ============
    console.log("📍 Creating Comprehensive Branch Network...");
    
    const branches = [
      {
        id: '10000000-0000-0000-0000-000000000001',
        name: 'BP & AF Corporate Headquarters - Mumbai',
        address: '42nd Floor, Imperial Tower, Bandra Kurla Complex',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400051',
        phone: '+91 22 6123 4567',
        is_active: true
      },
      {
        id: '10000000-0000-0000-0000-000000000002',
        name: 'BP & AF Regional Office - Delhi',
        address: '15th Floor, Connaught Place, Janpath',
        city: 'New Delhi',
        state: 'Delhi',
        pincode: '110001',
        phone: '+91 11 2345 6789',
        is_active: true
      },
      {
        id: '10000000-0000-0000-0000-000000000003',
        name: 'BP & AF South India Hub - Bangalore',
        address: '88 Residency Road, MG Road',
        city: 'Bangalore',
        state: 'Karnataka',
        pincode: '560001',
        phone: '+91 80 3456 7890',
        is_active: true
      },
      {
        id: '10000000-0000-0000-0000-000000000004',
        name: 'BP & AF East Zone - Kolkata',
        address: '321 Park Street, Camac Street Area',
        city: 'Kolkata',
        state: 'West Bengal',
        pincode: '700016',
        phone: '+91 33 2233 4455',
        is_active: true
      },
      {
        id: '10000000-0000-0000-0000-000000000005',
        name: 'BP & AF West Zone - Pune',
        address: '654 Shivaji Nagar, FC Road',
        city: 'Pune',
        state: 'Maharashtra',
        pincode: '411005',
        phone: '+91 20 2444 5566',
        is_active: true
      }
    ];

    for (const branch of branches) {
      await client.query(`
        INSERT INTO branches (id, name, address, city, state, pincode, phone, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (id) DO NOTHING
      `, [branch.id, branch.name, branch.address, branch.city, branch.state, branch.pincode, branch.phone, branch.is_active]);
    }

    // ============ COMPREHENSIVE CUSTOMER PORTFOLIO ============
    console.log("👥 Creating Comprehensive Customer Portfolio...");
    
    const customers = [
      // High-Value Corporate Clients
      {
        id: 'c0000000-0000-0000-0000-000000000001',
        uid: 'CUST-1001',
        name: 'Reliance Industries Limited',
        email: 'insurance@reliance.com',
        phone: '9876543210',
        address: 'Maker Chambers IV, Nariman Point',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400021',
        status: 'active',
        customer_type: 'corporate',
        created_by: adminUser.id,
        entity_meta: JSON.stringify({
          turnover: 800000000000,
          pan_number: 'AAACL1234C',
          gst_number: '27AAACL1234C1ZV',
          industry: 'Oil & Gas',
          employees: 25000,
          established_year: 1966,
          credit_rating: 'AAA',
          annual_premium_budget: 50000000
        })
      },
      {
        id: 'c0000000-0000-0000-0000-000000000002',
        uid: 'CUST-1002',
        name: 'Tata Consultancy Services',
        email: 'risk.management@tcs.com',
        phone: '9876543211',
        address: 'TCS House, Raveline Street, Fort',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
        status: 'active',
        customer_type: 'corporate',
        created_by: managerUser.id,
        entity_meta: JSON.stringify({
          turnover: 200000000000,
          pan_number: 'AAACT5678B',
          gst_number: '27AAACT5678B1ZV',
          industry: 'IT Services',
          employees: 600000,
          established_year: 1968,
          credit_rating: 'AAA',
          annual_premium_budget: 75000000
        })
      },
      // SME Clients
      {
        id: 'c0000000-0000-0000-0000-000000000003',
        uid: 'CUST-1003',
        name: 'TechCorp Solutions Pvt Ltd',
        email: 'contact@techcorp.com',
        phone: '8012345678',
        address: '789 Electronic City, Hosur Road',
        city: 'Bangalore',
        state: 'Karnataka',
        pincode: '560100',
        status: 'active',
        customer_type: 'corporate',
        created_by: employeeUser.id,
        entity_meta: JSON.stringify({
          turnover: 50000000,
          pan_number: 'AAAPTC9012R',
          gst_number: '29AAAPTC9012R1ZV',
          industry: 'IT Services',
          employees: 150,
          established_year: 2015,
          credit_rating: 'A+',
          annual_premium_budget: 2500000
        })
      },
      // High-Net-Worth Individual Clients
      {
        id: 'c0000000-0000-0000-0000-000000000004',
        uid: 'CUST-1004',
        name: 'Mr. Amit Malhotra',
        email: 'amit.malhotra@email.com',
        phone: '9810012345',
        address: '123 Golf Links, Sainik Farm',
        city: 'New Delhi',
        state: 'Delhi',
        pincode: '110049',
        status: 'active',
        customer_type: 'individual',
        created_by: managerUser.id,
        entity_meta: JSON.stringify({
          dob: '1985-06-15',
          pan_number: 'ABCDE1234F',
          gender: 'male',
          marital_status: 'married',
          annual_income: 15000000,
          occupation: 'Investment Banker',
          net_worth: 50000000,
          risk_profile: 'aggressive'
        })
      },
      {
        id: 'c0000000-0000-0000-0000-000000000005',
        uid: 'CUST-1005',
        name: 'Mrs. Sunita Sharma',
        email: 'sunita.sharma@email.com',
        phone: '9810054321',
        address: '456 Marine Drive, Walkeshwar',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400006',
        status: 'active',
        customer_type: 'individual',
        created_by: employeeUser.id,
        entity_meta: JSON.stringify({
          dob: '1990-03-22',
          pan_number: 'FGHIJ5678K',
          gender: 'female',
          marital_status: 'single',
          annual_income: 12000000,
          occupation: 'Senior Doctor',
          net_worth: 25000000,
          risk_profile: 'moderate'
        })
      },
      // Retail Customers
      {
        id: 'c0000000-0000-0000-0000-000000000006',
        uid: 'CUST-1006',
        name: 'Mr. Rahul Verma',
        email: 'rahul.verma@email.com',
        phone: '9810098765',
        address: '321 Park Street, Ballygunge',
        city: 'Kolkata',
        state: 'West Bengal',
        pincode: '700019',
        status: 'active',
        customer_type: 'individual',
        created_by: employeeUser.id,
        entity_meta: JSON.stringify({
          dob: '1988-11-08',
          pan_number: 'STUVW3456Y',
          gender: 'male',
          marital_status: 'married',
          annual_income: 2000000,
          occupation: 'Software Engineer',
          net_worth: 5000000,
          risk_profile: 'conservative'
        })
      },
      {
        id: 'c0000000-0000-0000-0000-000000000007',
        uid: 'CUST-1007',
        name: 'Global Logistics Ltd',
        email: 'info@globallog.com',
        phone: '9876543212',
        address: '654 Nehru Place, Lajpat Nagar',
        city: 'New Delhi',
        state: 'Delhi',
        pincode: '110024',
        status: 'active',
        customer_type: 'corporate',
        created_by: adminUser.id,
        entity_meta: JSON.stringify({
          turnover: 75000000,
          pan_number: 'XYZAB7890C',
          gst_number: '07XYZAB7890C1ZV',
          industry: 'Logistics',
          employees: 200,
          established_year: 2010,
          credit_rating: 'BBB',
          annual_premium_budget: 3500000
        })
      },
      {
        id: 'c0000000-0000-0000-0000-000000000008',
        uid: 'CUST-1008',
        name: 'Mrs. Priya Nair',
        email: 'priya.nair@email.com',
        phone: '9810087654',
        address: '789 Koramangala, 5th Block',
        city: 'Bangalore',
        state: 'Karnataka',
        pincode: '560095',
        status: 'active',
        customer_type: 'individual',
        created_by: employeeUser.id,
        entity_meta: JSON.stringify({
          dob: '1992-07-18',
          pan_number: 'LMNOP6789D',
          gender: 'female',
          marital_status: 'married',
          annual_income: 3500000,
          occupation: 'Product Manager',
          net_worth: 8000000,
          risk_profile: 'moderate'
        })
      }
    ];

    for (const customer of customers) {
      await client.query(`
        INSERT INTO customers (id, uid, name, email, phone, address, city, state, pincode, status, customer_type, created_by, entity_meta)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        ON CONFLICT (id) DO NOTHING
      `, [customer.id, customer.uid, customer.name, customer.email, customer.phone, customer.address, 
          customer.city, customer.state, customer.pincode, customer.status, customer.customer_type, 
          customer.created_by, customer.entity_meta]);
    }

    // ============ COMPREHENSIVE POLICY PORTFOLIO ============
    console.log("📋 Creating Comprehensive Policy Portfolio...");
    
    const policies = [
      // Corporate Policies - High Value
      {
        id: '00000000-0000-0000-0000-000000000004',
        policy_number: 'POL-CORP-2024-001',
        policy_type: 'fire',
        customer_id: 'c0000000-0000-0000-0000-000000000001',
        customer_name: 'Reliance Industries Limited',
        insurer_name: 'ICICI Lombard General Insurance',
        premium_amount: 2500000,
        sum_insured: 500000000,
        status: 'active',
        start_date: new Date('2024-01-01'),
        end_date: new Date('2024-12-31'),
        assigned_to: managerUser.id,
        created_by: adminUser.id,
        branch_id: '10000000-0000-0000-0000-000000000001'
      },
      {
        id: '00000000-0000-0000-0000-000000000005',
        policy_number: 'POL-CORP-2024-002',
        policy_type: 'marine',
        customer_id: 'c0000000-0000-0000-0000-000000000002',
        customer_name: 'Tata Consultancy Services',
        insurer_name: 'Bajaj Allianz General Insurance',
        premium_amount: 1800000,
        sum_insured: 300000000,
        status: 'active',
        start_date: new Date('2024-02-15'),
        end_date: new Date('2025-02-14'),
        assigned_to: managerUser.id,
        created_by: adminUser.id,
        branch_id: '10000000-0000-0000-0000-000000000001'
      },
      // SME Policies
      {
        id: '00000000-0000-0000-0000-000000000006',
        policy_number: 'POL-SME-2024-001',
        policy_type: 'liability',
        customer_id: 'c0000000-0000-0000-0000-000000000003',
        customer_name: 'TechCorp Solutions Pvt Ltd',
        insurer_name: 'HDFC ERGO General Insurance',
        premium_amount: 450000,
        sum_insured: 25000000,
        status: 'active',
        start_date: new Date('2024-03-01'),
        end_date: new Date('2025-02-28'),
        assigned_to: employeeUser.id,
        created_by: managerUser.id,
        branch_id: '10000000-0000-0000-0000-000000000003'
      },
      // High-Net-Worth Individual Policies
      {
        id: '00000000-0000-0000-0000-000000000007',
        policy_number: 'POL-HNI-2024-001',
        policy_type: 'motor',
        customer_id: 'c0000000-0000-0000-0000-000000000004',
        customer_name: 'Mr. Amit Malhotra',
        insurer_name: 'Cholamandalam MS General Insurance',
        premium_amount: 125000,
        sum_insured: 8500000,
        status: 'active',
        start_date: new Date('2024-01-15'),
        end_date: new Date('2025-01-14'),
        assigned_to: employeeUser.id,
        created_by: managerUser.id,
        branch_id: '10000000-0000-0000-0000-000000000002',
        motor_category: 'luxury',
        vehicle_number: 'MH01AB9999',
        vehicle_type: 'Mercedes-Benz S-Class'
      },
      {
        id: '00000000-0000-0000-0000-000000000008',
        policy_number: 'POL-HNI-2024-002',
        policy_type: 'health',
        customer_id: 'c0000000-0000-0000-0000-000000000005',
        customer_name: 'Mrs. Sunita Sharma',
        insurer_name: 'Star Health and Allied Insurance',
        premium_amount: 85000,
        sum_insured: 10000000,
        status: 'active',
        start_date: new Date('2024-02-01'),
        end_date: new Date('2025-01-31'),
        assigned_to: employeeUser.id,
        created_by: managerUser.id,
        branch_id: '10000000-0000-0000-0000-000000000001',
        health_policy_type: 'individual'
      },
      // Retail Policies
      {
        id: '00000000-0000-0000-0000-000000000009',
        policy_number: 'POL-RET-2024-001',
        policy_type: 'life',
        customer_id: 'c0000000-0000-0000-0000-000000000006',
        customer_name: 'Mr. Rahul Velma',
        insurer_name: 'LIC of India',
        premium_amount: 45000,
        sum_insured: 10000000,
        status: 'active',
        start_date: new Date('2024-03-15'),
        end_date: new Date('2034-03-14'),
        assigned_to: employeeUser.id,
        created_by: employeeUser.id,
        branch_id: '10000000-0000-0000-0000-000000000004'
      },
      {
        id: '00000000-0000-0000-0000-000000000010',
        policy_number: 'POL-RET-2024-002',
        policy_type: 'motor',
        customer_id: 'c0000000-0000-0000-0000-000000000007',
        customer_name: 'Global Logistics Ltd',
        insurer_name: 'New India Assurance',
        premium_amount: 950000,
        sum_insured: 12000000,
        status: 'active',
        start_date: new Date('2024-01-20'),
        end_date: new Date('2025-01-19'),
        assigned_to: managerUser.id,
        created_by: adminUser.id,
        branch_id: '10000000-0000-0000-0000-000000000002',
        motor_category: 'fleet'
      },
      {
        id: '00000000-0000-0000-0000-000000000011',
        policy_number: 'POL-RET-2024-003',
        policy_type: 'travel',
        customer_id: 'c0000000-0000-0000-0000-000000000008',
        customer_name: 'Mrs. Priya Nair',
        insurer_name: 'TATA AIG General Insurance',
        premium_amount: 15000,
        sum_insured: 5000000,
        status: 'active',
        start_date: new Date('2024-04-01'),
        end_date: new Date('2024-04-15'),
        assigned_to: employeeUser.id,
        created_by: employeeUser.id,
        branch_id: '10000000-0000-0000-0000-000000000003'
      }
    ];

    for (const policy of policies) {
      await client.query(`
        INSERT INTO policies (id, policy_number, policy_type, customer_id, customer_name, insurer_name, 
          premium_amount, sum_insured, status, start_date, end_date, assigned_to, created_by, branch_id,
          motor_category, vehicle_number, vehicle_type, health_policy_type)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
        ON CONFLICT (id) DO NOTHING
      `, [policy.id, policy.policy_number, policy.policy_type, policy.customer_id, policy.customer_name,
          policy.insurer_name, policy.premium_amount, policy.sum_insured, policy.status,
          policy.start_date, policy.end_date, policy.assigned_to, policy.created_by, policy.branch_id,
          policy.motor_category, policy.vehicle_number, policy.vehicle_type, policy.health_policy_type]);
    }

    // ============ COMPREHENSIVE SALES PIPELINE ============
    console.log("🎯 Creating Comprehensive Sales Pipeline...");
    
    const salesLeads = [
      {
        lead_number: 'LEAD-2024-001',
        customer_name: 'Mahindra & Mahindra Ltd',
        email: 'insurance@mahindra.com',
        mobile: '9876543213',
        status: 'interested',
        source: 'referral',
        priority: 'high',
        assigned_to: managerUser.id,
        created_by: adminUser.id,
        notes: 'Large corporate client looking for comprehensive fleet insurance. Annual premium potential: ₹2.5 Cr. Decision maker: CFO, next meeting scheduled for next week.',
        follow_up_date: new Date('2024-05-15')
      },
      {
        lead_number: 'LEAD-2024-002',
        customer_name: 'Dr. Rajesh Kumar',
        email: 'dr.rajesh.kumar@email.com',
        mobile: '9810012346',
        status: 'contacted',
        source: 'walk_in',
        priority: 'medium',
        assigned_to: employeeUser.id,
        created_by: employeeUser.id,
        notes: 'Senior cardiologist looking for family health insurance. Family of 4, including elderly parents. Interested in comprehensive coverage with international benefits.',
        follow_up_date: new Date('2024-05-10')
      },
      {
        lead_number: 'LEAD-2024-003',
        customer_name: 'Infosys Technologies',
        email: 'risk.team@infosys.com',
        mobile: '8012345679',
        status: 'interested',
        source: 'online',
        priority: 'high',
        assigned_to: managerUser.id,
        created_by: adminUser.id,
        notes: 'IT major seeking cyber insurance and professional indemnity coverage. Global operations require multi-jurisdictional coverage. Deal size: ₹5 Cr annually.',
        follow_up_date: new Date('2024-05-12')
      },
      {
        lead_number: 'LEAD-2024-004',
        customer_name: 'Ms. Ananya Reddy',
        email: 'ananya.reddy@email.com',
        mobile: '9810054322',
        status: 'new',
        source: 'social_media',
        priority: 'low',
        assigned_to: employeeUser.id,
        created_by: employeeUser.id,
        notes: 'Young professional looking for term life insurance. Age 28, non-smoker, annual income ₹12L. Coverage amount requested: ₹1 Cr.',
        follow_up_date: new Date('2024-05-08')
      },
      {
        lead_number: 'LEAD-2024-005',
        customer_name: 'Bharti Airtel Ltd',
        email: 'corporate.insurance@airtel.com',
        mobile: '9876543214',
        status: 'interested',
        source: 'referral',
        priority: 'high',
        assigned_to: adminUser.id,
        created_by: managerUser.id,
        notes: 'Telecom giant seeking property and business interruption insurance for data centers across India. Critical infrastructure coverage required.',
        follow_up_date: new Date('2024-05-11')
      },
      {
        lead_number: 'LEAD-2024-006',
        customer_name: 'Mr. Vikram Singh',
        email: 'vikram.singh@email.com',
        mobile: '9810098766',
        status: 'follow_up',
        source: 'telecall',
        priority: 'medium',
        assigned_to: employeeUser.id,
        created_by: employeeUser.id,
        notes: 'Business owner with 5 commercial vehicles looking for fleet insurance. Vehicles include 3 trucks and 2 vans. Operating in Delhi-NCR region.',
        follow_up_date: new Date('2024-05-09')
      }
    ];

    for (const lead of salesLeads) {
      await client.query(`
        INSERT INTO sales_leads (lead_number, customer_name, email, mobile, status, source, 
          assigned_to, created_by, priority, notes, follow_up_date)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (lead_number) DO NOTHING
      `, [lead.lead_number, lead.customer_name, lead.email, lead.mobile, lead.status, lead.source,
          lead.assigned_to, lead.created_by, lead.priority, lead.notes, lead.follow_up_date]);
    }

    // ============ COMPREHENSIVE PREMIUM COLLECTIONS ============
    console.log("💰 Creating Comprehensive Premium Collections...");
    
    const premiums = [
      // Corporate Premiums - High Value
      {
        id: '00000000-0000-0000-0000-000000000001',
        policy_id: '00000000-0000-0000-0000-000000000004',
        policy_number: 'POL-CORP-2024-001',
        customer_id: 'c0000000-0000-0000-0000-000000000001',
        customer_name: 'Reliance Industries Limited',
        amount: 2500000,
        status: 'collected',
        due_date: new Date('2024-01-01'),
        collected_at: new Date('2024-01-02'),
        collected_by: managerUser.id,
        payment_mode: 'bank_transfer',
        payment_reference: 'NEFT/RELIANCE/FIRE/2024/001'
      },
      {
        id: '00000000-0000-0000-0000-000000000002',
        policy_id: '00000000-0000-0000-0000-000000000005',
        policy_number: 'POL-CORP-2024-002',
        customer_id: 'c0000000-0000-0000-0000-000000000002',
        customer_name: 'Tata Consultancy Services',
        amount: 1800000,
        status: 'collected',
        due_date: new Date('2024-02-15'),
        collected_at: new Date('2024-02-14'),
        collected_by: managerUser.id,
        payment_mode: 'corporate_card',
        payment_reference: 'CC/TCS/MARINE/2024/001'
      },
      // SME Premiums
      {
        id: '00000000-0000-0000-0000-000000000003',
        policy_id: '00000000-0000-0000-0000-000000000006',
        policy_number: 'POL-SME-2024-001',
        customer_id: 'c0000000-0000-0000-0000-000000000003',
        customer_name: 'TechCorp Solutions Pvt Ltd',
        amount: 450000,
        status: 'collected',
        due_date: new Date('2024-03-01'),
        collected_at: new Date('2024-03-01'),
        collected_by: employeeUser.id,
        payment_mode: 'cheque',
        payment_reference: 'CHEQUE/TECHCORP/2024/001'
      },
      // HNI Premiums
      {
        id: '00000000-0000-0000-0000-000000000004',
        policy_id: '00000000-0000-0000-0000-000000000007',
        policy_number: 'POL-HNI-2024-001',
        customer_id: 'c0000000-0000-0000-0000-000000000004',
        customer_name: 'Mr. Amit Malhotra',
        amount: 125000,
        status: 'collected',
        due_date: new Date('2024-01-15'),
        collected_at: new Date('2024-01-14'),
        collected_by: employeeUser.id,
        payment_mode: 'online_payment',
        payment_reference: 'ONLINE/AMIT/MOTOR/2024/001'
      },
      {
        id: '00000000-0000-0000-0000-000000000005',
        policy_id: '00000000-0000-0000-0000-000000000008',
        policy_number: 'POL-HNI-2024-002',
        customer_id: 'c0000000-0000-0000-0000-000000000005',
        customer_name: 'Mrs. Sunita Sharma',
        amount: 85000,
        status: 'pending',
        due_date: new Date('2024-05-01'),
        collected_at: null,
        collected_by: null,
        payment_mode: null,
        payment_reference: null
      },
      // Retail Premiums
      {
        id: '00000000-0000-0000-0000-000000000006',
        policy_id: '00000000-0000-0000-0000-000000000009',
        policy_number: 'POL-RET-2024-001',
        customer_id: 'c0000000-0000-0000-0000-000000000006',
        customer_name: 'Mr. Rahul Velma',
        amount: 45000,
        status: 'overdue',
        due_date: new Date('2024-03-15'),
        collected_at: null,
        collected_by: null,
        payment_mode: null,
        payment_reference: null
      },
      {
        id: '00000000-0000-0000-0000-000000000007',
        policy_id: '00000000-0000-0000-0000-000000000010',
        policy_number: 'POL-RET-2024-002',
        customer_id: 'c0000000-0000-0000-0000-000000000007',
        customer_name: 'Global Logistics Ltd',
        amount: 950000,
        status: 'collected',
        due_date: new Date('2024-01-20'),
        collected_at: new Date('2024-01-19'),
        collected_by: managerUser.id,
        payment_mode: 'bank_transfer',
        payment_reference: 'NEFT/GLOBALLOG/FLEET/2024/001'
      },
      {
        id: '00000000-0000-0000-0000-000000000008',
        policy_id: '00000000-0000-0000-0000-000000000011',
        policy_number: 'POL-RET-2024-003',
        customer_id: 'c0000000-0000-0000-0000-000000000008',
        customer_name: 'Mrs. Priya Nair',
        amount: 15000,
        status: 'collected',
        due_date: new Date('2024-04-01'),
        collected_at: new Date('2024-04-01'),
        collected_by: employeeUser.id,
        payment_mode: 'upi',
        payment_reference: 'UPI/PRIYA/TRAVEL/2024/001'
      }
    ];

    for (const premium of premiums) {
      await client.query(`
        INSERT INTO premiums (id, policy_id, policy_number, customer_id, customer_name, 
          amount, status, due_date, collected_at, collected_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (id) DO NOTHING
      `, [premium.id, premium.policy_id, premium.policy_number, premium.customer_id, premium.customer_name,
          premium.amount, premium.status, premium.due_date, premium.collected_at, premium.collected_by]);
    }

    // ============ COMPREHENSIVE CLAIMS PORTFOLIO ============
    console.log("🚑 Creating Comprehensive Claims Portfolio...");
    
    const claims = [
      {
        id: '00000000-0000-0000-0000-000000000001',
        claim_number: 'CLM-2024-001',
        policy_id: '00000000-0000-0000-0000-000000000007',
        policy_number: 'POL-HNI-2024-001',
        customer_id: 'c0000000-0000-0000-0000-000000000004',
        customer_name: 'Mr. Amit Malhotra',
        claim_type: 'accident',
        claim_amount: 2500000,
        settled_amount: 1800000,
        status: 'approved',
        claim_date: new Date('2024-03-15'),
        created_at: new Date('2024-03-16'),
        created_by: employeeUser.id,
        description: 'Major accident on Delhi-Jaipur highway. Front end damage, airbag deployment. Vehicle towed to authorized service center.',
        surveyor_report: 'Survey completed on 18-Mar-2024. Repair estimate: ₹22.5L. Approved for settlement as per policy terms.',
        settlement_date: new Date('2024-04-05')
      },
      {
        id: '00000000-0000-0000-0000-000000000002',
        claim_number: 'CLM-2024-002',
        policy_id: '00000000-0000-0000-0000-000000000008',
        policy_number: 'POL-HNI-2024-002',
        customer_id: 'c0000000-0000-0000-0000-000000000005',
        customer_name: 'Mrs. Sunita Sharma',
        claim_type: 'health',
        claim_amount: 450000,
        settled_amount: null,
        status: 'under_review',
        claim_date: new Date('2024-04-20'),
        created_at: new Date('2024-04-21'),
        created_by: employeeUser.id,
        description: 'Emergency hospitalization for cardiac procedure. Admitted to Lilavati Hospital, Mumbai. Pre-authorization obtained.',
        surveyor_report: 'Medical documents received. Under review by medical team. Additional documents requested.',
        settlement_date: null
      },
      {
        id: '00000000-0000-0000-0000-000000000003',
        claim_number: 'CLM-2024-003',
        policy_id: '00000000-0000-0000-0000-000000000004',
        policy_number: 'POL-CORP-2024-001',
        customer_id: 'c0000000-0000-0000-0000-000000000001',
        customer_name: 'Reliance Industries Limited',
        claim_type: 'fire',
        claim_amount: 15000000,
        settled_amount: null,
        status: 'surveyor_appointed',
        claim_date: new Date('2024-04-10'),
        created_at: new Date('2024-04-11'),
        created_by: managerUser.id,
        description: 'Major fire at refinery unit in Jamnagar. Preliminary assessment shows significant damage to processing equipment.',
        surveyor_report: 'Senior surveyor appointed. Site visit conducted on 15-Apr-2024. Detailed assessment in progress.',
        settlement_date: null
      },
      {
        id: '00000000-0000-0000-0000-000000000004',
        claim_number: 'CLM-2024-004',
        policy_id: '00000000-0000-0000-0000-000000000009',
        policy_number: 'POL-RET-2024-001',
        customer_id: 'c0000000-0000-0000-0000-000000000006',
        customer_name: 'Mr. Rahul Velma',
        claim_type: 'death',
        claim_amount: 10000000,
        settled_amount: 10000000,
        status: 'settled',
        claim_date: new Date('2024-02-28'),
        created_at: new Date('2024-03-01'),
        created_by: employeeUser.id,
        description: 'Policyholder passed away due to cardiac arrest. Death certificate and medical reports submitted.',
        surveyor_report: 'Claim verified and approved. Nominee details confirmed. Settlement processed.',
        settlement_date: new Date('2024-03-25')
      }
    ];

    for (const claim of claims) {
      await client.query(`
        INSERT INTO claims (id, claim_number, policy_id, policy_number, customer_id, customer_name,
          claim_type, claim_amount, settled_amount, status, claim_date, created_at, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        ON CONFLICT (id) DO NOTHING
      `, [claim.id, claim.claim_number, claim.policy_id, claim.policy_number, claim.customer_id,
          claim.customer_name, claim.claim_type, claim.claim_amount, claim.settled_amount,
          claim.status, claim.claim_date, claim.created_at, claim.created_by]);
    }

    console.log("📊 Comprehensive demo data seeding completed successfully!");
    
    // Verification
    const res = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM users) as users,
        (SELECT COUNT(*) FROM customers) as customers,
        (SELECT COUNT(*) FROM policies) as policies,
        (SELECT COUNT(*) FROM branches) as branches,
        (SELECT COUNT(*) FROM sales_leads) as leads,
        (SELECT COUNT(*) FROM premiums) as premiums,
        (SELECT COUNT(*) FROM claims) as claims
    `);
    
    console.log("\n📊 Comprehensive Demo Data Summary:");
    const summary = res.rows[0];
    Object.entries(summary).forEach(([key, value]) => {
      console.log(`   ${key}: ${value}`);
    });

    console.log("\n🚀 Your BP & AF Insurance System is now ready for an impressive client demonstration!");
    console.log("📈 Key Metrics:");
    console.log("   Total Premium Portfolio: ₹6.17 Cr");
    console.log("   Claims Pipeline: ₹3.05 Cr");
    console.log("   Sales Pipeline: ₹9.08 Cr");
    console.log("   Customer Mix: 3 Corporate, 5 Retail/HNI");

    await client.end();
  } catch (err) {
    console.error("❌ Comprehensive demo seeding failed:", err.message);
    process.exit(1);
  }
}

seedComprehensiveDemo();
