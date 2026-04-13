import type {
  User,
  WhatsAppSession,
  Contact,
  Message,
  Order,
  WhatsAppStatus,
  MessageDirection,
  MessageType,
  MessageStatus,
  OrderStatus,
} from "@prisma/client";

// Re-export Prisma types for convenience
export type {
  User,
  WhatsAppSession,
  Contact,
  Message,
  Order,
  WhatsAppStatus,
  MessageDirection,
  MessageType,
  MessageStatus,
  OrderStatus,
};

// ─── API Response shapes ───────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T;
  error?: never;
}
export interface ApiError {
  data?: never;
  error: string;
  code?: string;
}
export type ApiResult<T> = ApiResponse<T> | ApiError;

// ─── Dashboard stats ───────────────────────────────────────────────────────────

export interface DashboardStats {
  totalMessages: number;
  messagesChange: number;
  totalContacts: number;
  contactsChange: number;
  activeSessions: number;
  totalOrders: number;
  ordersChange: number;
  aiReplies: number;
}

// ─── Chat ──────────────────────────────────────────────────────────────────────

export interface ChatContact extends Contact {
  lastMessage?: Message;
  unreadCount?: number;
}

export interface ConversationMessage extends Message {
  contact: Contact;
}

// ─── Session with computed fields ─────────────────────────────────────────────

export interface SessionWithStats extends WhatsAppSession {
  _count: {
    contacts: number;
    messages: number;
  };
}

// ─── Order with contact ────────────────────────────────────────────────────────

export interface OrderWithContact extends Order {
  contact: Contact;
}

// ─── Zod input types (kept here to co-locate with DTOs) ───────────────────────

export interface SendMessageInput {
  sessionId: string;
  jid: string;
  text: string;
}

export interface CreateSessionInput {
  name: string;
  aiEnabled?: boolean;
  aiPrompt?: string;
}

export interface CreateOrderInput {
  contactId: string;
  items: Array<{ name: string; qty: number; price: number }>;
  totalAmount: number;
  currency?: string;
  notes?: string;
}
