"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Send, Plus, Loader2, Users, CheckCircle, XCircle, Clock, Megaphone } from "lucide-react";
import { Header } from "@/components/dashboard/header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatRelativeTime } from "@/lib/utils";

type CampaignStatus = "DRAFT" | "SCHEDULED" | "SENDING" | "SENT" | "FAILED" | "CANCELLED";

interface Campaign {
  id: string;
  name: string;
  message: string;
  status: CampaignStatus;
  totalSent: number;
  totalFailed: number;
  scheduledAt: string | null;
  sentAt: string | null;
  createdAt: string;
  session: { name: string };
  _count: { recipients: number };
}

interface Session { id: string; name: string; status: string; phoneNumber: string | null }
interface Contact { id: string; name: string | null; phoneNumber: string; sessionId: string }

const STATUS_BADGE: Record<CampaignStatus, { label: string; variant: string }> = {
  DRAFT:     { label: "Draft",     variant: "outline"     },
  SCHEDULED: { label: "Scheduled", variant: "info"        },
  SENDING:   { label: "Sending…",  variant: "warning"     },
  SENT:      { label: "Sent",      variant: "success"     },
  FAILED:    { label: "Failed",    variant: "destructive" },
  CANCELLED: { label: "Cancelled", variant: "outline"     },
};

export default function CampaignsPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", sessionId: "", message: "" });
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [sendingId, setSendingId] = useState<string | null>(null);

  const { data: campaigns = [], isLoading } = useQuery<Campaign[]>({
    queryKey: ["campaigns"],
    queryFn: async () => { const r = await fetch("/api/campaigns"); return (await r.json()).data; },
    refetchInterval: 5000,
  });

  const { data: sessions = [] } = useQuery<Session[]>({
    queryKey: ["sessions"],
    queryFn: async () => { const r = await fetch("/api/sessions"); return (await r.json()).data; },
  });

  const { data: contacts = [] } = useQuery<Contact[]>({
    queryKey: ["contacts", form.sessionId],
    queryFn: async () => {
      if (!form.sessionId) return [];
      const r = await fetch(`/api/contacts?sessionId=${form.sessionId}&limit=100`);
      return (await r.json()).data;
    },
    enabled: !!form.sessionId,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, contactIds: selectedContacts }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      return (await res.json()).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      setShowForm(false);
      setForm({ name: "", sessionId: "", message: "" });
      setSelectedContacts([]);
    },
  });

  const handleSend = async (campaignId: string) => {
    setSendingId(campaignId);
    try {
      await fetch(`/api/campaigns/${campaignId}/send`, { method: "POST" });
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
    } finally {
      setSendingId(null);
    }
  };

  const toggleContact = (id: string) => {
    setSelectedContacts((prev) => prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]);
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <Header title="Campaigns" description="Send broadcast messages to your contacts" />

      <main className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Create button */}
        <div className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground">{campaigns.length} campaign{campaigns.length !== 1 ? "s" : ""}</p>
          <Button variant="whatsapp" className="gap-2" onClick={() => setShowForm(!showForm)}>
            <Plus className="h-4 w-4" />
            New Campaign
          </Button>
        </div>

        {/* Create form */}
        {showForm && (
          <Card>
            <CardHeader><CardTitle className="text-base">New Broadcast Campaign</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Campaign Name</label>
                  <Input placeholder="e.g. Summer Sale Promo" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">WhatsApp Session</label>
                  <select
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                    value={form.sessionId}
                    onChange={(e) => { setForm({ ...form, sessionId: e.target.value }); setSelectedContacts([]); }}
                  >
                    <option value="">Select session…</option>
                    {sessions.map((s) => (
                      <option key={s.id} value={s.id} disabled={s.status !== "CONNECTED"}>
                        {s.name} {s.status !== "CONNECTED" ? "(offline)" : `— ${s.phoneNumber ?? ""}`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Message</label>
                <textarea
                  rows={4}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="Type your broadcast message…"
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                />
                <p className="text-xs text-muted-foreground text-right">{form.message.length}/4096</p>
              </div>

              {/* Contact selection */}
              {form.sessionId && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Select Recipients ({selectedContacts.length} selected)</label>
                    <button
                      className="text-xs text-primary hover:underline"
                      onClick={() => setSelectedContacts(contacts.length === selectedContacts.length ? [] : contacts.map((c) => c.id))}
                    >
                      {contacts.length === selectedContacts.length ? "Deselect all" : "Select all"}
                    </button>
                  </div>
                  <div className="max-h-48 overflow-y-auto rounded-lg border divide-y">
                    {contacts.length === 0 ? (
                      <p className="p-4 text-sm text-muted-foreground text-center">No contacts in this session yet</p>
                    ) : contacts.map((c) => (
                      <label key={c.id} className="flex items-center gap-3 px-3 py-2 hover:bg-accent cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedContacts.includes(c.id)}
                          onChange={() => toggleContact(c.id)}
                          className="h-4 w-4 accent-primary"
                        />
                        <span className="text-sm">{c.name ?? c.phoneNumber}</span>
                        <span className="text-xs text-muted-foreground ml-auto">{c.phoneNumber}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button
                  variant="whatsapp"
                  disabled={!form.name || !form.sessionId || !form.message || selectedContacts.length === 0 || createMutation.isPending}
                  onClick={() => createMutation.mutate()}
                  className="gap-2"
                >
                  {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Create Campaign
                </Button>
              </div>
              {createMutation.isError && <p className="text-sm text-destructive">{(createMutation.error as Error).message}</p>}
            </CardContent>
          </Card>
        )}

        {/* Campaign list */}
        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-7 w-7 animate-spin text-muted-foreground" /></div>
        ) : campaigns.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
            <Megaphone className="h-12 w-12 text-muted-foreground/30" />
            <p className="font-medium">No campaigns yet</p>
            <p className="text-sm text-muted-foreground">Create your first broadcast campaign above</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {campaigns.map((c) => {
              const badge = STATUS_BADGE[c.status];
              const isSending = sendingId === c.id || c.status === "SENDING";
              return (
                <Card key={c.id} className="flex flex-col">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-sm font-semibold line-clamp-1">{c.name}</CardTitle>
                      <Badge variant={badge.variant as never} className="shrink-0 text-[10px]">{badge.label}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{c.session.name}</p>
                  </CardHeader>
                  <CardContent className="flex-1 space-y-3">
                    <p className="text-sm text-muted-foreground line-clamp-2">{c.message}</p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Users className="h-3 w-3" />{c._count.recipients} contacts</span>
                      {c.status === "SENT" && (
                        <>
                          <span className="flex items-center gap-1 text-green-600"><CheckCircle className="h-3 w-3" />{c.totalSent}</span>
                          {c.totalFailed > 0 && <span className="flex items-center gap-1 text-red-500"><XCircle className="h-3 w-3" />{c.totalFailed}</span>}
                        </>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {c.sentAt ? `Sent ${formatRelativeTime(c.sentAt)}` : `Created ${formatRelativeTime(c.createdAt)}`}
                    </p>
                    {(c.status === "DRAFT" || c.status === "SCHEDULED") && (
                      <Button
                        size="sm"
                        variant="whatsapp"
                        className="w-full gap-2"
                        disabled={isSending}
                        onClick={() => handleSend(c.id)}
                      >
                        {isSending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                        {isSending ? "Sending…" : "Send Now"}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
