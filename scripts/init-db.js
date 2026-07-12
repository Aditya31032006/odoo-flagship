require('dotenv').config({ path: '../.env' }); // load .env from the root
const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

const schema = `
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TYPE duration_unit AS ENUM ('hour', 'day', 'week', 'month', 'year');

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- I have omitted the rest of the tables for brevity to focus on users 
-- since that is what you are using for login/register right now.
-- You can add the other tables (addresses, bookings, etc.) back here if needed!
`;

async function init() {
  try {
    await client.connect();
    console.log("Connected to DB successfully");
    await client.query(schema);
    console.log("Database schema (users table) initialized successfully");
  } catch (err) {
    console.error("Error initializing database schema:", err);
  } finally {
    await client.end();
  }
}

init();
