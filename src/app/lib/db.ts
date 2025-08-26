// Simple in-memory mock DB (replace with Firestore/MySQL/Postgres in production)
export const userStore: Record<
  string,
  { copies: number; validUntil?: string }
> = {};
