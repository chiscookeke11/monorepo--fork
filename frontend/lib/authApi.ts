import { apiPost } from "./api";
import { setToken } from "./auth";

export interface LoginRequest {
  email: string;
}

export interface LoginResponse {
  message: string;
}

export interface VerifyOtpRequest {
  email: string;
  otp: string;
}

export interface VerifyOtpResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: "tenant" | "landlord" | "agent";
  };
}

export async function requestOtp(email: string): Promise<LoginResponse> {
  return apiPost<LoginResponse>("/auth/login", { email });
}

export async function verifyOtp(
  email: string,
  otp: string
): Promise<VerifyOtpResponse> {
  const res = await apiPost<VerifyOtpResponse>("/auth/verify-otp", {
    email,
    otp,
  });
  setToken(res.token);
  return res;
}