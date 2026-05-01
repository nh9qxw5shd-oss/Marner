'use client';

import { createClient } from '@supabase/supabase-js';

function makeClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      db: { schema: 'marner' },
      auth: { persistSession: false },
    }
  );
}

let client: ReturnType<typeof makeClient> | null = null;

export function getSupabase() {
  if (!client) client = makeClient();
  return client;
}
