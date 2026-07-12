import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const userId = req.headers.get("x-user-id");
  const userEmail = req.headers.get("x-user-email");
  const userUsername = req.headers.get("x-user-username");

  return NextResponse.json({
    authenticated: !!userId,
    user: userId ? {
      id: userId,
      email: userEmail,
      username: userUsername
    } : null
  });
}
