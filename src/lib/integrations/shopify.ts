/**
 * Shopify Admin REST API integration
 * Docs: https://shopify.dev/docs/api/admin-rest
 */

export interface ShopifyCredentials {
  shopDomain: string;   // e.g. my-store.myshopify.com
  accessToken: string;
}

export interface ShopifyOrderItem {
  title: string;
  quantity: number;
  price: string;        // decimal string e.g. "29.99"
}

export interface ShopifyCustomer {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
}

export interface ShopifyOrder {
  id: number;
  order_number: number;
  admin_graphql_api_id: string;
  status: string;
  financial_status: string;
  fulfillment_status: string | null;
}

// ─── Map our order status → Shopify fulfillment status ───────────────────────

const STATUS_MAP: Record<string, { financial?: string; fulfillment?: string | null }> = {
  CONFIRMED:  { financial: "pending"  },
  PROCESSING: { financial: "pending"  },
  SHIPPED:    { fulfillment: "fulfilled" },
  DELIVERED:  { fulfillment: "fulfilled" },
  CANCELLED:  { financial: "voided"   },
  REFUNDED:   { financial: "refunded" },
};

// ─── API helpers ──────────────────────────────────────────────────────────────

function apiUrl(creds: ShopifyCredentials, path: string): string {
  const domain = creds.shopDomain.replace(/\/$/, "");
  return `https://${domain}/admin/api/2024-01${path}`;
}

async function shopifyFetch<T>(
  creds: ShopifyCredentials,
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(apiUrl(creds, path), {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": creds.accessToken,
      ...options.headers,
    },
  });

  const json = await res.json() as T & { errors?: unknown };
  if (!res.ok) throw new Error(`Shopify API ${res.status}: ${JSON.stringify((json as { errors?: unknown }).errors ?? json)}`);
  return json;
}

// ─── Public functions ─────────────────────────────────────────────────────────

export async function createShopifyOrder(
  creds: ShopifyCredentials,
  params: {
    items: ShopifyOrderItem[];
    customer?: ShopifyCustomer;
    note?: string;
    tags?: string;
  }
): Promise<ShopifyOrder> {
  const body = {
    order: {
      line_items: params.items.map((i) => ({
        title: i.title,
        quantity: i.quantity,
        price: i.price,
      })),
      customer: params.customer,
      note: params.note,
      tags: params.tags ?? "whatsapp,wa-crm",
      financial_status: "pending",
    },
  };

  const data = await shopifyFetch<{ order: ShopifyOrder }>(
    creds,
    "/orders.json",
    { method: "POST", body: JSON.stringify(body) }
  );
  return data.order;
}

export async function updateShopifyOrderStatus(
  creds: ShopifyCredentials,
  externalOrderId: string,
  ourStatus: string
): Promise<void> {
  const mapped = STATUS_MAP[ourStatus];
  if (!mapped) return;

  if (mapped.financial) {
    // Update financial status
    await shopifyFetch(creds, `/orders/${externalOrderId}.json`, {
      method: "PUT",
      body: JSON.stringify({ order: { id: externalOrderId, financial_status: mapped.financial } }),
    }).catch(() => {}); // Shopify may not allow all transitions — ignore
  }

  if (mapped.fulfillment === "fulfilled") {
    // Create a fulfillment
    const fulfillmentsData = await shopifyFetch<{ fulfillment_orders: Array<{ id: number }> }>(
      creds,
      `/orders/${externalOrderId}/fulfillment_orders.json`
    );
    const foIds = fulfillmentsData.fulfillment_orders.map((f) => ({ fulfillment_order_id: f.id }));
    if (foIds.length) {
      await shopifyFetch(creds, "/fulfillments.json", {
        method: "POST",
        body: JSON.stringify({ fulfillment: { line_items_by_fulfillment_order: foIds } }),
      }).catch(() => {});
    }
  }

  if (ourStatus === "CANCELLED") {
    await shopifyFetch(creds, `/orders/${externalOrderId}/cancel.json`, {
      method: "POST",
      body: JSON.stringify({}),
    }).catch(() => {});
  }
}

export async function verifyShopifyConnection(creds: ShopifyCredentials): Promise<string> {
  const data = await shopifyFetch<{ shop: { name: string } }>(creds, "/shop.json");
  return data.shop.name;
}

// ─── Fetch remote orders (for import) ────────────────────────────────────────

export interface ShopifyRemoteOrder {
  id: number;
  name: string;               // e.g. "#1001"
  financial_status: string;
  fulfillment_status: string | null;
  total_price: string;
  currency: string;
  note: string | null;
  created_at: string;
  customer: {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
  } | null;
  billing_address: { phone?: string; first_name?: string; last_name?: string } | null;
  line_items: Array<{
    title: string;
    quantity: number;
    price: string;
  }>;
}

export async function fetchShopifyOrders(
  creds: ShopifyCredentials,
  limit = 250,
  pageInfo?: string
): Promise<{ orders: ShopifyRemoteOrder[]; nextPageInfo: string | null }> {
  const qs = pageInfo
    ? `?limit=${limit}&page_info=${pageInfo}&status=any`
    : `?limit=${limit}&status=any&order=created_at+desc`;

  const res = await fetch(apiUrl(creds, `/orders.json${qs}`), {
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": creds.accessToken,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Shopify ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = await res.json() as { orders: ShopifyRemoteOrder[] };

  // Extract next page cursor from Link header
  const link = res.headers.get("Link") ?? "";
  const nextMatch = link.match(/<[^>]*page_info=([^&>]+)[^>]*>;\s*rel="next"/);
  const nextPageInfo = nextMatch ? nextMatch[1] : null;

  return { orders: data.orders, nextPageInfo };
}

// ─── Fetch products (for AI catalog) ─────────────────────────────────────────

export interface ShopifyRemoteProduct {
  id: number;
  title: string;
  body_html: string;
  status: string; // "active" | "archived" | "draft"
  variants: Array<{
    price: string;
    compare_at_price: string | null;
    sku: string | null;
    inventory_quantity: number;
  }>;
  images: Array<{ src: string }>;
}

export async function fetchShopifyProducts(
  creds: ShopifyCredentials,
  limit = 250,
  pageInfo?: string
): Promise<{ products: ShopifyRemoteProduct[]; nextPageInfo: string | null }> {
  const qs = pageInfo
    ? `?limit=${limit}&page_info=${pageInfo}`
    : `?limit=${limit}&status=active`;

  const res = await fetch(apiUrl(creds, `/products.json${qs}`), {
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": creds.accessToken,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Shopify ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = await res.json() as { products: ShopifyRemoteProduct[] };

  const link = res.headers.get("Link") ?? "";
  const nextMatch = link.match(/<[^>]*page_info=([^&>]+)[^>]*>;\s*rel="next"/);
  const nextPageInfo = nextMatch ? nextMatch[1] : null;

  return { products: data.products, nextPageInfo };
}
