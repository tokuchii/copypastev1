import { NextResponse } from "next/server";
import { userStore } from "./../../lib/db";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const fingerprint = url.searchParams.get("fingerprint");
  if (!fingerprint) return new NextResponse("Missing fingerprint", { status: 400 });

  const user = userStore[fingerprint] || { copies: 0 };
  return NextResponse.json({ validUntil: user.validUntil });
}
