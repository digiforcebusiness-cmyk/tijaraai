/**
 * Supabase-backed Baileys auth state.
 *
 * Replaces useMultiFileAuthState (filesystem) with a database implementation
 * that stores all session credentials in WhatsAppSession.sessionData (Json?).
 *
 * This makes WhatsApp sessions compatible with Vercel's ephemeral filesystem.
 */

import type { AuthenticationCreds, AuthenticationState, SignalDataTypeMap } from "baileys";
import { prisma } from "./prisma";

// ── Serialization helpers ─────────────────────────────────────────────────────
// Baileys credentials contain Buffer/Uint8Array values that must survive a
// JSON round-trip.  We encode them as { _type: "Buffer", data: [...] }.

function serialize(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (Buffer.isBuffer(obj) || obj instanceof Uint8Array) {
    return { _type: "Buffer", data: Array.from(obj) };
  }
  if (Array.isArray(obj)) return obj.map(serialize);
  if (typeof obj === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      out[k] = serialize(v);
    }
    return out;
  }
  return obj;
}

function deserialize(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === "object" && !Array.isArray(obj)) {
    const o = obj as Record<string, unknown>;
    if (o._type === "Buffer" && Array.isArray(o.data)) {
      return Buffer.from(o.data as number[]);
    }
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(o)) {
      out[k] = deserialize(v);
    }
    return out;
  }
  if (Array.isArray(obj)) return obj.map(deserialize);
  return obj;
}

// ── Shape stored in sessionData ───────────────────────────────────────────────
type KeyStore = Partial<{
  [T in keyof SignalDataTypeMap]: Record<string, SignalDataTypeMap[T]>;
}>;

interface StoredData {
  creds?: Partial<AuthenticationCreds>;
  keys?: KeyStore;
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function useSupabaseAuthState(sessionId: string): Promise<{
  state: AuthenticationState;
  saveCreds: () => Promise<void>;
}> {
  const { initAuthCreds, BufferJSON } = await import("baileys");

  // Load persisted data (null = brand-new session)
  const row = await prisma.whatsAppSession.findUnique({
    where: { id: sessionId },
    select: { sessionData: true },
  });

  const stored: StoredData =
    row?.sessionData
      ? (deserialize(row.sessionData) as StoredData)
      : {};

  // Initialise credentials — use stored ones or start fresh
  const creds: AuthenticationCreds = stored.creds
    ? (stored.creds as AuthenticationCreds)
    : initAuthCreds();

  // In-memory key store (flushed to DB in saveCreds)
  const keys: KeyStore = stored.keys ?? {};

  async function saveCreds(): Promise<void> {
    const data: StoredData = { creds, keys };
    await prisma.whatsAppSession.update({
      where: { id: sessionId },
      data: { sessionData: serialize(data) as never },
    });
  }

  const state: AuthenticationState = {
    creds,
    keys: {
      get<T extends keyof SignalDataTypeMap>(
        type: T,
        ids: string[]
      ): { [id: string]: SignalDataTypeMap[T] } {
        const store = (keys[type] ?? {}) as Record<string, SignalDataTypeMap[T]>;
        return Object.fromEntries(
          ids.map((id) => [id, store[id]])
        ) as { [id: string]: SignalDataTypeMap[T] };
      },

      set(data: Partial<{ [T in keyof SignalDataTypeMap]: { [id: string]: SignalDataTypeMap[T] | null } }>) {
        for (const [type, entries] of Object.entries(data) as [keyof SignalDataTypeMap, Record<string, unknown>][]) {
          if (!keys[type]) {
            (keys as Record<string, Record<string, unknown>>)[type] = {};
          }
          const store = (keys as Record<string, Record<string, unknown>>)[type];
          for (const [id, value] of Object.entries(entries)) {
            if (value == null) {
              delete store[id];
            } else {
              store[id] = value;
            }
          }
        }
      },
    },
  };

  return { state, saveCreds };
}
