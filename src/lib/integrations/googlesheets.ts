/**
 * Google Sheets API v4 integration
 * Auth: Service Account JSON (provided by user)
 * Docs: https://developers.google.com/sheets/api
 */

import { createSign } from "crypto";

interface ServiceAccount {
  client_email: string;
  private_key: string;
  project_id?: string;
}

// ─── JWT + OAuth2 helper ──────────────────────────────────────────────────────

function b64url(str: string): string {
  return Buffer.from(str).toString("base64url");
}

async function getAccessToken(sa: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = b64url(JSON.stringify({
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/spreadsheets",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  }));

  const signing = `${header}.${claim}`;
  const signer = createSign("RSA-SHA256");
  signer.update(signing);
  const sig = signer.sign(sa.private_key, "base64url");
  const jwt = `${signing}.${sig}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  const json = await res.json() as { access_token?: string; error?: string };
  if (!json.access_token) throw new Error(json.error ?? "Failed to get Google access token");
  return json.access_token;
}

export function parseServiceAccount(raw: string): ServiceAccount {
  try {
    const parsed = JSON.parse(raw) as Partial<ServiceAccount>;
    if (!parsed.client_email || !parsed.private_key)
      throw new Error("Missing client_email or private_key");
    return parsed as ServiceAccount;
  } catch {
    throw new Error("Invalid service account JSON");
  }
}

// ─── Sheets helpers ───────────────────────────────────────────────────────────

async function sheetsRequest<T>(
  token: string,
  spreadsheetId: string,
  path: string,
  method = "GET",
  body?: unknown
): Promise<T> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json() as T & { error?: { message: string } };
  if ((data as { error?: { message: string } }).error)
    throw new Error((data as { error: { message: string } }).error.message);
  return data;
}

// ─── Ensure sheet tab exists ──────────────────────────────────────────────────

async function ensureSheet(token: string, spreadsheetId: string, sheetTitle: string): Promise<void> {
  const info = await sheetsRequest<{ sheets: Array<{ properties: { title: string } }> }>(
    token, spreadsheetId, ""
  );
  const exists = info.sheets?.some((s) => s.properties.title === sheetTitle);
  if (!exists) {
    await sheetsRequest(token, spreadsheetId, ":batchUpdate", "POST", {
      requests: [{ addSheet: { properties: { title: sheetTitle } } }],
    });
  }
}

// ─── Append rows ──────────────────────────────────────────────────────────────

async function appendRows(
  token: string,
  spreadsheetId: string,
  range: string,
  values: string[][]
): Promise<void> {
  await sheetsRequest(token, spreadsheetId,
    `/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    "POST",
    { values }
  );
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function verifyGSheetsConnection(
  serviceAccountJson: string,
  spreadsheetId: string
): Promise<boolean> {
  try {
    const sa = parseServiceAccount(serviceAccountJson);
    const token = await getAccessToken(sa);
    await sheetsRequest(token, spreadsheetId, "?fields=spreadsheetId");
    return true;
  } catch {
    return false;
  }
}

export interface GSheetsExportOptions {
  serviceAccountJson: string;
  spreadsheetId: string;
}

export async function exportOrdersToSheet(
  opts: GSheetsExportOptions,
  orders: Array<{
    orderNumber: string;
    status: string;
    totalAmount: string | number;
    currency: string;
    platform: string | null;
    createdAt: Date;
    contact: { name?: string | null; phoneNumber: string };
    items: unknown;
  }>
): Promise<void> {
  const sa = parseServiceAccount(opts.serviceAccountJson);
  const token = await getAccessToken(sa);
  const sheet = "Orders";
  await ensureSheet(token, opts.spreadsheetId, sheet);

  const header = [["Order #", "Date", "Customer", "Phone", "Status", "Total", "Currency", "Platform", "Items"]];
  const rows = orders.map((o) => {
    const items = Array.isArray(o.items)
      ? (o.items as Array<{ name: string; qty: number }>).map((i) => `${i.name} ×${i.qty}`).join(", ")
      : "";
    return [
      o.orderNumber.slice(-8).toUpperCase(),
      new Date(o.createdAt).toLocaleDateString(),
      o.contact.name ?? "",
      o.contact.phoneNumber,
      o.status,
      String(o.totalAmount),
      o.currency,
      o.platform ?? "CRM",
      items,
    ];
  });

  // Write header on first row if sheet was just created
  await appendRows(token, opts.spreadsheetId, `${sheet}!A1`, [...header, ...rows]);
}

export async function exportContactsToSheet(
  opts: GSheetsExportOptions,
  contacts: Array<{
    name?: string | null;
    phoneNumber: string;
    tags: string[];
    isLead: boolean;
    totalMessages: number;
    createdAt: Date;
  }>
): Promise<void> {
  const sa = parseServiceAccount(opts.serviceAccountJson);
  const token = await getAccessToken(sa);
  const sheet = "Contacts";
  await ensureSheet(token, opts.spreadsheetId, sheet);

  const header = [["Name", "Phone", "Tags", "Is Lead", "Total Messages", "Created At"]];
  const rows = contacts.map((c) => [
    c.name ?? "",
    c.phoneNumber,
    c.tags.join(", "),
    c.isLead ? "Yes" : "No",
    String(c.totalMessages),
    new Date(c.createdAt).toLocaleDateString(),
  ]);

  await appendRows(token, opts.spreadsheetId, `${sheet}!A1`, [...header, ...rows]);
}

// ─── OAuth token-based API (used when connected via Google OAuth2) ────────────

export interface GSheetsTokenOptions {
  accessToken: string;
  spreadsheetId: string;
}

export async function refreshGoogleToken(refreshToken: string): Promise<string> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  });
  const json = await res.json() as { access_token?: string; error?: string };
  if (!json.access_token) throw new Error(json.error ?? "Failed to refresh Google token");
  return json.access_token;
}

