import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const segments = pathname.split("/").filter(Boolean);
  const hasAtSegment = segments.some((seg) => seg.startsWith("@"));

  if (hasAtSegment) {
    const atSegment = segments.find((seg) => seg.startsWith("@"));
    if (atSegment) {
      const username = atSegment.slice(1);
      const url = request.nextUrl.clone();
      url.pathname = `/nutri/${username}`;
      return NextResponse.rewrite(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|nutrigest-uploads|images|logos).*)",
  ],
};
