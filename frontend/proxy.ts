import { NextResponse, type NextRequest } from "next/server";

// ponytail: single shared Basic Auth login; move to real users/sessions when there are customers
export function proxy(request: NextRequest) {
  const user = process.env.DASHBOARD_USER;
  const pass = process.env.DASHBOARD_PASSWORD;
  const expected = user && pass ? `Basic ${btoa(`${user}:${pass}`)}` : null;

  if (expected && request.headers.get("authorization") === expected) {
    return NextResponse.next();
  }
  return new NextResponse("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Zenlor"' },
  });
}

export const config = { matcher: "/((?!_next/static|favicon.ico).*)" };
