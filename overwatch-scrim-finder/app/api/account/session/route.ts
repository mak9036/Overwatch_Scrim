import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getPosterAccountFromRequest } from "@/lib/account-auth";

export async function GET(request: NextRequest) {
  const account = getPosterAccountFromRequest(request);
  if (!account) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  return NextResponse.json({ authenticated: true, account });
}
