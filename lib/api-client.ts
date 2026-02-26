/**
 * API Client — e-Dr TIM Delivery System
 * Centralize all API calls (migrated from config_delivery.js + individual JS files)
 */

// ========================
// CONFIGURATION
// ========================

export const API_BASE_URL = "https://e-doctorpharma.onrender.com/api/v1";

export const ENDPOINTS = {
  // Auth
  LOGIN: "/login/",
  SEND_OTP: "/send-otp/",
  VALID_OTP: "/valid-otp/",

  // Registration
  REGISTER_DRIVER: "/delivery/",

  // Delivery Driver
  DRIVER_LOCALISATION: "/driver-localisation/",
  SET_AVAILABILITY: "/driver-availability/",
  LAST_MISSION: "/delivery/last_mission_assigned/",
  ACTIVE_MISSIONS: "/delivery/active_missions/",
  ACCEPT_MISSION: (missionId: string) =>
    `/mission/${missionId}/accept_mission_order/`,
  CANCEL_MISSION: (missionId: string) =>
    `/mission/${missionId}/cancel_mission/`,
  COMPLETE_MISSION: (missionId: string) =>
    `/mission/${missionId}/complete_mission/`,

  // Notifications
  REGISTER_FCM_TOKEN: "/register-fcm-token/",
  NOTIFICATIONS_LIST: "/notification-user/list_notification_user/",
};

// ========================
// HELPER
// ========================

function getAuthHeaders(): HeadersInit {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.detail || errorData.message || `Erreur API: ${response.status}`,
    );
  }
  return response.json() as Promise<T>;
}

// ========================
// TOKEN REFRESH
// ========================

let _isRefreshing = false;

async function refreshAccessToken(): Promise<string> {
  const refreshToken =
    typeof window !== "undefined" ? localStorage.getItem("refresh_token") : null;
  if (!refreshToken) {
    if (typeof window !== "undefined") {
      localStorage.removeItem("access_token");
      window.location.href = "/login";
    }
    throw new Error("No refresh token available");
  }
  const res = await fetch(`${API_BASE_URL}/token/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh: refreshToken }),
  });
  if (!res.ok) {
    if (typeof window !== "undefined") {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    throw new Error("Session expirée. Veuillez vous reconnecter.");
  }
  const data = (await res.json()) as { access: string; refresh?: string };
  if (typeof window !== "undefined") {
    localStorage.setItem("access_token", data.access);
    if (data.refresh) localStorage.setItem("refresh_token", data.refresh);
  }
  return data.access;
}

/**
 * Wrapper autour de fetch qui gère automatiquement le refresh du token JWT.
 * En cas de 401, tente un refresh puis réessaie la requête une fois.
 */
async function fetchWithRefresh(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  const response = await fetch(url, options);
  if (response.status === 401 && !_isRefreshing) {
    try {
      _isRefreshing = true;
      const newToken = await refreshAccessToken();
      _isRefreshing = false;
      const newHeaders: Record<string, string> = {
        ...(options.headers as Record<string, string>),
        Authorization: `Bearer ${newToken}`,
      };
      return fetch(url, { ...options, headers: newHeaders });
    } catch {
      _isRefreshing = false;
      throw new Error("Session expirée. Veuillez vous reconnecter.");
    }
  }
  return response;
}

// ========================
// AUTH ENDPOINTS
// ========================

export interface LoginResponse {
  access: string;
  refresh: string;
  account: {
    user: {
      id: number;
      first_name: string;
      last_name: string;
      email: string;
      telephone: string;
      role: string;
    };
    profile_image: string | null;
    onboarding_status: string;
    adresse: string | null;
  };
}

export async function login(
  telephone: string,
  password: string,
): Promise<LoginResponse> {
  const response = await fetch(`${API_BASE_URL}${ENDPOINTS.LOGIN}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ telephone, password }),
  });
  return handleResponse<LoginResponse>(response);
}

export async function sendOtp(
  telephone: string,
): Promise<{ status: boolean; message?: string }> {
  const response = await fetch(`${API_BASE_URL}${ENDPOINTS.SEND_OTP}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ telephone }),
  });
  return handleResponse(response);
}

export async function verifyOtp(
  telephone: string,
  otp: string,
): Promise<{ status: boolean; message?: string; error?: string }> {
  const response = await fetch(`${API_BASE_URL}${ENDPOINTS.VALID_OTP}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ telephone, otp }),
  });
  return handleResponse(response);
}

// ========================
// DRIVER ENDPOINTS
// ========================

export async function sendPosition(
  latitude: number,
  longitude: number,
): Promise<void> {
  const response = await fetchWithRefresh(
    `${API_BASE_URL}${ENDPOINTS.DRIVER_LOCALISATION}`,
    {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ latitude, longitude }),
    },
  );
  if (!response.ok) {
    console.error("Failed to send position:", response.status);
  }
}

export async function registerDriver(formData: FormData): Promise<{ user_id?: number; id?: number; [key: string]: unknown }> {
  const response = await fetch(`${API_BASE_URL}${ENDPOINTS.REGISTER_DRIVER}`, {
    method: "POST",
    body: formData,
    // Ne pas mettre Content-Type, le browser le gère pour multipart/form-data
  });
  return handleResponse(response);
}

export async function setAvailability(available: boolean): Promise<void> {
  const response = await fetchWithRefresh(
    `${API_BASE_URL}${ENDPOINTS.SET_AVAILABILITY}`,
    {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ is_available: available }),
    },
  );
  if (!response.ok) {
    console.error("Failed to set availability:", response.status);
  }
}

