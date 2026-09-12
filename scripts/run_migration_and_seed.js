const fs = require('fs');
const cp = require('child_process');

function parseEnv(text){
  const lines = text.split(/\r?\n/);
  const env = {};
  for(const l of lines){
    const m = l.match(/^([^=#\s]+)=(.*)$/);
    if(!m) continue;
    let val = m[2];
    if(val.startsWith("'") && val.endsWith("'")) val = val.slice(1,-1);
    if(val.startsWith('"') && val.endsWith('"')) val = val.slice(1,-1);
    env[m[1]] = val;
  }
  return env;
}

try{
  const txt = fs.readFileSync('.env.local','utf8');
  const env = parseEnv(txt);
  // Ensure SUPABASE_URL is available for the seed script (may be stored as NEXT_PUBLIC_SUPABASE_URL)
  if (!env.SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_URL) env.SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
  const url = env.DIRECT_DATABASE_URL;
  if(!url){ console.error('DIRECT_DATABASE_URL not found in .env.local'); process.exit(2); }

  console.log('Running migration SQL via psql...');
  let r = cp.spawnSync('psql', [url, '-v', 'ON_ERROR_STOP=1', '-f', '/tmp/migrate_role.sql'], { stdio: 'inherit' });
  if(r.status !== 0){ console.error('Migration failed'); process.exit(r.status||1); }

  console.log('\nEnum after migration:');
  r = cp.spawnSync('psql', [url, '-c', 'SELECT enum_range(NULL::role);'], { stdio: 'inherit' });
  if(r.status !== 0){ console.error('Enum check failed'); process.exit(r.status||1); }

  console.log('\nRunning seed script (npm run seed)...');
  r = cp.spawnSync('npm', ['run', 'seed'], { stdio: 'inherit', env: Object.assign({}, process.env, env) });
  if(r.status !== 0){ 
    console.error('Seed (npm) failed, attempting SQL fallback seed...');
    if (fs.existsSync('scripts/seed.sql')) {
      const r2 = cp.spawnSync('psql', [url, '-v', 'ON_ERROR_STOP=1', '-f', 'scripts/seed.sql'], { stdio: 'inherit' });
      if (r2.status !== 0) { console.error('SQL fallback seed failed'); process.exit(r2.status||1); }
    } else {
      console.error('No SQL fallback seed found at scripts/seed.sql');
      process.exit(r.status||1);
    }
  }

  console.log('\nVerifying seeded users:');
  r = cp.spawnSync('psql', [url, '-c', "SELECT email, role FROM users WHERE email IN ('boss@example.com','manager@example.com','employee1@example.com','employee2@example.com');"], { stdio: 'inherit' });
  process.exit(r.status||0);
} catch(e){
  console.error(e);
  process.exit(1);
}
