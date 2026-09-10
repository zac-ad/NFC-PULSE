// node scripts/create-org.mjs "Company Name"
import { createClient } from '@supabase/supabase-js';
import { randomBytes, scryptSync } from 'crypto';

function hashAccessCode(code) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(code, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

const name = process.argv[2];
if (!name) { console.error('Usage: node scripts/create-org.mjs "Company Name"'); process.exit(1); }

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const accessCode = randomBytes(9).toString('base64url');
const { data, error } = await supabase.from('organizations')
  .insert({ name, access_code_hash: hashAccessCode(accessCode) }).select().single();

if (error) { console.error('Failed:', error.message); process.exit(1); }
console.log(`Created: ${data.name} (${data.id})`);
console.log(`Access code (save this — shown once): ${accessCode}`);
