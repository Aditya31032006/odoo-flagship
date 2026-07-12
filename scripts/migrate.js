import pg from 'pg';
import fs from 'fs';

const envPath = './.env';
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    const key = parts[0].trim();
    const value = parts.slice(1).join('=').trim();
    envVars[key] = value;
  }
});

const databaseUrl = envVars['DATABASE_URL'];
if (!databaseUrl) {
  console.error("DATABASE_URL not found in .env");
  process.exit(1);
}

console.log("Connecting to database...");
const { Client } = pg;
const client = new Client({
  connectionString: databaseUrl,
});

async function run() {
  try {
    await client.connect();
    console.log("Connected successfully. Running migration query...");
    
    const query = `
      ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_code VARCHAR(6);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_expires_at TIMESTAMP;
    `;
    
    await client.query(query);
    console.log("Migration completed successfully!");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await client.end();
  }
}

run();
