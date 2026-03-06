/**
 * API Client — e-Dr TIM Delivery System
 * Centralize all API calls (migrated from config_delivery.js + individual JS files)
 */

// ========================
// CONFIGURATION
// ========================

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "https://e-doctorpharma.onrender.com/api/v1";

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
    id: string;           // UUID du compte delivery (ex: "0d74deec-...")
    status: string;       // "IS_FREE" | "IS_BUSY"
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
  // Ne pas envoyer si pas de token (user non connecté)
  if (typeof window === "undefined" || !localStorage.getItem("access_token")) return;
  const response = await fetchWithRefresh(
    `${API_BASE_URL}${ENDPOINTS.DRIVER_LOCALISATION}`,
    {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ latitude, longitude }),
    },
  );
  if (!response.ok && response.status !== 401) {
    console.error("Failed to send position:", response.status);
  }
}

export async function registerDriver(formData: FormData): Promise<{ user_id?: number; id?: number;[key: string]: unknown }> {
  const response = await fetch(`${API_BASE_URL}${ENDPOINTS.REGISTER_DRIVER}`, {
    method: "POST",
    body: formData,
    // Ne pas mettre Content-Type, le browser le gère pour multipart/form-data
  });
  return handleResponse(response);
}

export async function setAvailability(_available: boolean): Promise<void> {
  // Endpoint not available on this backend — silently ignored
}

export async function getActiveMissions() {
  const response = await fetchWithRefresh(
    `${API_BASE_URL}${ENDPOINTS.ACTIVE_MISSIONS}`,
    {
      headers: getAuthHeaders(),
    },
  );
  // 404 means no active mission for this driver — treat as empty list
  if (response.status === 404) return [];
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

export interface LastMissionResult {
  mission: Mission | null;
  rawResponse: unknown;      // la réponse brute du backend pour le debug
  httpStatus: number;
  error?: string;
}

export async function getLastMissionDebug(): Promise<LastMissionResult> {
  let httpStatus = 0;
  try {
    const response = await fetchWithRefresh(
      `${API_BASE_URL}${ENDPOINTS.LAST_MISSION}`,
      { headers: getAuthHeaders() },
    );
    httpStatus = response.status;
    console.log("[getLastMission] HTTP status:", httpStatus);

    if (httpStatus === 404) {
      console.log("[getLastMission] 404 → aucune mission assignée");
      return { mission: null, rawResponse: null, httpStatus };
    }
    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      console.warn("[getLastMission] Erreur HTTP", httpStatus, errText);
      return { mission: null, rawResponse: errText, httpStatus, error: `HTTP ${httpStatus}: ${errText}` };
    }

    const raw = await response.json();
    console.log("[getLastMission] Réponse brute:", JSON.stringify(raw, null, 2));

    const mission = _extractMission(raw);
    if (!mission) {
      console.warn("[getLastMission] _extractMission → null (format inattendu)", raw);
    }
    return { mission, rawResponse: raw, httpStatus };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[getLastMission] Exception:", msg);
    return { mission: null, rawResponse: null, httpStatus, error: msg };
  }
}

export async function getLastMission(): Promise<Mission | null> {
  const result = await getLastMissionDebug();
  return result.mission;
}

/** Extract a Mission object from various possible response shapes */
function _extractMission(raw: unknown): Mission | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  // Shape: { id: "..." } — direct mission object
  if (obj.id) return obj as unknown as Mission;
  // Shape: { mission: { id: "..." } }
  if (obj.mission && typeof obj.mission === "object") {
    const m = obj.mission as Record<string, unknown>;
    if (m.id) return m as unknown as Mission;
  }
  // Shape: { data: { id: "..." } }
  if (obj.data && typeof obj.data === "object") {
    const d = obj.data as Record<string, unknown>;
    if (d.id) return d as unknown as Mission;
  }
  // Shape: [ { id: "..." }, ... ] — array
  if (Array.isArray(raw) && raw.length > 0) {
    const first = raw[0] as Record<string, unknown>;
    if (first.id) return first as unknown as Mission;
  }
  return null;
}

interface Mission {
  id: string;
  [key: string]: unknown;
}


