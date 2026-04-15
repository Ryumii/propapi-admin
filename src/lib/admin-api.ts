/** Admin API client — calls /v1/admin + /v1/auth endpoints. */

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "https://api.propapi.jp";
const TOKEN_KEY = "propapi_admin_token";

// ---------- Auth helpers -------------------------------------------------

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

// ---------- Fetch wrapper ------------------------------------------------

class AdminApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function authFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = getToken();
  if (!token) throw new AdminApiError(401, "ログインが必要です");

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new AdminApiError(res.status, body.detail ?? res.statusText);
  }
  return res;
}

// ---------- Auth ---------------------------------------------------------

export async function login(email: string, password: string): Promise<{ token: string; user: UserInfo }> {
  const res = await fetch(`${API_BASE}/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new AdminApiError(res.status, body.detail ?? res.statusText);
  }
  return res.json();
}

// ---------- Types --------------------------------------------------------

export interface UserInfo {
  id: number;
  email: string;
  plan: string;
  company_name: string | null;
}

export interface SystemStats {
  total_users: number;
  plan_breakdown: Record<string, number>;
  total_api_keys: number;
  active_api_keys: number;
  total_requests_today: number;
  total_requests_month: number;
  avg_response_ms: number | null;
}

export interface AdminUserItem {
  id: number;
  email: string;
  plan: string;
  company_name: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  api_key_count: number;
  month_usage: number;
  created_at: string;
  updated_at: string;
}

export interface UserListResult {
  users: AdminUserItem[];
  total: number;
}

export interface AdminKeyInfo {
  id: number;
  key_prefix: string;
  plan: string;
  monthly_limit: number;
  rate_per_sec: number;
  is_active: boolean;
  created_at: string;
}

export interface RecentUsageItem {
  endpoint: string;
  request_address: string | null;
  response_status: number;
  processing_time_ms: number | null;
  created_at: string;
}

export interface AdminUserDetail {
  user: AdminUserItem;
  keys: AdminKeyInfo[];
  recent_usage: RecentUsageItem[];
}

// ---------- API calls ----------------------------------------------------

export async function getStats(): Promise<SystemStats> {
  const res = await authFetch("/v1/admin/stats");
  return res.json();
}

export async function getUsers(params: {
  page?: number;
  per_page?: number;
  plan?: string;
  search?: string;
}): Promise<UserListResult> {
  const qs = new URLSearchParams();
  if (params.page) qs.set("page", String(params.page));
  if (params.per_page) qs.set("per_page", String(params.per_page));
  if (params.plan) qs.set("plan", params.plan);
  if (params.search) qs.set("search", params.search);
  const res = await authFetch(`/v1/admin/users?${qs}`);
  return res.json();
}

export async function getUserDetail(userId: number): Promise<AdminUserDetail> {
  const res = await authFetch(`/v1/admin/users/${userId}`);
  return res.json();
}

export async function updateUser(userId: number, data: { plan?: string; company_name?: string }): Promise<void> {
  await authFetch(`/v1/admin/users/${userId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function disableUserKeys(userId: number): Promise<string> {
  const res = await authFetch(`/v1/admin/users/${userId}/disable-keys`, { method: "POST" });
  const data = await res.json();
  return data.status;
}

export { AdminApiError };
