import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { userQueries } from "../../../../lib/queries/userQueries";

export async function POST(req: Request) {
  try {
    const { userId, code } = await req.json();

    if (!userId || !code) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    // Fetch user details from database
    const userResult = await userQueries.getUserById(userId);
    if (userResult.rows.length === 0) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    const user = userResult.rows[0];

    // Check if OTP code is set
    if (!user.otp_code) {
      return NextResponse.json({ message: "No verification code was requested" }, { status: 400 });
    }

    // Verify OTP code matching and expiration
    const isCodeMatch = user.otp_code === code.trim();
    const isExpired = new Date() > new Date(user.otp_expires_at);

    if (!isCodeMatch) {
      return NextResponse.json({ message: "Invalid verification code" }, { status: 400 });
    }

    if (isExpired) {
      return NextResponse.json({ message: "Verification code has expired" }, { status: 400 });
    }

    // Mark user as verified
    const updateResult = await userQueries.updateUserVerification(user.id, true);
    const updatedUser = updateResult.rows[0];

    // Generate JWT
    const secret = process.env.JWT_ACCESS_SECRET || "default_secret";
    const token = jwt.sign(
<<<<<<< HEAD
      {
        id: updatedUser.id,
        email: updatedUser.email,
        full_name: updatedUser.full_name,
        role: updatedUser.role,
        email_verified: true,
        is_verified: true
      },
=======
      { id: updatedUser.id, email: updatedUser.email, full_name: updatedUser.full_name, email_verified: true, role: updatedUser.role, department_id: updatedUser.department_id },
>>>>>>> 157961b6918317173239d4e75457c87d960fe008
      secret,
      { expiresIn: "1d" }
    );

    // Set cookie
    const response = NextResponse.json({
      message: "Two-factor authentication successful",
      user: { id: updatedUser.id, full_name: updatedUser.full_name, email: updatedUser.email, email_verified: true }
    }, { status: 200 });

    response.cookies.set({
      name: "accessToken",
      value: token,
      httpOnly: false,
      path: "/",
      maxAge: 60 * 60 * 24, // 1 day
    });

    return response;
  } catch (error: any) {
    console.error("2FA Verification Error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