export async function exportOrdersToSheetWithToken(
  opts: GSheetsTokenOptions,
  orders: Array<{
    orderNumber: string; status: string; totalAmount: string | number; currency: string;
    platform: string | null; createdAt: Date;
    contact: { name?: string | null; phoneNumber: string }; items: unknown;
  }>
): Promise<void> {
  const sheet = "Orders";
  await ensureSheet(opts.accessToken, opts.spreadsheetId, sheet);
  const header = [["Order #", "Date", "Customer", "Phone", "Status", "Total", "Currency", "Platform", "Items"]];
  const rows = orders.map((o) => {
    const items = Array.isArray(o.items)
      ? (o.items as Array<{ name: string; qty: number }>).map((i) => `${i.name} ×${i.qty}`).join(", ")
      : "";
    return [o.orderNumber.slice(-8).toUpperCase(), new Date(o.createdAt).toLocaleDateString(), o.contact.name ?? "", o.contact.phoneNumber, o.status, String(o.totalAmount), o.currency, o.platform ?? "CRM", items];
  });
  await appendRows(opts.accessToken, opts.spreadsheetId, `${sheet}!A1`, [...header, ...rows]);
}

export async function exportContactsToSheetWithToken(
  opts: GSheetsTokenOptions,
  contacts: Array<{
    name?: string | null; phoneNumber: string; tags: string[];
    isLead: boolean; totalMessages: number; createdAt: Date;
  }>
): Promise<void> {
  const sheet = "Contacts";
  await ensureSheet(opts.accessToken, opts.spreadsheetId, sheet);
  const header = [["Name", "Phone", "Tags", "Is Lead", "Total Messages", "Created At"]];
  const rows = contacts.map((c) => [c.name ?? "", c.phoneNumber, c.tags.join(", "), c.isLead ? "Yes" : "No", String(c.totalMessages), new Date(c.createdAt).toLocaleDateString()]);
  await appendRows(opts.accessToken, opts.spreadsheetId, `${sheet}!A1`, [...header, ...rows]);
}
