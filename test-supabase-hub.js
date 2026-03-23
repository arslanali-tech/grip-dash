// Quick test script to verify Supabase hub tables
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

console.log('Supabase URL:', supabaseUrl);
console.log('Has Anon Key:', !!supabaseAnonKey);

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testTables() {
  console.log('\n--- Testing hub_folders table ---');
  const { data: folders, error: foldersError } = await supabase
    .from('hub_folders')
    .select('*')
    .limit(1);
  
  console.log('Folders result:', { data: folders, error: foldersError });

  console.log('\n--- Testing hub_documents table ---');
  const { data: docs, error: docsError } = await supabase
    .from('hub_documents')
    .select('*')
    .limit(1);
  
  console.log('Documents result:', { data: docs, error: docsError });

  console.log('\n--- Testing storage bucket ---');
  const { data: buckets, error: bucketsError } = await supabase
    .storage
    .listBuckets();
  
  console.log('Buckets:', buckets?.map(b => b.name));
  console.log('Buckets error:', bucketsError);
}

testTables();
