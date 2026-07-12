"use client";

import React, { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import AuthLayout from "../../components/auth/AuthLayout";
import AuthCard from "../../components/auth/AuthCard";
import AuthInput from "../../components/auth/AuthInput";
import AuthButton from "../../components/auth/AuthButton";
import "../../styles/auth.scss";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!token) {
      toast.error("Invalid or missing password reset token");
      return;
    }

    if (!password) {
      toast.error("Password is required");
      return;
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters long");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to reset password");
      }

      toast.success("Password reset successful!");
      setTimeout(() => {
        router.push("/login");
      }, 1500);
    } catch (error: any) {
      toast.error(error.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <AuthCard
        title="Invalid Link"
        description="The password reset security token is missing or has expired."
      >
        <div className="auth-text-btn-container" style={{ marginTop: "24px" }}>
          <Link href="/login" className="auth-text-btn">
            Return to Sign In
          </Link>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Reset Password"
      description="Enter and verify your new security passphrase below."
    >
      <form className="auth-form" onSubmit={handleSubmit}>
        {/* New Password Input */}
        <AuthInput
          id="reset-password"
          name="password"
          label="New Password"
          type="password"
          placeholder="••••••••"
          value={password}
          required
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
        />

        {/* Confirm Password Input */}
        <AuthInput
          id="reset-confirm-password"
          name="confirmPassword"
          label="Confirm Password"
          type="password"
          placeholder="••••••••"
          value={confirmPassword}
          required
          onChange={(e) => setConfirmPassword(e.target.value)}
          autoComplete="new-password"
        />

        {/* Submit Button */}
        <AuthButton type="submit" loading={loading} showArrow>
          Reset Password
        </AuthButton>

        {/* Back to Login Link */}
        <div className="auth-text-btn-container" style={{ marginTop: "16px" }}>
          <Link href="/login" className="auth-text-btn">
            Cancel
          </Link>
        </div>
      </form>
    </AuthCard>
  );
}

export default function ResetPassword() {
  return (
    <AuthLayout footerStyle="signin">
      <ToastContainer position="top-right" autoClose={3000} theme="dark" />
      <Suspense fallback={
        <AuthCard title="Loading" description="Retrieving session details...">
          <div style={{ textAlign: "center", color: "#64748b", padding: "20px" }}>
            Processing credential validation...
          </div>
        </AuthCard>
      }>
        <ResetPasswordForm />
      </Suspense>
    </AuthLayout>
  );
}
