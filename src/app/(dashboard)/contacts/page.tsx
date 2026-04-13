"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Users, Search, Loader2, Phone } from "lucide-react";
import { Header } from "@/components/dashboard/header";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { formatRelativeTime, formatPhoneNumber } from "@/lib/utils";
import type { ChatContact } from "@/types";

async function fetchContacts(search: string, page: number): Promise<{
  data: ChatContact[];
  meta: { total: number; totalPages: number };
}> {
  const res = await fetch(
    `/api/contacts?search=${encodeURIComponent(search)}&page=${page}&limit=24`
  );
  if (!res.ok) throw new Error("Failed to load contacts");
  return res.json();
}

export default function ContactsPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["contacts-page", search, page],
    queryFn: () => fetchContacts(search, page),
  });

  const contacts = data?.data ?? [];
  const totalPages = data?.meta.totalPages ?? 1;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <Header title="Contacts" description="All WhatsApp contacts across your sessions" />
      <main className="flex-1 overflow-y-auto p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search by name or phone…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            {data?.meta.total ?? 0} contacts
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
          </div>
        ) : contacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
            <Users className="h-12 w-12 text-muted-foreground/30" />
            <p className="text-muted-foreground">No contacts found</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {contacts.map((c) => {
              const name = c.name ?? c.phoneNumber;
              return (
                <Card key={c.id} className="hover:border-primary/50 transition-colors cursor-pointer">
                  <CardContent className="p-4 flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback className="bg-whatsapp-teal/80 text-white text-xs">
                        {name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{name}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {formatPhoneNumber(c.phoneNumber)}
                      </p>
                      {c.lastMessageAt && (
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          Last msg: {formatRelativeTime(c.lastMessageAt)}
                        </p>
                      )}
                    </div>
                    {c.isLead && <Badge variant="info" className="text-[9px]">Lead</Badge>}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 pt-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
              className="text-sm px-3 py-1 rounded border disabled:opacity-40 hover:bg-accent"
            >
              Prev
            </button>
            <span className="text-sm px-3 py-1">{page} / {totalPages}</span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(p => p + 1)}
              className="text-sm px-3 py-1 rounded border disabled:opacity-40 hover:bg-accent"
            >
              Next
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
