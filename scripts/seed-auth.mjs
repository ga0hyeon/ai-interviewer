import { randomBytes, scryptSync } from "node:crypto";
import process from "node:process";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to seed users.");
}

function hashPassword(password) {
  const salt = randomBytes(16);
  const derived = scryptSync(password, salt, 64);
  return `${salt.toString("hex")}:${derived.toString("hex")}`;
}

const seedUsers = [
  {
    email: process.env.SEED_ADMIN_EMAIL ?? "admin@ai-interviewer.local",
    password: process.env.SEED_ADMIN_PASSWORD ?? "admin1234!",
    displayName: "Platform Admin",
    role: "admin",
  },
  {
    email: process.env.SEED_INTERVIEWER_EMAIL ?? "interviewer@ai-interviewer.local",
    password: process.env.SEED_INTERVIEWER_PASSWORD ?? "interviewer1234!",
    displayName: "Lead Interviewer",
    role: "interviewer",
  },
  {
    email: process.env.SEED_INTERVIEWEE_EMAIL ?? "interviewee@ai-interviewer.local",
    password: process.env.SEED_INTERVIEWEE_PASSWORD ?? "interviewee1234!",
    displayName: "Practice Candidate",
    role: "interviewee",
  },
];

const pool = new Pool({
  connectionString: databaseUrl,
});

try {
  for (const user of seedUsers) {
    const passwordHash = hashPassword(user.password);

    await pool.query(
      `
        INSERT INTO auth_users (email, display_name, role, password_hash)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (email)
        DO UPDATE
        SET display_name = EXCLUDED.display_name,
            role = EXCLUDED.role,
            password_hash = EXCLUDED.password_hash,
            updated_at = NOW()
      `,
      [user.email.toLowerCase(), user.displayName, user.role, passwordHash],
    );
  }

  console.log("Auth users seeded successfully.");
} finally {
  await pool.end();
}
