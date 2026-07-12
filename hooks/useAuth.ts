import { useState } from "react";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import { authService } from "../lib/services/authService";
import { validateLogin, validateRegister, LoginCredentials, RegisterCredentials } from "../lib/domain/auth";

export default function useAuth() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function RegisterUser(formValues: RegisterCredentials) {
    // 1. Domain Validation
    const validationError = validateRegister(formValues);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    try {
      setLoading(true);
      await authService.register(formValues);
      toast.success("Account created successfully!");
      router.push("/login");
    } catch (error: any) {
      toast.error(error.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  async function LoginUser(formValues: LoginCredentials) {
    // 2. Domain Validation
    const validationError = validateLogin(formValues);
    if (validationError) {
      toast.error(validationError);
      return null;
    }

    try {
      setLoading(true);
      const data = await authService.login(formValues);
      if (!data.twoFactorRequired) {
        toast.success("Welcome back!");
        router.push("/dashboard");
      }
      return data;
    } catch (error: any) {
      toast.error(error.message || "Login failed");
      return null;
    } finally {
      setLoading(false);
    }
  }

  async function VerifyTwoFactor(userId: string, code: string) {
    try {
      setLoading(true);
      const data = await authService.verify2Fa(userId, code);
      toast.success("Identity verified! Welcome back.");
      router.push("/dashboard");
      return data;
    } catch (error: any) {
      toast.error(error.message || "Verification failed");
      return null;
    } finally {
      setLoading(false);
    }
  }

  async function LogoutUser() {
    try {
      await authService.logout();
      toast.success("Logged out successfully");
      router.push("/login");
    } catch (error: any) {
      toast.error("Logout failed");
    }
  }

  return { RegisterUser, LoginUser, VerifyTwoFactor, LogoutUser, loading };
}
