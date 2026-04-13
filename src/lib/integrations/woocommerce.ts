/**
 * WooCommerce REST API v3 integration
 * Docs: https://woocommerce.github.io/woocommerce-rest-api-docs/
 */

export interface WooCredentials {
  siteUrl: string;
  consumerKey: string;
  consumerSecret: string;
}

export interface WooOrderItem {
  name: string;
  quantity: number;
  price: number;
}

export interface WooOrder {
  id: number;
  number: string;
  status: string;
  order_key: string;
}

const STATUS_MAP: Record<string, string> = {
  PENDING:    "pending",
  CONFIRMED:  "processing",
  PROCESSING: "processing",
  SHIPPED:    "on-hold",
  DELIVERED:  "completed",
  CANCELLED:  "cancelled",
  REFUNDED:   "refunded",
};

// ─── API helpers ──────────────────────────────────────────────────────────────

function apiUrl(creds: WooCredentials, path: string): string {
  const base = creds.siteUrl.replace(/\/$/, "");
  const qs = new URLSearchParams({
    consumer_key: creds.consumerKey,
    consumer_secret: creds.consumerSecret,
  });
  const endpoint = path ? `/wp-json/wc/v3${path}` : "/wp-json/wc/v3";
  const sep = path.includes("?") ? "&" : "?";
  return `${base}${endpoint}${sep}${qs}`;
}

async function wooFetch<T>(
  creds: WooCredentials,
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(apiUrl(creds, path), {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
  });

  const text = await res.text();

  if (!res.ok) {
    // Log the full body for debugging
    console.error(`[WooCommerce] ${res.status} ${path}:`, text.slice(0, 500));
    let msg = text;
    try {
      const json = JSON.parse(text) as { message?: string; data?: { params?: Record<string, string> } };
      // Show field-level validation errors if present
      const params = json?.data?.params;
      msg = params ? JSON.stringify(params) : (json?.message ?? text);
    } catch { /* ignore */ }
    throw new Error(`WooCommerce ${res.status}: ${msg}`);
  }

  return JSON.parse(text) as T;
}

// ─── Create order ─────────────────────────────────────────────────────────────

export async function createWooOrder(
  creds: WooCredentials,
  params: {
    items: WooOrderItem[];
    customerName?: string;
    customerPhone?: string;
    note?: string;
  }
): Promise<WooOrder> {
  const nameParts = (params.customerName ?? "").trim().split(/\s+/);
  const firstName = nameParts[0] || "Client";
  const lastName  = nameParts.slice(1).join(" ") || "WhatsApp";

  const lineItems = params.items
    .filter((i) => i.name && i.quantity > 0)
    .map((i) => {
      const lineTotal = (i.price * i.quantity).toFixed(2);
      return {
        name: i.name,
        quantity: i.quantity,
        subtotal: lineTotal,   // WooCommerce requires both subtotal and total
        total: lineTotal,
      };
    });

  // WooCommerce requires at least one line item
  if (!lineItems.length) {
    lineItems.push({ name: "Commande WhatsApp", quantity: 1, subtotal: "0.00", total: "0.00" });
  }

  const body: Record<string, unknown> = {
    status: "pending",
    line_items: lineItems,
    billing: {
      first_name: firstName,
      last_name: lastName,
      // email is required by WooCommerce schema — use a placeholder
      email: `wa.${Date.now()}@placeholder.order`,
      phone: params.customerPhone ?? "",
    },
  };

  if (params.note) body.customer_note = params.note;

  return wooFetch<WooOrder>(creds, "/orders", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

// ─── Update order status ──────────────────────────────────────────────────────

export async function updateWooOrderStatus(
  creds: WooCredentials,
  externalOrderId: string,
  ourStatus: string
): Promise<void> {
  const wooStatus = STATUS_MAP[ourStatus];
  if (!wooStatus) return;

  await wooFetch(creds, `/orders/${externalOrderId}`, {
    method: "PUT",
    body: JSON.stringify({ status: wooStatus }),
  });
}

// ─── Verify connection ────────────────────────────────────────────────────────

export async function verifyWooConnection(creds: WooCredentials): Promise<string> {
  const data = await wooFetch<{ store?: { name?: string }; name?: string }>(creds, "");
  return data?.store?.name ?? data?.name ?? new URL(creds.siteUrl).hostname;
}

// ─── Fetch orders (for import) ────────────────────────────────────────────────

export interface WooRemoteOrder {
  id: number;
  number: string;
  status: string;
  date_created: string;
  total: string;
  currency: string;
  customer_note: string;
  billing: {
    first_name: string;
    last_name: string;
    phone: string;
    email: string;
  };
  line_items: Array<{
    name: string;
    quantity: number;
    price: string;
    total: string;
  }>;
}

export async function fetchWooOrders(
  creds: WooCredentials,
  page = 1,
  perPage = 100
): Promise<WooRemoteOrder[]> {
  return wooFetch<WooRemoteOrder[]>(
    creds,
    `/orders?per_page=${perPage}&page=${page}&orderby=date&order=desc`
  );
}

// ─── Fetch products (for AI catalog) ─────────────────────────────────────────

export interface WooRemoteProduct {
  id: number;
  name: string;
  description: string;
  short_description: string;
  price: string;
  regular_price: string;
  sku: string;
  stock_quantity: number | null;
  stock_status: string; // "instock" | "outofstock" | "onbackorder"
  status: string;       // "publish" | "draft" | "private"
  images: Array<{ src: string }>;
}

export async function fetchWooProducts(
  creds: WooCredentials,
  page = 1,
  perPage = 100
): Promise<WooRemoteProduct[]> {
  return wooFetch<WooRemoteProduct[]>(
    creds,
    `/products?per_page=${perPage}&page=${page}&status=publish`
  );
}
