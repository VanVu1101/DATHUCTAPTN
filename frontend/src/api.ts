const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

export type LoginResponse = {
  accessToken: string;
  user: {
    userId: number;
    email: string;
    role: string;
    fullName: string | null;
    avatarUrl: string | null;
  };
};

export async function login(email: string, password: string) {
  const response = await fetch(`${API_BASE_URL}/api/auth/dang-nhap`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const data = (await response.json()) as LoginResponse & { message?: string };

  if (!response.ok) {
    throw new Error(data.message ?? "Dang nhap that bai");
  }

  return data;
}

export async function forgotPassword(email: string) {
  const response = await fetch(`${API_BASE_URL}/api/auth/quen-mat-khau`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

  return response.json() as Promise<{ message: string }>;
}

export async function changePassword(userId: number, currentPassword: string, newPassword: string) {
  const response = await fetch(`${API_BASE_URL}/api/auth/doi-mat-khau`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, currentPassword, newPassword }),
  });

  const data = (await response.json()) as { message?: string };

  if (!response.ok) {
    throw new Error(data.message ?? "Khong the doi mat khau");
  }

  return data;
}

export async function getProfile(userId: number) {
  const response = await fetch(`${API_BASE_URL}/api/profile?userId=${userId}`);
  return response.json();
}

export async function updateProfile(userId: number, payload: Record<string, string>) {
  const response = await fetch(`${API_BASE_URL}/api/profile`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, ...payload }),
  });

  return response.json();
}

export async function getLoginHistory(userId: number) {
  const response = await fetch(`${API_BASE_URL}/api/auth/lich-su-dang-nhap?userId=${userId}`);
  return response.json();
}