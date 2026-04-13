/**
 * LightFunnels GraphQL API integration
 * Docs: https://developer.lightfunnels.com
 * Auth: OAuth2 Bearer token
 * API: GraphQL POST https://services.lightfunnels.com/api/v2
 */

const GQL_URL = "https://services.lightfunnels.com/api/v2";

export interface LightFunnelsCredentials {
  accessToken: string;
}

// ─── GraphQL helper ───────────────────────────────────────────────────────────

async function gqlFetch<T>(
  creds: LightFunnelsCredentials,
  query: string,
  variables: Record<string, unknown> = {}
): Promise<T> {
  const res = await fetch(GQL_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${creds.accessToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });

  const data = await res.json() as { data?: T; errors?: Array<{ message: string }> };

  if (data.errors?.length) {
    const msg = data.errors.map((e) => e.message).join("; ");
    throw new Error(`LightFunnels GQL error: ${msg}`);
  }
  if (!res.ok) throw new Error(`LightFunnels API ${res.status}`);

  return data.data as T;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LFRemoteOrder {
  id: string;
  _id: number;
  name: string;
  email: string;
  phone: string;
  customer_full_name: string;
  total: number;
  currency: string;
  financial_status: string; // "pending" | "paid" | "refunded" | "partially_refunded"
  fulfillment_status: string; // "unfulfilled" | "fulfilled" | "partial"
  created_at: string;
  notes?: string;
  items: Array<{
    id: string;
    title: string;
    sku?: string;
    price: number;
    quantity: number;
  }>;
  customer?: {
    phone?: string;
    first_name?: string;
    last_name?: string;
    full_name?: string;
  };
}

export interface LFRemoteProduct {
  id: string;
  _id: number;
  title: string;
  description?: string;
  sku: string;
  price: number;
  compare_at_price?: number;
  inventory_quantity: number;
  thumbnail?: { url: string };
}

// ─── Status mapping ───────────────────────────────────────────────────────────

export const LF_TO_CRM_STATUS: Record<string, string> = {
  pending:              "PENDING",
  paid:                 "CONFIRMED",
  refunded:             "REFUNDED",
  partially_refunded:   "REFUNDED",
  unfulfilled:          "PENDING",
  fulfilled:            "DELIVERED",
  partial:              "PROCESSING",
};

export function mapLFStatus(order: LFRemoteOrder): string {
  // Prefer fulfillment status over financial
  if (order.fulfillment_status === "fulfilled") return "DELIVERED";
  if (order.fulfillment_status === "partial") return "PROCESSING";
  return LF_TO_CRM_STATUS[order.financial_status] ?? "PENDING";
}

// ─── Fetch orders (cursor-based pagination) ───────────────────────────────────

const ORDERS_QUERY = `
query ordersQuery($first: Int, $after: String, $query: String!) {
  orders(query: $query, after: $after, first: $first) {
    edges {
      cursor
      node {
        id _id name email phone customer_full_name
        total currency financial_status fulfillment_status created_at notes
        items { ... on VariantSnapshot { id title sku price quantity } }
        customer { phone first_name last_name full_name }
      }
    }
    pageInfo { endCursor hasNextPage }
  }
}`;

export async function fetchLFOrders(
  creds: LightFunnelsCredentials,
  after?: string
): Promise<{ orders: LFRemoteOrder[]; nextCursor: string | null }> {
  const data = await gqlFetch<{
    orders: {
      edges: Array<{ cursor: string; node: LFRemoteOrder }>;
      pageInfo: { endCursor: string; hasNextPage: boolean };
    };
  }>(creds, ORDERS_QUERY, {
    first: 50,
    after: after ?? null,
    query: "order_by:id order_dir:desc",
  });

  const orders = data.orders.edges.map((e) => e.node);
  const nextCursor = data.orders.pageInfo.hasNextPage ? data.orders.pageInfo.endCursor : null;
  return { orders, nextCursor };
}

// ─── Update order (via notes tag — LightFunnels has no direct status field) ───

export async function updateLFOrderStatus(
  creds: LightFunnelsCredentials,
  orderId: string,
  crmStatus: string
): Promise<void> {
  // LightFunnels doesn't expose financial/fulfillment status updates directly.
  // We add a status tag so it's visible in the dashboard.
  const mutation = `
    mutation updateOrderMutation($id: ID!, $node: InputOrder!) {
      updateOrder(id: $id, node: $node) { id notes tags }
    }`;

  await gqlFetch(creds, mutation, {
    id: orderId,
    node: { notes: `CRM Status: ${crmStatus}`, tags: [`crm:${crmStatus.toLowerCase()}`] },
  }).catch((err) => console.error("[LightFunnels] updateOrderStatus:", err));
}

// ─── Cancel order ─────────────────────────────────────────────────────────────

export async function cancelLFOrder(
  creds: LightFunnelsCredentials,
  orderId: string
): Promise<void> {
  const mutation = `
    mutation cancelOrderMutation($id: ID!, $reason: String!, $notifyCustomer: Boolean!, $refund: Boolean!) {
      cancelOrder(id: $id, reason: $reason, notifyCustomer: $notifyCustomer, refund: $refund) { id }
    }`;
  await gqlFetch(creds, mutation, {
    id: orderId,
    reason: "Cancelled via Tijara AI",
    notifyCustomer: false,
    refund: false,
  }).catch((err) => console.error("[LightFunnels] cancelOrder:", err));
}

// ─── Fetch products ───────────────────────────────────────────────────────────

const PRODUCTS_QUERY = `
query productsQuery($first: Int, $after: String, $query: String!) {
  products(query: $query, after: $after, first: $first) {
    edges {
      cursor
      node {
        id _id title description sku price compare_at_price inventory_quantity
        thumbnail { url }
      }
    }
    pageInfo { endCursor hasNextPage }
  }
}`;

export async function fetchLFProducts(
  creds: LightFunnelsCredentials,
  after?: string
): Promise<{ products: LFRemoteProduct[]; nextCursor: string | null }> {
  const data = await gqlFetch<{
    products: {
      edges: Array<{ cursor: string; node: LFRemoteProduct }>;
      pageInfo: { endCursor: string; hasNextPage: boolean };
    };
  }>(creds, PRODUCTS_QUERY, {
    first: 50,
    after: after ?? null,
    query: "order_by:id order_dir:desc",
  });

  const products = data.products.edges.map((e) => e.node);
  const nextCursor = data.products.pageInfo.hasNextPage ? data.products.pageInfo.endCursor : null;
  return { products, nextCursor };
}

// ─── Verify connection ────────────────────────────────────────────────────────

export async function verifyLFConnection(creds: LightFunnelsCredentials): Promise<boolean> {
  try {
    await gqlFetch(creds, `query { orders(query: "", first: 1) { edges { node { id } } } }`, {});
    return true;
  } catch {
    return false;
  }
}
