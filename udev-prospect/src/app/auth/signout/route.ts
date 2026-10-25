import { NextResponse, type NextRequest } from "next/server";
import { supabaseConfigured, supabaseServer } from "@/lib/auth";

export async function POST(request: NextRequest) {
  if (supabaseConfigured()) await (await supabaseServer()).auth.signOut();
  return NextResponse.redirect(new URL("/login", request.url), { status: 303 });
}
