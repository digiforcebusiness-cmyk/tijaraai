"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Loader2, Bot, Sparkles, AlertCircle, Facebook, Instagram } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MessageBubble } from "./message-bubble";
import { useMessages } from "@/hooks/use-messages";
import type { Contact } from "@/types";

interface ChatWindowProps {
  sessionId: string;
  contact: Contact & { channel?: string | null };
}

const CHANNEL_BADGE: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  FACEBOOK:  { icon: <Facebook className="h-3 w-3" />,  label: "Facebook",  color: "text-[#1877F2]" },
  INSTAGRAM: { icon: <Instagram className="h-3 w-3" />, label: "Instagram", color: "text-[#E1306C]" },
};

export function ChatWindow({ sessionId, contact }: ChatWindowProps) {
  const [text, setText] = useState("");
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [socialSending, setSocialSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const isSocialContact = Boolean(contact.channel);
  const channelMeta = contact.channel ? CHANNEL_BADGE[contact.channel] : null;

  const { messages, isLoading, sendMessage, isSending } = useMessages(
    sessionId,
    contact.id
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handleSend = async () => {
    const msg = text.trim();
    if (!msg || isSending || socialSending) return;

    if (isSocialContact) {
      // Send via social API
      setSocialSending(true);
      try {
        await fetch("/api/social/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contactId: contact.id, text: msg }),
        });
      } finally {
        setSocialSending(false);
      }
    } else {
      sendMessage({ sessionId, contactId: contact.id, jid: contact.jid, text: msg });
    }
    setText("");
    setAiSuggestion(null);
  };

  const handleAiSuggest = async () => {
    const lastInbound = [...messages].reverse().find((m) => m.direction === "INBOUND");
    if (!lastInbound) {
      setAiError("No inbound message found to generate a reply for.");
      return;
    }

    setLoadingAi(true);
    setAiError(null);
    setAiSuggestion(null);

    try {
      const res = await fetch("/api/ai/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          contactId: contact.id,
          message: lastInbound.body,
        }),
      });

      // Safely parse — non-JSON responses (HTML 500 pages) would otherwise throw
      const text = await res.text();
      let json: Record<string, unknown> = {};
      try {
        json = JSON.parse(text);
      } catch {
        setAiError(`Server error (${res.status}): ${text.slice(0, 120)}`);
        return;
      }

      if (!res.ok) {
        setAiError((json.error as string) ?? `Request failed (${res.status})`);
        return;
      }

      const replyText = (json as { data?: { text?: string } })?.data?.text;
      if (!replyText) {
        setAiError("AI returned an empty response. Check your API key configuration.");
        return;
      }

      setAiSuggestion(replyText);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "Unknown error calling AI");
    } finally {
      setLoadingAi(false);
    }
  };

  const displayName = contact.name ?? contact.phoneNumber;
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-[#f0f2f5]">
      {/* Chat header */}
      <div className="flex items-center gap-3 border-b bg-card px-4 py-3">
        <Avatar>
          <AvatarFallback className="bg-whatsapp-teal text-white">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          {channelMeta && (
            <span className={`inline-flex items-center gap-1 text-[10px] font-medium ${channelMeta.color} mb-0.5`}>
              {channelMeta.icon}{channelMeta.label}
            </span>
          )}
          <p className="font-semibold truncate">{displayName}</p>
          <p className="text-xs text-muted-foreground">{contact.phoneNumber}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs"
          onClick={handleAiSuggest}
          disabled={loadingAi || messages.length === 0}
        >
          {loadingAi ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Sparkles className="h-3.5 w-3.5 text-primary" />
          )}
          AI Suggest
        </Button>
      </div>

      {/* Messages area */}
      <ScrollArea className="flex-1 px-4 py-3">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            No messages yet. Start the conversation!
          </div>
        ) : (
          <div className="space-y-2 pb-2">
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </ScrollArea>

      {/* AI error banner */}
      {aiError && (
        <div className="border-t bg-destructive/10 px-4 py-2">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 mt-0.5 text-destructive shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-destructive mb-0.5">AI Error</p>
              <p className="text-sm text-destructive">{aiError}</p>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs px-2 text-muted-foreground shrink-0"
              onClick={() => setAiError(null)}
            >
              Dismiss
            </Button>
          </div>
        </div>
      )}

      {/* AI suggestion banner */}
      {aiSuggestion && (
        <div className="border-t bg-primary/5 px-4 py-2">
          <div className="flex items-start gap-2">
            <Bot className="h-4 w-4 mt-0.5 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-primary mb-0.5">AI Suggestion</p>
              <p className="text-sm">{aiSuggestion}</p>
            </div>
            <div className="flex gap-1.5 shrink-0">
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs px-2"
                onClick={() => {
                  setText(aiSuggestion);
                  setAiSuggestion(null);
                }}
              >
                Use
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs px-2 text-muted-foreground"
                onClick={() => setAiSuggestion(null)}
              >
                Dismiss
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Input bar */}
      <div className="border-t bg-card px-4 py-3">
        <div className="flex items-center gap-2">
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder="Type a message…"
            className="flex-1"
            disabled={isSending || socialSending}
          />
          <Button
            size="icon"
            variant="whatsapp"
            onClick={handleSend}
            disabled={!text.trim() || isSending || socialSending}
          >
            {isSending || socialSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
