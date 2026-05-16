import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://lgvxvmpvckclsfiowutv.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxndnh2bXB2Y2tjbHNmaW93dXR2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODgyNjkzNywiZXhwIjoyMDk0NDAyOTM3fQ.080zG15zV03EhRTSvaMxkOEjbD_gzvUDn4YEWi3UiR8'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

const users = [
  {
    email: 'admin@bpaf.com',
    password: 'Admin@123456',
    role: 'admin',
    name: 'Admin User',
    phone: '9876500001'
  },
  {
    email: 'manager@bpaf.com',
    password: 'Manager@123456',
    role: 'manager',
    name: 'Priya Sharma',
    phone: '9876500002'
  },
  {
    email: 'employee@bpaf.com',
    password: 'Employee@123456',
    role: 'employee',
    name: 'Rahul Verma',
    phone: '9876500003'
  }
]

const BRANCH_ID = '10000000-0000-0000-0000-000000000001'

// Ensure branch exists
const { error: branchErr } = await supabase.from('branches').upsert({
  id: BRANCH_ID,
  name: 'BP & AF Main Branch',
  address: '42 Insurance Tower, MG Road',
  city: 'Mumbai',
  state: 'Maharashtra',
  pincode: '400001',
  phone: '2212345678',
  is_active: true
}, { onConflict: 'id' })

if (branchErr) console.error('Branch error:', branchErr.message)
else console.log('✅ Branch ready')

for (const u of users) {
  console.log(`\nCreating ${u.email}...`)

  // Create auth user via Admin API (handles instance_id correctly)
  const { data, error } = await supabase.auth.admin.createUser({
    email: u.email,
    password: u.password,
    email_confirm: true,
    app_metadata: { role: u.role },
    user_metadata: { name: u.name, role: u.role }
  })

  if (error) {
    console.error(`  ❌ Auth error: ${error.message}`)
    continue
  }

  console.log(`  ✅ Auth user created: ${data.user.id}`)

  // Create profile in public.users table
  const { error: profileErr } = await supabase.from('users').upsert({
    id: data.user.id,
    name: u.name,
    email: u.email,
    role: u.role,
    status: 'active',
    phone: u.phone,
    branch_id: BRANCH_ID,
    bio: u.role === 'admin' ? 'System Administrator' : u.role === 'manager' ? 'Branch Manager' : 'Insurance Advisor'
  }, { onConflict: 'id' })

  if (profileErr) console.error(`  ❌ Profile error: ${profileErr.message}`)
  else console.log(`  ✅ Profile created`)
}

console.log('\n✅ Done! Users created successfully.')
console.log('\nLogin credentials:')
users.forEach(u => console.log(`  ${u.email} / ${u.password}`))
