import { NextResponse, type NextRequest } from "next/server";
import { authMode, supabaseConfigured, supabaseServer } from "@/lib/auth";
import { SESSION_COOKIE } from "@/lib/session";

export async function POST(request: NextRequest) {
  if (authMode() === "supabase" && supabaseConfigured()) await (await supabaseServer()).auth.signOut();
  const res = NextResponse.redirect(new URL("/login", request.url), { status: 303 });
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
