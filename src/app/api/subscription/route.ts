import { NextResponse } from "next/server";
import { userStore } from "./../../lib/db";

export async function POST(req: Request) {
  const { fingerprint } = await req.json();
  if (!fingerprint) return new NextResponse("Missing fingerprint", { status: 400 });

  const validUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  userStore[fingerprint] = { copies: 0, validUntil: validUntil.toISOString() };

  return NextResponse.json({ success: true, validUntil });
}
