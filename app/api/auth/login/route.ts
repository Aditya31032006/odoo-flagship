import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { userQueries } from "../../../../lib/queries/userQueries";
import { mailService } from "../../../../lib/services/mailService";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    // Find user by email or username
    const userResult = await userQueries.getUserByEmailOrUsername(email);
    if (userResult.rows.length === 0) {
      return NextResponse.json({ message: "Invalid credentials" }, { status: 401 });
    }

    const user = userResult.rows[0];

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return NextResponse.json({ message: "Invalid credentials" }, { status: 401 });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    // Update OTP in database
    await userQueries.updateUserOtp(user.id, otp, expiresAt);

    // Send verification email
    const emailSent = await mailService.sendOtpEmail(user.email, otp, user.full_name);
    if (!emailSent) {
      return NextResponse.json({ message: "Failed to send 2FA verification email" }, { status: 500 });
    }

    return NextResponse.json({
      message: "2FA code sent to your email",
      twoFactorRequired: true,
      userId: user.id,
      email: user.email
    }, { status: 200 });
  } catch (error: any) {
    console.error("Login Error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