export async function getActiveMissions() {
  const response = await fetchWithRefresh(
    `${API_BASE_URL}${ENDPOINTS.ACTIVE_MISSIONS}`,
    {
      headers: getAuthHeaders(),
    },
  );
  return handleResponse(response);
}

export async function completeMission(missionId: string) {
  const response = await fetchWithRefresh(
    `${API_BASE_URL}${ENDPOINTS.COMPLETE_MISSION(missionId)}`,
    {
      method: "POST",
      headers: getAuthHeaders(),
    },
  );
  return handleResponse(response);
}

export async function getLastMission() {
  const response = await fetchWithRefresh(
    `${API_BASE_URL}${ENDPOINTS.LAST_MISSION}`,
    {
      headers: getAuthHeaders(),
    },
  );
  return handleResponse(response);
}

export async function acceptMission(missionId: string) {
  const response = await fetchWithRefresh(
    `${API_BASE_URL}${ENDPOINTS.ACCEPT_MISSION(missionId)}`,
    {
      method: "POST",
      headers: getAuthHeaders(),
    },
  );
  return handleResponse(response);
}

export async function cancelMission(missionId: string) {
  const response = await fetchWithRefresh(
    `${API_BASE_URL}${ENDPOINTS.CANCEL_MISSION(missionId)}`,
    {
      method: "POST",
      headers: getAuthHeaders(),
    },
  );
  return handleResponse(response);
}

// ========================
// NOTIFICATIONS ENDPOINTS
// ========================

export interface ApiNotification {
  id: string;
  title: string;
  content: string;
  created_at: string;
  read: boolean;
  user: number;
}

export async function getNotifications(): Promise<ApiNotification[]> {
  const response = await fetchWithRefresh(
    `${API_BASE_URL}${ENDPOINTS.NOTIFICATIONS_LIST}`,
    {
      headers: getAuthHeaders(),
    },
  );
  return handleResponse<ApiNotification[]>(response);
}

export async function registerFcmToken(token: string): Promise<void> {
  const response = await fetchWithRefresh(
    `${API_BASE_URL}${ENDPOINTS.REGISTER_FCM_TOKEN}`,
    {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ token }),
    },
  );
  if (!response.ok) {
    console.error("Failed to register FCM token:", response.status);
  }
}

// ========================
// MISSION INFO (Story 3.3)
// ========================

export interface MissionInfoResponse {
  id?: string;
  officine?: {
    name?: string;
    address?: string;
    telephone?: string;
    latitude?: number;
    longitude?: number;
  };
  patient?: {
    first_name?: string;
    last_name?: string;
    telephone?: string;
    address?: string;
    latitude?: number;
    longitude?: number;
  };
  order?: {
    id?: string;
    items?: { product_name?: string; quantity?: number; unit_price?: number | string }[];
    total_amount?: number | string;
    status?: string;
  };
  status?: string;
  [key: string]: unknown;
}

export async function getMissionInfo(): Promise<MissionInfoResponse> {
  const response = await fetchWithRefresh(
    `${API_BASE_URL}/mission/get_info_by_mission/`,
    {
      headers: getAuthHeaders(),
    },
  );
  return handleResponse<MissionInfoResponse>(response);
}

// ========================
// QR CODE SCANS (Stories 3.1 & 3.2)
// ========================

export async function scanQrCodePickup(data: { qr_code: string }): Promise<unknown> {
  const response = await fetchWithRefresh(
    `${API_BASE_URL}/scan-qrcode-pickup/`,
    {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    },
  );
  return handleResponse(response);
}

export async function scanOrderDelivery(orderId: string, data: { qr_code: string }): Promise<unknown> {
  // Note: pas de slash final sur cet endpoint
  const response = await fetchWithRefresh(
    `${API_BASE_URL}/scan-qrcode-order/${orderId}/delivery`,
    {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    },
  );
  return handleResponse(response);
}

// ========================
// PICKUP OFFICINES (Story 3.4)
// ========================

export interface PickupOfficine {
  id?: string;
  name?: string;
  address?: string;
  orders_count?: number;
  [key: string]: unknown;
}

export async function getPickupOfficines(): Promise<PickupOfficine[]> {
  const response = await fetchWithRefresh(
    `${API_BASE_URL}/pickup-qr-code/`,
    {
      headers: getAuthHeaders(),
    },
  );
  const data = await handleResponse<unknown>(response);
  if (Array.isArray(data)) return data as PickupOfficine[];
  const r = data as Record<string, unknown>;
  if (Array.isArray(r?.results)) return r.results as PickupOfficine[];
  return [];
}

// ========================
// DELIVERY UPDATE (Story 3.5)
// ========================

export async function updateDelivery(deliveryId: string, data: Record<string, unknown>): Promise<unknown> {
  const response = await fetchWithRefresh(
    `${API_BASE_URL}/delivery/${deliveryId}/`,
    {
      method: "PATCH",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    },
  );
  return handleResponse(response);
}

// ========================
// PASSWORD (Stories 3.6 & 3.7)
// ========================

export async function changeForgotPassword(data: { telephone: string; password: string }): Promise<unknown> {
  // Pas d'auth requise — token oublié
  const response = await fetch(`${API_BASE_URL}/change-fogot-password/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return handleResponse(response);
}

export async function changePassword(data: { old_password: string; new_password: string }): Promise<unknown> {
  const response = await fetchWithRefresh(
    `${API_BASE_URL}/change-password/`,
    {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    },
  );
  return handleResponse(response);
}