export async function listAvailableMissions(): Promise<Mission[]> {
  const response = await fetchWithRefresh(
    `${API_BASE_URL}/mission/`,
    { headers: getAuthHeaders() },
  );
  if (response.status === 404) return [];
  if (!response.ok) return [];
  const raw = await response.json() as unknown;
  if (Array.isArray(raw)) return (raw as Mission[]).filter((m) => m?.id);
  const r = raw as Record<string, unknown>;
  if (Array.isArray(r?.results)) return (r.results as Mission[]).filter((m) => m?.id);
  const single = _extractMission(raw);
  return single ? [single] : [];
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

export async function markNotificationAsRead(notificationId: string): Promise<void> {
  try {
    const response = await fetchWithRefresh(
      `${API_BASE_URL}/notification-user/${notificationId}/mark-read/`,
      {
        method: "POST",
        headers: getAuthHeaders(),
      },
    );
    if (!response.ok && response.status !== 404) {
      console.error("Failed to mark notification as read:", response.status);
    }
  } catch {
    // silent — fallback to local-only
  }
}

export async function registerFcmToken(token: string): Promise<void> {
  const response = await fetchWithRefresh(
    `${API_BASE_URL}${ENDPOINTS.REGISTER_FCM_TOKEN}`,
    {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ token, device_type: 'web' }),
    },
  );
  if (!response.ok) {
    console.error("Failed to register FCM token:", response.status);
  }
}

// ========================
// MISSION INFO (Story 3.3)
// ========================

export interface DeliveryAddress {
  id?: string;
  city?: string | null;
  country?: string | null;
  rue?: string | null;
  quater?: string | null;
  bp?: string | null;
  telephone?: string | null;
  longitude?: number | null;
  latitude?: number | null;
}

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
    id?: string;
    first_name?: string | null;
    last_name?: string | null;
    telephone?: string;
    address?: string;
    latitude?: number;
    longitude?: number;
  };
  order?: {
    id?: string;
    prescription?: string | null;
    items?: { product_name?: string; quantity?: number; unit_price?: number | string }[];
    total_amount?: number | string;
    status?: string;
    /** Adresse de livraison contenant la vraie position GPS du patient */
    delivery_address?: DeliveryAddress;
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

export async function getMissionById(missionId: string): Promise<MissionInfoResponse> {
  const response = await fetchWithRefresh(
    `${API_BASE_URL}/mission/get_info_by_mission/?mission=${encodeURIComponent(missionId)}`,
    {
      headers: getAuthHeaders(),
    },
  );
  return handleResponse<MissionInfoResponse>(response);
}

// ========================
// QR CODE SCANS (Stories 3.1 & 3.2)
// ========================

export async function scanQrCodePickup(data: { code: string }): Promise<unknown> {
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

export interface DeliveryConfirmResponse {
  message: string;
  [key: string]: unknown;
}

/**
 * Confirme la réception du colis chez le patient.
 * POST /scan-qrcode-order/{order_id}/delivery
 * Body: { code: "649655" }
 * Réponse: { message: "Order confirmed. Payment released successfully." }
 */
export async function confirmDeliveryReception(
  orderId: string,
  code: string,
): Promise<DeliveryConfirmResponse> {
  // Note: pas de slash final sur cet endpoint
  const response = await fetchWithRefresh(
    `${API_BASE_URL}/scan-qrcode-order/${orderId}/delivery`,
    {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ code }),
    },
  );
  return handleResponse<DeliveryConfirmResponse>(response);
}

/** @deprecated Use confirmDeliveryReception instead */
export async function scanOrderDelivery(orderId: string, data: { code: string }): Promise<unknown> {
  return confirmDeliveryReception(orderId, data.code);
}

// ========================
// PICKUP OFFICINES (Story 3.4)
// ========================

/** Shape brute retournée par le backend pour chaque entrée pickup */
export interface PickupQrCodeItem {
  officine: {
    id: string;
    name: string;
    description?: string;
    telephone?: string;
    adresse?: {
      id?: string;
      city?: string;
      country?: string | null;
      rue?: string;
      quater?: string;
      bp?: string | null;
      telephone?: string;
      longitude?: number;
      latitude?: number;
    };
    pharmacist_holder?: {
      id: string;
      user?: {
        first_name?: string;
        last_name?: string;
        telephone?: string;
        email?: string;
      };
    };
    is_activate?: boolean;
    created_at?: string;
  };
  qr_code: string; // code numérique ou URL d'image QR
}

