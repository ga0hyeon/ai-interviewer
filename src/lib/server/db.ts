import "server-only";

import { Pool, type PoolConfig } from "pg";

declare global {
  var __aiInterviewerDbPool: Pool | undefined;
}

function getPoolConfig(): PoolConfig {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured.");
  }

  return {
    connectionString,
    max: 10,
  };
}

export function getDbPool() {
  if (!global.__aiInterviewerDbPool) {
    global.__aiInterviewerDbPool = new Pool(getPoolConfig());
  }

  return global.__aiInterviewerDbPool;
}
