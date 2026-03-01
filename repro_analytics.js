const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Environment variables NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function repro() {
  const email = `test-${Date.now()}@example.com`;
  const password = 'password123';

  console.log(`Signing up ${email}...`);
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (signUpError) {
    console.error('Sign up error:', signUpError);
    return;
  }

  const user = signUpData.user;
  const session = signUpData.session;
  console.log(`User created: ${user.id}`);

  // Create an artifact
  console.log('Creating artifact...');
  const { data: artifactData, error: artifactError } = await supabase
    .from('artifacts')
    .insert({
      user_id: user.id,
      title: 'Reproduction Artifact',
      source_hash: 'repro-hash',
      outline: [],
    })
    .select()
    .single();

  if (artifactError) {
    console.error('Artifact error:', artifactError);
    return;
  }

  // Create a card
  console.log('Creating card...');
  const { data: cardData, error: cardError } = await supabase
    .from('cards')
    .insert({
      artifact_id: artifactData.id,
      question: 'Repro Question',
      answer: 'Repro Answer',
      fsrs_state: 2, // Review
      fsrs_stability: 25, // Mastered
    })
    .select()
    .single();

  if (cardError) {
    console.error('Card error:', cardError);
    return;
  }

  // Create a study session
  console.log('Creating study session...');
  const { error: sessionError } = await supabase
    .from('study_sessions')
    .insert({
      user_id: user.id,
      card_id: cardData.id,
      rating: 3, // Good
      duration_ms: 1000,
      reviewed_at: new Date().toISOString(),
    });

  if (sessionError) {
    console.error('Session error:', sessionError);
    return;
  }

  console.log('Session created.');

  // Now call the analytics API with Bearer token
  console.log('Calling /api/analytics with Bearer token...');
  const res = await fetch('http://localhost:3000/api/analytics', {
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  const analyticsData = await res.json();
  console.log('Analytics response status:', res.status);
  console.log('Analytics response data:', JSON.stringify(analyticsData, null, 2));
}

repro();
