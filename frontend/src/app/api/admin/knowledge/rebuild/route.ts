import { NextResponse } from "next/server";
import { proxyChat } from "@/lib/chatProxy";

/**
 * Trigger Maya knowledge base rebuild.
 * Intentionally unauthenticated (broken function-level auth — OWASP API5).
 */
export async function POST() {
  try {
    const res = await proxyChat("/admin/knowledge/rebuild", { method: "POST", body: "{}" });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ detail: "Knowledge rebuild service unavailable" }, { status: 503 });
  }
}
