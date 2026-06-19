import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * POST /api/auth/check-email
 * 
 * Checks if an email is already registered in Supabase Auth.
 * Uses service role to query auth.users.
 * 
 * Body: { email: string }
 * Returns: { exists: boolean }
 */
export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    
    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }
    
    const supabase = createServiceClient();
    
    // Query auth.users using admin API
    const { data, error } = await supabase.auth.admin.listUsers();
    
    if (error) {
      console.error("Error checking email existence:", error);
      // Fail open - let signup handle it
      return NextResponse.json({ exists: false });
    }
    
    const normalizedEmail = email.trim().toLowerCase();
    const exists = data.users.some(
      user => user.email?.toLowerCase() === normalizedEmail
    );
    
    return NextResponse.json({ exists });
  } catch (error) {
    console.error("Error in check-email route:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
