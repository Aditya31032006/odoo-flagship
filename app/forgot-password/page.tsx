"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import AuthLayout from "../../components/auth/AuthLayout";
import AuthCard from "../../components/auth/AuthCard";
import AuthInput from "../../components/auth/AuthInput";
import AuthButton from "../../components/auth/AuthButton";
import "../../styles/auth.scss";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Please enter your email address");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to submit request");
      }

      toast.success("Reset link sent if account exists");
      setSubmitted(true);
    } catch (error: any) {
      toast.error(error.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout footerStyle="signin">
      <ToastContainer position="top-right" autoClose={3000} theme="dark" />

      {submitted ? (
        <AuthCard
          title="Reset Email Sent"
          description="If an account exists with this email, you will receive a secure password reset link shortly."
        >
          <div className="auth-text-btn-container" style={{ marginTop: "24px" }}>
            <Link href="/login" className="auth-text-btn">
              Return to Sign In
            </Link>
          </div>
        </AuthCard>
      ) : (
        <AuthCard
          title="Recover Password"
          description="Enter your email below to request a security passphrase reset link."
        >
          <form className="auth-form" onSubmit={handleSubmit}>
            {/* Email Address Input */}
            <AuthInput
              id="forgot-email"
              name="email"
              label="Email Address"
              type="email"
              placeholder="name@company.com"
              value={email}
              required
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />

            {/* Submit Button */}
            <AuthButton type="submit" loading={loading} showArrow>
              Send Reset Link
            </AuthButton>

            {/* Divider */}
            <div className="auth-divider">
              <span>or</span>
            </div>

            {/* Back to Login Link */}
            <div className="auth-text-btn-container">
              <Link href="/login" className="auth-text-btn">
                Return to Sign In
              </Link>
            </div>
          </form>
        </AuthCard>
      )}
    </AuthLayout>
  );
}
