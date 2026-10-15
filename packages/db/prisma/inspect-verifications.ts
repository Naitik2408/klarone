import { Pool } from "pg";
import path from "node:path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function inspect() {
  const res = await pool.query('SELECT * FROM "verification"');
  console.log("Records found:", res.rows.length);
  for (const row of res.rows) {
    console.log("Identifier:", row.identifier, "| Value:", row.value, "| Expires:", row.expiresAt);
  }
  await pool.end();
}

inspect().catch(console.error);
