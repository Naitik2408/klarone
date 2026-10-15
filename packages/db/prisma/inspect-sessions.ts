import { Pool } from "pg";
import path from "node:path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function inspect() {
  const users = await pool.query('SELECT * FROM "user"');
  console.log("Users in Better Auth table:", users.rows);

  const sessions = await pool.query('SELECT * FROM "session"');
  console.log("Sessions in Better Auth table:", sessions.rows);

  await pool.end();
}

inspect().catch(console.error);
