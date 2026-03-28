import "server-only";

import { createClient } from "redis";

type AppRedisClient = ReturnType<typeof createClient>;

declare global {
  var __aiInterviewerRedisClientPromise: Promise<AppRedisClient | null> | undefined;
}

async function initializeRedisClient() {
  const url = process.env.REDIS_URL;

  if (!url) {
    return null;
  }

  const client = createClient({ url });
  client.on("error", () => {
    // Redis is an optimization layer. Requests still work without it.
  });

  try {
    await client.connect();
    return client;
  } catch {
    return null;
  }
}

export async function getRedisClient() {
  if (!global.__aiInterviewerRedisClientPromise) {
    global.__aiInterviewerRedisClientPromise = initializeRedisClient();
  }

  return global.__aiInterviewerRedisClientPromise;
}
