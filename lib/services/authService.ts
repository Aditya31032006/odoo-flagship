import { LoginCredentials, RegisterCredentials, AuthResponse } from "../domain/auth";

export const authService = {
  /**
   * Performs a sign-in request
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(credentials),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || "Login authorization failed");
    }
    return data;
  },

  /**
   * Performs 2FA OTP verification
   */
  async verify2Fa(userId: string, code: string): Promise<any> {
    const res = await fetch("/api/auth/verify-2fa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, code }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || "2FA verification failed");
    }
    return data;
  },

  /**
   * Performs an account registration request
   */
  async register(credentials: RegisterCredentials): Promise<AuthResponse> {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(credentials),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || "Account creation failed");
    }
    return data;
  },

  /**
   * Clears credentials to sign out
   */
  async logout(): Promise<void> {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
      });
    } catch (error) {
      console.error("Backend logout failed:", error);
    }
    // Clear cookies by setting maxAge to 0 on the client side
    document.cookie = "accessToken=; Max-Age=0; path=/";
  }
};
