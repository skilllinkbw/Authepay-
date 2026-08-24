import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/** POST /api/auth/signout — clear the session and return to the landing page. */
export async function POST(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  // Redirect to the app root on the same origin; never trust a client-provided
  // redirect target to avoid open-redirect abuse.
  return NextResponse.redirect(new URL("/", request.url), { status: 303 });
}
