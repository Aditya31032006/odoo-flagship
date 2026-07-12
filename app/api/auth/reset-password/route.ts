import { NextResponse } from "next/server";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { userQueries } from "../../../../lib/queries/userQueries";

export async function POST(req: Request) {
  try {
    const { token, password } = await req.json();

    if (!token || !password) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ message: "Password must be at least 6 characters" }, { status: 400 });
    }

    // Hash the token received to match stored hash
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    // Fetch token details
    const tokenResult = await userQueries.getPasswordResetToken(tokenHash);
    if (tokenResult.rows.length === 0) {
      return NextResponse.json({ message: "Invalid or expired reset token" }, { status: 400 });
    }

    const resetRecord = tokenResult.rows[0];

    // Check if token already used
    if (resetRecord.used_at) {
      return NextResponse.json({ message: "This reset token has already been used" }, { status: 400 });
    }

    // Check expiration
    const isExpired = new Date() > new Date(resetRecord.expires_at);
    if (isExpired) {
      return NextResponse.json({ message: "Reset token has expired" }, { status: 400 });
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(password, 10);

    // Update user password
    await userQueries.updateUserPassword(resetRecord.user_id, newPasswordHash);

    // Mark token as used
    await userQueries.markPasswordResetTokenUsed(resetRecord.id);

    return NextResponse.json({
      message: "Security password reset successful. Please sign in."
    }, { status: 200 });
  } catch (error: any) {
    console.error("Reset Password Error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
