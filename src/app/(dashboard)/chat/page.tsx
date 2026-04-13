"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MessageSquare, Search, Loader2 } from "lucide-react";
import { Header } from "@/components/dashboard/header";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ChatWindow } from "@/components/chat/chat-window";
import { truncate, formatRelativeTime } from "@/lib/utils";
import type { ChatContact } from "@/types";

async function fetchContacts(search: string): Promise<ChatContact[]> {
  const res = await fetch(`/api/contacts?search=${encodeURIComponent(search)}&limit=50`);
  if (!res.ok) throw new Error("Failed to load contacts");
  const json = await res.json();
  return json.data as ChatContact[];
}

export default function ChatPage() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<ChatContact | null>(null);

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ["contacts", search],
    queryFn: () => fetchContacts(search),
    refetchInterval: 5_000,
  });

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <Header title="Chat" description="Real-time WhatsApp conversations" />

      <div className="flex flex-1 overflow-hidden">
        {/* Contact list */}
        <div className="flex w-80 shrink-0 flex-col border-r overflow-hidden bg-card">
          <div className="border-b p-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search contacts…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : contacts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3 text-center px-4">
                <MessageSquare className="h-10 w-10 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  {search ? "No contacts found" : "No conversations yet"}
                </p>
              </div>
            ) : (
              contacts.map((contact) => {
                const name = contact.name ?? contact.phoneNumber;
                const initials = name.slice(0, 2).toUpperCase();
                const lastMsg = contact.lastMessage;

                return (
                  <button
                    key={contact.id}
                    onClick={() => setSelected(contact)}
                    className={`w-full text-left flex items-center gap-3 px-4 py-3 border-b hover:bg-accent transition-colors ${
                      selected?.id === contact.id ? "bg-accent" : ""
                    }`}
                  >
                    <Avatar className="shrink-0">
                      <AvatarFallback className="bg-whatsapp-teal/80 text-white text-xs">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-medium text-sm truncate">{name}</span>
                        {lastMsg && (
                          <span className="text-[10px] text-muted-foreground shrink-0">
                            {formatRelativeTime(lastMsg.timestamp)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <p className="text-xs text-muted-foreground truncate flex-1">
                          {lastMsg
                            ? truncate(lastMsg.body, 40)
                            : contact.phoneNumber}
                        </p>
                        {contact.isLead && (
                          <Badge variant="info" className="text-[9px] px-1 py-0 shrink-0">
                            Lead
                          </Badge>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Chat window */}
        {selected ? (
          <ChatWindow
            sessionId={selected.sessionId ?? ""}
            contact={selected}
          />
        ) : (
          <div className="flex flex-1 items-center justify-center bg-[#f0f2f5]">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="rounded-full bg-muted p-8">
                <MessageSquare className="h-12 w-12 text-muted-foreground/40" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Select a conversation</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-[240px]">
                  Choose a contact from the left to view their messages
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
