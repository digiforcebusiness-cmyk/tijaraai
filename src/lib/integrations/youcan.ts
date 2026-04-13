/**
 * YouCan Shop REST API integration
 * Docs: https://developer.youcan.shop/store-admin/introduction/getting-started
 * Auth: OAuth2 Bearer token
 */

const GRAPH_API = "https://api.youcan.shop";

export interface YouCanCredentials {
  accessToken: string;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface YouCanRemoteOrder {
  id: string;
  ref: string;
  total: number;
  status: number;
  created_at: string;
  currency?: string;
  payment: {
    status_text: string; // "paid" | "pending" | "refunded"
    address: Array<{
      first_name?: string;
      last_name?: string;
      phone?: string;
      email?: string;
    }>;
  };
  shipping: {
    status_text: string; // "pending" | "shipped" | "delivered" | "cancelled"
    price: number;
  };
  customer?: {
    first_name?: string;
    last_name?: string;
    phone?: string;
    email?: string;
  };
  variants: Array<{
    id: string;
    title: string;
    sku?: string;
    price: number;
    quantity: number;
  }>;
}

export interface YouCanRemoteProduct {
  id: string;
  name: string;
  thumbnail?: string;
  price: number;
  compare_at_price?: number;
  description?: string;
  visibility: boolean;
  inventory: number;
  variants?: Array<{
    id: string;
    price: number;
    sku?: string;
    inventory_quantity?: number;
  }>;
}

// ─── HTTP helper ──────────────────────────────────────────────────────────────

async function youcanFetch<T>(creds: YouCanCredentials, path: string): Promise<T> {
  const res = await fetch(`${GRAPH_API}${path}`, {
    headers: {
      Authorization: `Bearer ${creds.accessToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  });

  const text = await res.text();
  let data: unknown;
  try { data = JSON.parse(text); } catch { data = {}; }

  if (!res.ok) {
    console.error(`[YouCan] ${res.status} ${path}:`, text.slice(0, 300));
    throw new Error(`YouCan API ${res.status}: ${text.slice(0, 200)}`);
  }

  return data as T;
}

// ─── Orders ───────────────────────────────────────────────────────────────────

interface YouCanOrdersResponse {
  data: YouCanRemoteOrder[];
  meta: { pagination: { current_page: number; total_pages: number; links: { next?: string } } };
}

export async function fetchYouCanOrders(
  creds: YouCanCredentials,
  page = 1,
  limit = 100
): Promise<{ orders: YouCanRemoteOrder[]; hasMore: boolean }> {
  const res = await youcanFetch<YouCanOrdersResponse>(
    creds,
    `/orders?limit=${limit}&page=${page}&sort_field=created_at&sort_order=desc&include=customer,variants,payment,shipping`
  );
  const hasMore = page < (res.meta?.pagination?.total_pages ?? 1);
  return { orders: res.data ?? [], hasMore };
}

// ─── Status mapping ───────────────────────────────────────────────────────────

export const YOUCAN_TO_CRM_STATUS: Record<string, string> = {
  pending:   "PENDING",
  paid:      "CONFIRMED",
  refunded:  "REFUNDED",
  // shipping statuses
  shipped:   "SHIPPED",
  delivered: "DELIVERED",
  cancelled: "CANCELLED",
};

export const CRM_TO_YOUCAN_STATUS: Record<string, string> = {
  PENDING:    "pending",
  CONFIRMED:  "paid",
  PROCESSING: "paid",
  SHIPPED:    "shipped",
  DELIVERED:  "delivered",
  CANCELLED:  "cancelled",
  REFUNDED:   "refunded",
};

export function mapYouCanStatus(order: YouCanRemoteOrder): string {
  // Prefer shipping status for fulfillment state, fall back to payment status
  const shipping = order.shipping?.status_text;
  const payment = order.payment?.status_text;
  if (shipping && YOUCAN_TO_CRM_STATUS[shipping]) return YOUCAN_TO_CRM_STATUS[shipping];
  if (payment && YOUCAN_TO_CRM_STATUS[payment]) return YOUCAN_TO_CRM_STATUS[payment];
  return "PENDING";
}

// ─── Update order status ──────────────────────────────────────────────────────

export async function updateYouCanOrderStatus(
  creds: YouCanCredentials,
  orderId: string,
  crmStatus: string
): Promise<void> {
  const youcanStatus = CRM_TO_YOUCAN_STATUS[crmStatus];
  if (!youcanStatus) return;

  // YouCan uses PUT /orders/{id}/status/{context}
  const context = ["paid", "pending", "refunded"].includes(youcanStatus) ? "payment" : "shipping";

  const res = await fetch(`${GRAPH_API}/orders/${orderId}/status/${context}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${creds.accessToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ status: youcanStatus }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`[YouCan] updateStatus ${res.status}:`, text.slice(0, 200));
  }
}

// ─── Products ─────────────────────────────────────────────────────────────────

interface YouCanProductsResponse {
  data: YouCanRemoteProduct[];
  meta: { pagination: { current_page: number; total_pages: number } };
}

export async function fetchYouCanProducts(
  creds: YouCanCredentials,
  page = 1,
  limit = 100
): Promise<{ products: YouCanRemoteProduct[]; hasMore: boolean }> {
  const res = await youcanFetch<YouCanProductsResponse>(
    creds,
    `/products?limit=${limit}&page=${page}&include=variants`
  );
  const hasMore = page < (res.meta?.pagination?.total_pages ?? 1);
  return { products: res.data ?? [], hasMore };
}

// ─── Verify connection ────────────────────────────────────────────────────────

export async function verifyYouCanConnection(creds: YouCanCredentials): Promise<boolean> {
  try {
    await youcanFetch(creds, "/orders?limit=1");
    return true;
  } catch {
    return false;
  }
}
