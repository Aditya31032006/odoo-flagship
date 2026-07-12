import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { userQueries } from "../../../../lib/queries/userQueries";

export async function POST(req: Request) {
  try {
    const { name, email, password } = await req.json();

    if (!name) return NextResponse.json({ message: "Name is required" }, { status: 400 });
    if (!email) return NextResponse.json({ message: "Email is required" }, { status: 400 });
    if (!password) return NextResponse.json({ message: "Password is required" }, { status: 400 });

    // Check if user exists by email
    const userCheck = await userQueries.checkUserExists(email);
    if (userCheck.rows.length > 0) {
      return NextResponse.json({ message: "User with this email already exists" }, { status: 400 });
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);

    // Insert user
    const insertResult = await userQueries.insertUser(name, email, password_hash);

    const newUser = insertResult.rows[0];

    // Generate JWT
    const secret = process.env.JWT_ACCESS_SECRET || "default_secret";
    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, full_name: newUser.full_name, email_verified: newUser.email_verified || false },
      secret,
      { expiresIn: "1d" }
    );

    // Set cookie and return token
    const response = NextResponse.json({
      message: "User registered successfully",
      user: newUser,
      token: token
    }, { status: 201 });

    response.cookies.set({
      name: "accessToken",
      value: token,
      httpOnly: false,
      path: "/",
      maxAge: 60 * 60 * 24, // 1 day
    });

    return response;
  } catch (error: any) {
    console.error("Register Error:", error);
    return NextResponse.json({ message: "Internal server error", details: error.message }, { status: 500 });
  }
}
