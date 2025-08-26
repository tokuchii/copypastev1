import { NextResponse } from "next/server";
import { userStore } from "./../../lib/db";

const MAX_FREE_COPIES = 1;
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_MINUTE = 30;

const ipRequests: Record<string, { count: number; lastReset: number }> = {};

type Cell = string | { value: string; rate?: number; unit?: number };
type Row = Cell[];

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for") || "local";
  const now = Date.now();

  // Initialize/reset rate limiter for IP
  if (!ipRequests[ip]) {
    ipRequests[ip] = { count: 0, lastReset: now };
  } else if (now - ipRequests[ip].lastReset > RATE_LIMIT_WINDOW) {
    ipRequests[ip] = { count: 0, lastReset: now };
  }

  ipRequests[ip].count++;

  // Block if too many requests in the last minute
  if (ipRequests[ip].count > MAX_REQUESTS_PER_MINUTE) {
    return new NextResponse("Too many requests, slow down.", { status: 429 });
  }

  const { fingerprint, rows }: { fingerprint: string; rows: Row[] } = await req.json();
  if (!fingerprint) return new NextResponse("Missing fingerprint", { status: 400 });

  const user = userStore[fingerprint] || { copies: 0 };
  const nowDate = new Date();

  const hasActiveSub = user.validUntil && new Date(user.validUntil) > nowDate;

  const hasValues = rows.some((row) =>
    row.some((cell) => {
      if (typeof cell === "string" && cell.trim() !== "") return true;
      if (typeof cell === "object" && cell.value.trim() !== "") return true;
      return false;
    })
  );

  if (!hasActiveSub && user.copies >= MAX_FREE_COPIES) {
    return new NextResponse("Limit reached", { status: 403 });
  }

  const totalCols = 19;
  let output = "";

  rows.forEach((row) => {
    const fullRow = Array.from({ length: totalCols }, (_, i) => {
      const cell = row[i] || "";
      if (typeof cell === "string") return i === 0 ? cell.toUpperCase() : cell;
      if (typeof cell === "object" && "value" in cell) {
        if (cell.rate !== undefined && cell.unit !== undefined) return `=${cell.rate}*${cell.unit}`;
        return cell.value.replace(/^PHP\s*/i, "");
      }
      return "";
    });
    if (fullRow.some((v) => v.trim() !== "")) output += fullRow.join("\t") + "\n";
  });

  if (hasValues && !hasActiveSub) {
    userStore[fingerprint] = { ...user, copies: user.copies + 1 };
  }

  return NextResponse.json({ tsv: output });
}