/** Format normalisé utilisé dans toute l'UI */
export interface PickupOfficine {
  id?: string;
  name?: string;
  address?: string;   // rue + quartier + ville
  telephone?: string;
  latitude?: number | string;
  longitude?: number | string;
  qr_code?: string;  // code de pickup à scanner
  orders_count?: number;
  status?: string;
  [key: string]: unknown;
}

/** Convertit la réponse brute du backend en PickupOfficine normalisé */
function _mapPickupItem(item: PickupQrCodeItem): PickupOfficine {
  const { officine, qr_code } = item;
  const adresse = officine.adresse;
  const addressParts = [
    adresse?.rue,
    adresse?.quater && adresse.quater !== "quater" ? adresse.quater : undefined,
    adresse?.city,
  ].filter(Boolean);
  return {
    id: officine.id,
    name: officine.name,
    address: addressParts.join(", ") || adresse?.city || undefined,
    telephone: adresse?.telephone || officine.telephone || undefined,
    latitude: adresse?.latitude,
    longitude: adresse?.longitude,
    qr_code,
  };
}

export async function getPickupOfficines(): Promise<PickupOfficine[]> {
  const response = await fetchWithRefresh(
    `${API_BASE_URL}/pickup-qr-code/get_all_qr_code_order/`,
    { headers: getAuthHeaders() },
  );
  if (response.status === 404) return [];
  const data = await handleResponse<unknown>(response);
  if (Array.isArray(data)) return (data as PickupQrCodeItem[]).map(_mapPickupItem);
  const r = data as Record<string, unknown>;
  if (Array.isArray(r?.results)) return (r.results as PickupQrCodeItem[]).map(_mapPickupItem);
  return [];
}

/** Récupère les officines de pickup pour une mission donnée */
export async function getPickupOfficinesForMission(missionId: string): Promise<PickupOfficine[]> {
  const response = await fetchWithRefresh(
    `${API_BASE_URL}/pickup-qr-code/get_all_qr_code_order/?mission=${encodeURIComponent(missionId)}`,
    { headers: getAuthHeaders() },
  );
  if (response.status === 404) return [];
  const data = await handleResponse<unknown>(response);
  if (Array.isArray(data)) return (data as PickupQrCodeItem[]).map(_mapPickupItem);
  const r = data as Record<string, unknown>;
  if (Array.isArray(r?.results)) return (r.results as PickupQrCodeItem[]).map(_mapPickupItem);
  return [];
}

// ========================
// CODE RAMASSAGE (Pickup QR)
// ========================

export interface PickupCodeResponse {
  code?: string;
  qr_code?: string;
  pickup_code?: string;
  delivery_code?: string;
  qr_image?: string;
  [key: string]: unknown;
}

/**
 * Génère le code de ramassage que le livreur montre à chaque pharmacie.
 * POST /scan-qrcode-order/{order_id}/delivery
 */
export async function generatePickupCode(orderId: string): Promise<PickupCodeResponse> {
  const response = await fetchWithRefresh(
    `${API_BASE_URL}/scan-qrcode-order/${orderId}/delivery`,
    {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ code: "" }),
    },
  );
  return handleResponse<PickupCodeResponse>(response);
}

/**
 * Récupère le QR code de commande patient.
 * GET /orders/{order_id}/qr-code/
 */
export async function getOrderQrCode(orderId: string): Promise<PickupCodeResponse> {
  const response = await fetchWithRefresh(
    `${API_BASE_URL}/orders/${orderId}/qr-code/`,
    { headers: getAuthHeaders() },
  );
  return handleResponse<PickupCodeResponse>(response);
}

// ========================
// DRIVER MISSION HISTORY
// ========================

/** Shape brute retournée par GET /delivery/driver_history_mission/ */
export interface DriverHistoryMission {
  id: string;
  status: string;                  // ex: "COMPLETED", "CANCELLED", "DELIVERED"
  created_at?: string;
  updated_at?: string;
  completed_at?: string;
  order?: {
    id?: string;
    total_amount?: number | string;
    status?: string;
    patient?: {
      first_name?: string;
      last_name?: string;
      telephone?: string;
      address?: string;
    };
  };
  officine?: {
    id?: string;
    name?: string;
    telephone?: string;
    adresse?: {
      rue?: string;
      quater?: string;
      city?: string;
      latitude?: number;
      longitude?: number;
    };
  };
  // Champs alternatifs selon la version du backend
  patient?: {
    first_name?: string;
    last_name?: string;
    address?: string;
  };
  pharmacy_name?: string;
  pharmacy_address?: string;
  client_name?: string;
  client_address?: string;
  total_amount?: number | string;
  [key: string]: unknown;
}

