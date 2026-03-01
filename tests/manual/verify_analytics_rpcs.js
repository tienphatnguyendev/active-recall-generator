import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
// Provide these in .env.local or via shell export
const testEmail = process.env.TEST_USER_EMAIL || 'test@example.com'; 
const testPassword = process.env.TEST_USER_PASSWORD || 'password123';

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in environment");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verify() {
  console.log(`Authenticating as ${testEmail}...`);
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: testEmail,
    password: testPassword,
  });

  if (authError || !authData.user) {
    console.error("Authentication failed:", authError?.message || "No user returned");
    process.exit(1);
  }

  console.log(`Successfully authenticated as User ID: ${authData.user.id}`);
  console.log("");

  const rpcs = ['get_user_streak', 'get_weekly_activity', 'get_mastery_distribution'];

  for (const rpc of rpcs) {
    console.log(`--- Testing ${rpc} ---`);
    const { data, error } = await supabase.rpc(rpc);
    
    if (error) {
      console.error(`❌ Error calling ${rpc}:`, error.message);
    } else {
      console.log(`✅ Success! Data returned:`);
      console.log(JSON.stringify(data, null, 2));
    }
    console.log("");
  }
}

verify().catch(console.error);
