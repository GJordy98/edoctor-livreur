/**
 * Auth helpers — e-Dr TIM Delivery System
 * Gestion du token JWT et des données utilisateur en localStorage
 */

const KEYS = {
  ACCESS_TOKEN: "access_token",
  REFRESH_TOKEN: "refresh_token",
  DELIVERY_ACCOUNT: "delivery_account",
  USER_INFO: "delivery_user_info",
  PHONE: "delivery_phone_number",
  USER_ID: "delivery_user_id",
  DELIVERY_ACCOUNT_ID: "delivery_account_id",
  DELIVERY_STATUS: "delivery_status",
};

export interface UserInfo {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  telephone: string;
  profileImage: string | null;
  onboardingStatus: string;
  address: string | null;
}

// ========================
// TOKEN
// ========================

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(KEYS.ACCESS_TOKEN);
}

export function setTokens(access: string, refresh: string): void {
  localStorage.setItem(KEYS.ACCESS_TOKEN, access);
  localStorage.setItem(KEYS.REFRESH_TOKEN, refresh);
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

// ========================
// USER INFO
// ========================

export function getUserInfo(): UserInfo | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(KEYS.USER_INFO);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as UserInfo;
  } catch {
    return null;
  }
}

export function setUserInfo(info: UserInfo): void {
  localStorage.setItem(KEYS.USER_INFO, JSON.stringify(info));
}

export function getPhone(): string | null {
  if (typeof window === "undefined") return null;
  return (
    localStorage.getItem(KEYS.PHONE) ||
    localStorage.getItem("telephone") ||
    localStorage.getItem("phone") ||
    null
  );
}

export function setPhone(phone: string): void {
  localStorage.setItem(KEYS.PHONE, phone);
}

// ========================
// DELIVERY ACCOUNT ID & STATUS
// ========================

export function getDeliveryAccountId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(KEYS.DELIVERY_ACCOUNT_ID);
}

export function setDeliveryAccountId(id: string): void {
  localStorage.setItem(KEYS.DELIVERY_ACCOUNT_ID, id);
}

export function getDeliveryStatus(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(KEYS.DELIVERY_STATUS);
}

export function saveDeliveryStatus(status: string): void {
  localStorage.setItem(KEYS.DELIVERY_STATUS, status);
}

// ========================
// LOGOUT
// ========================

export function clearAuth(): void {
  Object.values(KEYS).forEach((key) => localStorage.removeItem(key));
}

// ========================
// PHONE FORMATTING (Cameroun +237)
// ========================

export function formatPhoneNumber(phone: string): string {
  phone = phone.trim();
  if (!phone.startsWith("+")) {
    if (phone.startsWith("0")) {
      phone = "+237" + phone.substring(1);
    } else if (phone.length === 9) {
      phone = "+237" + phone;
    }
  }
  return phone;
}
