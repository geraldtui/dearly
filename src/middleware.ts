import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { authGuardDisabled } from "@/lib/dev-auth";

/** URL prefixes that require a logged-in user (the `(app)` route group). */
const PROTECTED_PREFIXES = ["/voicenotes", "/inbox", "/sent", "/compose"];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  // Refresh the session if needed; required for Server Components to see it.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Redirect authenticated users away from homepage to their voice notes
  if (user && request.nextUrl.pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/voicenotes";
    return NextResponse.redirect(url);
  }

  const needsAuth = PROTECTED_PREFIXES.some((p) => request.nextUrl.pathname.startsWith(p));
  if (needsAuth && !user && !authGuardDisabled()) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  // Skip static assets and images; run everywhere else (so sessions stay fresh).
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-icon.svg).*)"],
};