/**
 * Récupère l'historique des missions du livreur connecté.
 * GET /delivery/driver_history_mission/
 */
export async function getDriverHistoryMissions(): Promise<DriverHistoryMission[]> {
  try {
    const response = await fetchWithRefresh(
      `${API_BASE_URL}/delivery/driver_history_mission/`,
      { headers: getAuthHeaders() },
    );
    if (response.status === 404) return [];
    if (!response.ok) return [];
    const raw = await response.json() as unknown;
    if (Array.isArray(raw)) return raw as DriverHistoryMission[];
    const r = raw as Record<string, unknown>;
    if (Array.isArray(r?.results)) return r.results as DriverHistoryMission[];
    return [];
  } catch {
    return [];
  }
}

// ========================
// WALLET LIVREUR
// ========================

export interface DeliveryWallet {
  id: string;
  balance: number;
  locked_amount: number;
  created_at: string;
  updated_at?: string;
}

export interface DeliveryTransaction {
  id: string;
  type: "CREDIT" | "DEBIT";
  amount: number;
  status: "COMPLETED" | "PENDING" | "FAILED";
  description: string;
  created_at: string;
  reference?: string;
}

export async function getDeliveryWallet(): Promise<DeliveryWallet | null> {
  try {
    const response = await fetchWithRefresh(
      `${API_BASE_URL}/wallet-delivery/get_wallet_delivery/`,
      { headers: getAuthHeaders() },
    );
    if (!response.ok) return null;
    const raw = await response.json() as unknown;
    if (Array.isArray(raw)) return (raw as DeliveryWallet[])[0] ?? null;
    const r = raw as Record<string, unknown>;
    if (Array.isArray(r?.results)) return (r.results as DeliveryWallet[])[0] ?? null;
    return raw as DeliveryWallet;
  } catch {
    return null;
  }
}

export async function getDeliveryTransactions(): Promise<DeliveryTransaction[]> {
  try {
    const response = await fetchWithRefresh(
      `${API_BASE_URL}/wallet-delivery/transactions/`,
      { headers: getAuthHeaders() },
    );
    if (!response.ok) return [];
    const raw = await response.json() as unknown;
    if (Array.isArray(raw)) return raw as DeliveryTransaction[];
    const r = raw as Record<string, unknown>;
    if (Array.isArray(r?.results)) return r.results as DeliveryTransaction[];
    return [];
  } catch {
    return [];
  }
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

export interface UpdateProfilePayload {
  first_name?: string;
  last_name?: string;
  email?: string;
  telephone?: string;
}

export async function updateProfile(deliveryId: string, data: UpdateProfilePayload): Promise<unknown> {
  const formData = new FormData();
  if (data.first_name !== undefined) formData.append("first_name", data.first_name);
  if (data.last_name !== undefined) formData.append("last_name", data.last_name);
  if (data.email !== undefined) formData.append("email", data.email);
  if (data.telephone !== undefined) formData.append("telephone", data.telephone);

  const headers = getAuthHeaders() as Record<string, string>;
  // Supprimer Content-Type pour laisser le browser définir le boundary multipart
  delete headers["Content-Type"];

  const response = await fetchWithRefresh(
    `${API_BASE_URL}/delivery/${deliveryId}/`,
    {
      method: "PATCH",
      headers,
      body: formData,
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

export async function changePassword(data: { old_password: string; new_password: string; telephone?: string }): Promise<unknown> {
  // Backend requires telephone — retrieve from stored user info if not provided
  let telephone = data.telephone;
  if (!telephone && typeof window !== 'undefined') {
    const raw = localStorage.getItem('delivery_user_info');
    if (raw) {
      try { telephone = (JSON.parse(raw) as { telephone?: string }).telephone; } catch { /* ignore */ }
    }
    if (!telephone) telephone = localStorage.getItem('delivery_phone_number') || undefined;
  }
  const response = await fetchWithRefresh(
    `${API_BASE_URL}/change-password/`,
    {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ old_password: data.old_password, new_password: data.new_password, ...(telephone ? { telephone } : {}) }),
    },
  );
  return handleResponse(response);
}
