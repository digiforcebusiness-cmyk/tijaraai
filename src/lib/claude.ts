import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = "claude-haiku-4-5-20251001";

export type AiIntent =
  | "order"
  | "lead"
  | "support"
  | "faq"
  | "general";

export interface OrderItem {
  name: string;
  qty: number;
  price: number;
}

export interface AiReply {
  text: string;
  intent: AiIntent;
  /** Populated when intent === "order" */
  orderItems?: OrderItem[];
  /** Populated when intent === "lead" */
  leadInfo?: { name?: string; email?: string; interest?: string };
}

export interface GenerateReplyOptions {
  history: Array<{ role: "user" | "assistant"; content: string }>;
  incomingMessage: string;
  customSystemPrompt?: string;
  contactName?: string;
  productCatalog?: string;
}

// ─── System prompt ────────────────────────────────────────────────────────────

const DEFAULT_SYSTEM_PROMPT = `You are a smart WhatsApp customer support assistant powered by Claude AI.

RULES:
- ابدأ المحادثة دائماً بالعربية. إذا رد العميل بالفرنسية، تحول للفرنسية. إذا كتب بالعربية أو الدارجة، استمر بالعربية. لا تستخدم الإنجليزية أبداً.
- Keep replies short and friendly — this is WhatsApp, not email.
- If the customer wants to order something, confirm the product, quantity, and price, then end with a confirmation question in their language (e.g. "هل تريد تأكيد طلبك؟ ✅" for Arabic, "Shall I confirm your order? ✅" for English).
- If the customer is asking general questions, answer helpfully and concisely.
- Never make up prices or policies you don't know. Say you will check (in their language).
- Do not use markdown (no **, no ##). Plain text only.

After your reply, output a special JSON block on a new line wrapped in <ai_data> tags like this:
<ai_data>{"intent":"order","items":[{"name":"Blue Sneakers","qty":1,"price":59.99}]}</ai_data>

Intent must be one of: "order", "lead", "support", "faq", "general"
- "order": customer wants to buy something (include items array with name/qty/price if known, price=0 if unknown)
- "lead": customer expressed interest but no order yet (include leadInfo: {name, interest})
- "support": customer has a complaint, issue, or refund request
- "faq": customer is asking a question about products/services/policies
- "general": everything else

Only include items/leadInfo when relevant. The JSON block is hidden from the customer — only output it after your reply text.`;

// ─── Main function ────────────────────────────────────────────────────────────

export async function generateReply(
  options: GenerateReplyOptions
): Promise<AiReply> {
  const { history, incomingMessage, customSystemPrompt, contactName, productCatalog } = options;

  // Language rule — always first, cannot be overridden
  const LANGUAGE_RULE = `قواعد اللغة الإلزامية:
- إذا كانت هذه أول رسالة في المحادثة (لا يوجد سياق سابق): ابدأ دائماً بالعربية.
- إذا كتب العميل بالفرنسية: رد بالفرنسية فقط.
- إذا كتب العميل بالعربية الفصحى أو الدارجة المغربية أو أي لهجة عربية: رد بالعربية دائماً.
- إذا كتب العميل بالإنجليزية: رد بالعربية (لا تستخدم الإنجليزية).
- LANGUAGE RULES: If this is the first message with no prior context, always start in Arabic. If the customer writes in French, reply in French. If the customer writes in Arabic OR Darija (Moroccan dialect) OR any Arabic dialect, always reply in Arabic. If the customer writes in English, reply in Arabic.\n\n`;

  const catalogSection = productCatalog
    ? `\n\nPRODUCT CATALOG (use exact product names and prices from this list when answering customer questions — never invent products):\n${productCatalog}`
    : "";

  const systemPrompt = LANGUAGE_RULE + (customSystemPrompt
    ? `${customSystemPrompt}\n\n${DEFAULT_SYSTEM_PROMPT}`
    : DEFAULT_SYSTEM_PROMPT) + catalogSection;

  const contextNote = contactName
    ? `[Customer name: ${contactName}]\n\n`
    : "";

  const messages: Anthropic.MessageParam[] = [
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: `${contextNote}${incomingMessage}` },
  ];

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: systemPrompt,
    messages,
  });

  const raw = response.content[0].type === "text" ? response.content[0].text : "";

  // Split reply text from the hidden <ai_data> block
  const dataMatch = raw.match(/<ai_data>([\s\S]*?)<\/ai_data>/);
  const text = raw.replace(/<ai_data>[\s\S]*?<\/ai_data>/, "").trim();

  let intent: AiIntent = "general";
  let orderItems: OrderItem[] | undefined;
  let leadInfo: { name?: string; email?: string; interest?: string } | undefined;

  if (dataMatch) {
    try {
      const parsed = JSON.parse(dataMatch[1].trim()) as {
        intent?: string;
        items?: OrderItem[];
        leadInfo?: { name?: string; email?: string; interest?: string };
      };
      intent = (parsed.intent as AiIntent) ?? "general";
      if (parsed.items?.length) orderItems = parsed.items;
      if (parsed.leadInfo) leadInfo = parsed.leadInfo;
    } catch {
      // ignore malformed JSON
    }
  }

  return { text, intent, orderItems, leadInfo };
}

// ─── Standalone extractors (used elsewhere) ───────────────────────────────────

export async function extractLeadData(
  conversationText: string
): Promise<Record<string, string>> {
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 512,
    system:
      "Extract structured lead data from the conversation. Return a JSON object with keys: name, phoneNumber, email, interest, urgency (low/medium/high), notes.",
    messages: [{ role: "user", content: conversationText }],
  });

  const raw = response.content[0].type === "text" ? response.content[0].text : "{}";
  try {
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return { raw };
  }
}
