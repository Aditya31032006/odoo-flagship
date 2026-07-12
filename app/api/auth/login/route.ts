import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
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

    // If email is already verified, bypass 2FA and login directly
    if (user.email_verified) {
      const secret = process.env.JWT_ACCESS_SECRET || "default_secret";
      const token = jwt.sign(
        {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          role: user.role,
          email_verified: true,
          is_verified: true
        },
        secret,
        { expiresIn: "1d" }
      );

      const response = NextResponse.json({
        message: "Login successful",
        twoFactorRequired: false,
        user: { id: user.id, full_name: user.full_name, email: user.email, email_verified: true }
      }, { status: 200 });

      response.cookies.set({
        name: "accessToken",
        value: token,
        httpOnly: false,
        path: "/",
        maxAge: 60 * 60 * 24, // 1 day
      });

      return response;
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
