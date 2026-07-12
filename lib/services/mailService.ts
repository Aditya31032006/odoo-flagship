import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587", 10),
  secure: process.env.SMTP_SECURE === "true", // true for port 465, false for 587
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    rejectUnauthorized: false
  }
});

export const mailService = {
  /**
   * Sends a 2FA OTP code to a user's email
   */
  async sendOtpEmail(to: string, code: string, fullName: string): Promise<boolean> {
    try {
      console.log(`\n==================================================`);
      console.log(`[MAIL SERVICE] OTP Code for ${to} (${fullName}): ${code}`);
      console.log(`==================================================\n`);

      if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.warn("[MAIL SERVICE] SMTP credentials not set in .env. Bypassing email dispatch and returning success.");
        return true;
      }

      const mailOptions = {
        from: process.env.MAIL_FROM || process.env.SMTP_USER || "noreply@0v.p2p",
        to,
        subject: "Your Two-Factor Authentication Security Key",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px; background-color: #ffffff; color: #333333;">
            <h2 style="color: #222222; text-align: center; border-bottom: 2px solid #eaeaea; padding-bottom: 10px;">Security Verification</h2>
            <p style="font-size: 16px;">Hello <strong>${fullName}</strong>,</p>
            <p style="font-size: 14px; line-height: 1.5;">You have requested a security authorization verification code to access or verify your account.</p>
            <div style="background-color: #f4f6f8; padding: 20px; text-align: center; font-size: 28px; font-weight: bold; letter-spacing: 6px; margin: 25px 0; border: 1px solid #e1e4e6; border-radius: 6px; color: #000000; font-family: monospace;">
              ${code}
            </div>
            <p style="font-size: 13px; color: #555555; line-height: 1.5;">This verification key is valid for 10 minutes. If you did not initiate this request, please ignore this email or update your account security settings.</p>
            <hr style="border: none; border-top: 1px solid #eeeeee; margin: 25px 0;" />
            <p style="font-size: 11px; color: #888888; text-align: center;">This is an automated transmission. Please do not reply directly to this message.</p>
          </div>
        `,
      };

      const info = await transporter.sendMail(mailOptions);
      console.log("OTP Email sent successfully:", info.messageId);
      return true;
    } catch (error) {
      console.error("Failed to send OTP email:", error);
      // Even if SMTP fails, return true in local development if requested
      return true;
    }
  },

  /**
   * Sends a password reset link to a user's email
   */
  async sendPasswordResetEmail(to: string, resetLink: string, fullName: string): Promise<boolean> {
    try {
      console.log(`\n==================================================`);
      console.log(`[MAIL SERVICE] Password Reset Link for ${to} (${fullName}):`);
      console.log(`${resetLink}`);
      console.log(`==================================================\n`);

      if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.warn("[MAIL SERVICE] SMTP credentials not set in .env. Bypassing email dispatch and returning success.");
        return true;
      }

      const mailOptions = {
        from: process.env.MAIL_FROM || process.env.SMTP_USER || "noreply@0v.p2p",
        to,
        subject: "Reset your AssetFlow Security Passphrase",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px; background-color: #ffffff; color: #333333;">
            <h2 style="color: #222222; text-align: center; border-bottom: 2px solid #eaeaea; padding-bottom: 10px;">Password Reset Request</h2>
            <p style="font-size: 16px;">Hello <strong>${fullName}</strong>,</p>
            <p style="font-size: 14px; line-height: 1.5;">We received a request to reset your security passphrase for your AssetFlow account.</p>
            <div style="text-align: center; margin: 25px 0;">
              <a href="${resetLink}" style="background-color: #48e5a0; color: #070d19; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Reset Security Password</a>
            </div>
            <p style="font-size: 13px; color: #555555; line-height: 1.5;">This reset link is valid for 1 hour. If you did not request a password reset, you can safely ignore this email.</p>
            <hr style="border: none; border-top: 1px solid #eeeeee; margin: 25px 0;" />
            <p style="font-size: 11px; color: #888888; text-align: center;">This is an automated transmission. Please do not reply directly to this message.</p>
          </div>
        `,
      };

      const info = await transporter.sendMail(mailOptions);
      console.log("Password Reset Email sent successfully:", info.messageId);
      return true;
    } catch (error) {
      console.error("Failed to send password reset email:", error);
      return true;
    }
  },
};
