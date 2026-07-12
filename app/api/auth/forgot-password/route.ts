import { NextResponse } from "next/server";
import crypto from "crypto";
import { userQueries } from "../../../../lib/queries/userQueries";
import { mailService } from "../../../../lib/services/mailService";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ message: "Email is required" }, { status: 400 });
    }

    // Find user by email
    const userResult = await userQueries.getUserByEmailOrUsername(email);
    if (userResult.rows.length === 0) {
      // Return a successful status anyway to prevent email enumeration attacks
      return NextResponse.json({
        message: "If a user is registered with this email, a reset link will be sent shortly."
      }, { status: 200 });
    }

    const user = userResult.rows[0];

    // Generate raw token
    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

    // Save token to DB
    await userQueries.createPasswordResetToken(user.id, tokenHash, expiresAt);

    // Build reset link
    const origin = req.headers.get("origin") || "http://localhost:3000";
    const resetLink = `${origin}/reset-password?token=${token}`;

    // Send reset email
    await mailService.sendPasswordResetEmail(user.email, resetLink, user.full_name);

    return NextResponse.json({
      message: "If a user is registered with this email, a reset link will be sent shortly."
    }, { status: 200 });
  } catch (error: any) {
    console.error("Forgot Password Error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
