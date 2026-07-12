import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json(
    { message: "Logged out successfully" },
    { status: 200 }
  );

  // Clear cookie from the server side
  response.cookies.set({
    name: "accessToken",
    value: "",
    maxAge: 0,
    path: "/",
  });

  return response;
}
