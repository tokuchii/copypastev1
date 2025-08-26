import { NextResponse } from "next/server";
import crypto from "crypto";

export async function GET(req: Request) {
  const ua = req.headers.get("user-agent") || "";
  const ip = req.headers.get("x-forwarded-for") || "local";
  const base = `${ua}-${ip}`;
  const fingerprint = crypto.createHash("sha256").update(base).digest("hex");

  return NextResponse.json({ fingerprint });
}
