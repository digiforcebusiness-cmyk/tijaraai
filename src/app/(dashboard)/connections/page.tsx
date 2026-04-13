"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Smartphone, Wifi, WifiOff, Bot, Trash2, Loader2, Facebook, Instagram, AlertCircle } from "lucide-react";
import { Header } from "@/components/dashboard/header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { QrPanel } from "@/components/connections/qr-modal";
import type { SessionWithStats, WhatsAppStatus } from "@/types";

// ─── Social page types ────────────────────────────────────────────────────────

interface SocialPage {
  id: string;
  platform: "FACEBOOK" | "INSTAGRAM";
  pageId: string;
  pageName: string;
  pictureUrl?: string;
  createdAt: string;
}

// ─── Social Pages Section ─────────────────────────────────────────────────────

function SocialPagesSection() {
  const queryClient = useQueryClient();
  const [userToken, setUserToken] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [origin, setOrigin] = useState("");
  useEffect(() => { setOrigin(window.location.origin); }, []);

  const { data: pages = [] } = useQuery<SocialPage[]>({
    queryKey: ["social-pages"],
    queryFn: async () => (await fetch("/api/social/pages")).json().then((r) => r.data ?? []),
  });

  const connectMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/social/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userAccessToken: userToken.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      return json.data as { connected: string[] };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["social-pages"] });
      setUserToken("");
      setSuccess(`Connected: ${data.connected.join(", ")}`);
      setError("");
    },
    onError: (err: Error) => { setError(err.message); setSuccess(""); },
  });

  const disconnectMutation = useMutation({
    mutationFn: (id: string) => fetch(`/api/social/pages?id=${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["social-pages"] }),
  });

  const fbPages = pages.filter((p) => p.platform === "FACEBOOK");
  const igPages = pages.filter((p) => p.platform === "INSTAGRAM");

  return (
    <div className="space-y-4">
      {/* Facebook */}
      <Card className={fbPages.length ? "border-2 border-[#1877F2]/20 bg-[#1877F2]/5" : ""}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Facebook className="h-4 w-4 text-[#1877F2]" />
            Facebook Pages
            {fbPages.length > 0 && <Badge variant="success" className="text-[10px]">{fbPages.length} connected</Badge>}
          </CardTitle>
          <CardDescription className="text-xs">Receive and reply to Facebook Messenger conversations</CardDescription>
        </CardHeader>
        {fbPages.length > 0 && (
          <CardContent className="pt-0 space-y-2">
            {fbPages.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-lg border bg-background px-3 py-2 text-sm">
                <span className="font-medium">{p.pageName}</span>
                <button onClick={() => disconnectMutation.mutate(p.id)} className="text-xs text-muted-foreground hover:text-destructive">
                  Disconnect
                </button>
              </div>
            ))}
          </CardContent>
        )}
      </Card>

      {/* Instagram */}
      <Card className={igPages.length ? "border-2 border-[#E1306C]/20 bg-[#E1306C]/5" : ""}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Instagram className="h-4 w-4 text-[#E1306C]" />
            Instagram Business
            {igPages.length > 0 && <Badge variant="success" className="text-[10px]">{igPages.length} connected</Badge>}
          </CardTitle>
          <CardDescription className="text-xs">Receive and reply to Instagram DMs (requires Instagram Business linked to a Facebook Page)</CardDescription>
        </CardHeader>
        {igPages.length > 0 && (
          <CardContent className="pt-0 space-y-2">
            {igPages.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-lg border bg-background px-3 py-2 text-sm">
                <span className="font-medium">{p.pageName}</span>
                <button onClick={() => disconnectMutation.mutate(p.id)} className="text-xs text-muted-foreground hover:text-destructive">
                  Disconnect
                </button>
              </div>
            ))}
          </CardContent>
        )}
      </Card>

      {/* Connect form */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Connect Facebook / Instagram</CardTitle>
          <CardDescription className="text-xs">
            Paste your Facebook User Access Token. We'll auto-discover all your Pages and linked Instagram accounts.
            <br />
            <span className="text-muted-foreground">Get token: <a href="https://developers.facebook.com/tools/explorer/" target="_blank" rel="noopener noreferrer" className="underline">Graph API Explorer</a> → select your app → get user token with <code>pages_messaging</code>, <code>instagram_basic</code>, <code>instagram_manage_messages</code></span>
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          <Input
            placeholder="EAAxxxxxx... (User Access Token)"
            value={userToken}
            onChange={(e) => setUserToken(e.target.value)}
            type="password"
          />
          {error && (
            <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-2 text-xs text-destructive">
              <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />{error}
            </div>
          )}
          {success && (
            <div className="rounded-lg bg-green-50 border border-green-200 p-2 text-xs text-green-700">{success}</div>
          )}
          <Button
            variant="outline"
            className="gap-2 border-[#1877F2]/30 hover:bg-[#1877F2]/5"
            disabled={!userToken.trim() || connectMutation.isPending}
            onClick={() => connectMutation.mutate()}
          >
            {connectMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Facebook className="h-4 w-4 text-[#1877F2]" />}
            Connect Pages
          </Button>

          {/* Webhook info */}
          <div className="rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground space-y-1">
            <p className="font-medium text-foreground">Webhook setup (required once)</p>
            <p>In your Facebook App → Webhooks → Add callback URL:</p>
            <code className="block bg-background border rounded px-2 py-1 text-[11px] select-all">
              {origin || "https://tijarabot.com"}/api/webhooks/meta
            </code>
            <p>Verify token: <code className="bg-background border rounded px-1">{process.env.NEXT_PUBLIC_META_VERIFY_TOKEN ?? "wa-crm-meta-webhook"}</code></p>
            <p>Subscribe to: <code>messages</code> (for both Page and Instagram)</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── API helpers ──────────────────────────────────────────────────────────────

async function fetchSessions(): Promise<SessionWithStats[]> {
  const res = await fetch("/api/sessions");
  if (!res.ok) throw new Error("Failed to fetch sessions");
  return (await res.json()).data as SessionWithStats[];
}

async function createSession(name: string): Promise<SessionWithStats> {
  const res = await fetch("/api/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, aiEnabled: true }),
  });
  if (!res.ok) throw new Error("Failed to create session");
  return (await res.json()).data as SessionWithStats;
}

async function toggleAi(sessionId: string, aiEnabled: boolean): Promise<SessionWithStats> {
  const res = await fetch(`/api/sessions/${sessionId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ aiEnabled }),
  });
  if (!res.ok) throw new Error("Failed to update session");
  return (await res.json()).data as SessionWithStats;
}

async function deleteSession(sessionId: string): Promise<void> {
  const res = await fetch(`/api/sessions/${sessionId}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete session");
}

// ─── Status badge config ──────────────────────────────────────────────────────

const STATUS_BADGE: Record<WhatsAppStatus, { label: string; variant: string }> = {
  CONNECTED:    { label: "Connected",    variant: "success"     },
  QR_PENDING:   { label: "Scan QR",      variant: "warning"     },
  CONNECTING:   { label: "Connecting",   variant: "info"        },
  DISCONNECTED: { label: "Disconnected", variant: "outline"     },
  BANNED:       { label: "Banned",       variant: "destructive" },
  LOGGED_OUT:   { label: "Logged Out",   variant: "destructive" },
};

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function ConnectionsPage() {
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState("");
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ["sessions"],
    queryFn: fetchSessions,
    refetchInterval: 10_000,
  });

  const createMutation = useMutation({
    mutationFn: createSession,
    onSuccess: (s) => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      setNewName("");
      setSelectedSessionId(s.id);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSession,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      if (selectedSessionId === id) setSelectedSessionId(null);
    },
  });

  const handleToggleAi = async (sessionId: string, current: boolean) => {
    setTogglingId(sessionId);
    try {
      await toggleAi(sessionId, !current);
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
    } finally {
      setTogglingId(null);
    }
  };

  const selectedSession = sessions.find((s) => s.id === selectedSessionId);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <Header title="Connections" description="Manage your WhatsApp device sessions" />

      <main className="flex flex-1 overflow-hidden">
        {/* Left — session list */}
        <div className="flex w-80 shrink-0 flex-col border-r overflow-hidden bg-card">
          {/* New session form */}
          <div className="border-b p-4 space-y-2">
            <p className="text-xs font-semibold uppercase text-muted-foreground">New Connection</p>
            <div className="flex gap-2">
              <Input
                placeholder="Session name…"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && createMutation.mutate(newName.trim())}
              />
              <Button
                size="icon"
                onClick={() => createMutation.mutate(newName.trim())}
                disabled={createMutation.isPending || !newName.trim()}
                className="shrink-0"
              >
                {createMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Session list */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : sessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center gap-3 px-2">
                <Smartphone className="h-10 w-10 text-muted-foreground/40" />
                <div>
                  <p className="text-sm font-medium">No connections yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Create one above to get started</p>
                </div>
              </div>
            ) : (
              sessions.map((s) => {
                const badge = STATUS_BADGE[s.status];
                return (
                  <div
                    key={s.id}
                    onClick={() => setSelectedSessionId(s.id)}
                    className={`rounded-lg border p-3 cursor-pointer transition-colors hover:bg-accent/50 ${
                      selectedSessionId === s.id ? "border-primary bg-accent" : ""
                    }`}
                  >
                    {/* Top row */}
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm truncate flex-1 mr-2">{s.name}</span>
                      <Badge variant={badge.variant as never} className="text-[10px] px-1.5 py-0 shrink-0">
                        {badge.label}
                      </Badge>
                    </div>

                    {/* Phone */}
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mb-2">
                      {s.status === "CONNECTED" ? (
                        <Wifi className="h-3 w-3 text-green-500" />
                      ) : (
                        <WifiOff className="h-3 w-3" />
                      )}
                      {s.phoneNumber ?? "Not linked"}
                    </p>

                    {/* Stats */}
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground mb-2">
                      <span>{s._count.contacts} contacts</span>
                      <span>·</span>
                      <span>{s._count.messages} msgs</span>
                    </div>

                    {/* AI toggle + delete */}
                    <div className="flex items-center justify-between">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleToggleAi(s.id, s.aiEnabled); }}
                        disabled={togglingId === s.id}
                        className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors border ${
                          s.aiEnabled
                            ? "bg-primary/10 text-primary border-primary/30 hover:bg-primary/20"
                            : "bg-muted text-muted-foreground border-border hover:bg-accent"
                        }`}
                      >
                        {togglingId === s.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Bot className="h-3 w-3" />
                        )}
                        {s.aiEnabled ? "AI On" : "AI Off"}
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Delete "${s.name}"?`)) deleteMutation.mutate(s.id);
                        }}
                        className="rounded p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right — QR panel + Social */}
        <div className="flex flex-1 overflow-auto bg-muted/30">
          <div className="flex flex-1 items-start justify-center p-6 gap-6 flex-wrap">
            {/* WhatsApp QR */}
            <div className="flex flex-col items-center gap-4">
              {selectedSession ? (
                <Card className="w-auto shadow-md">
                  <QrPanel
                    sessionId={selectedSession.id}
                    sessionName={selectedSession.name}
                  />
                </Card>
              ) : (
                <div className="flex flex-col items-center gap-4 text-center">
                  <div className="rounded-full bg-muted p-6">
                    <Smartphone className="h-12 w-12 text-muted-foreground/50" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Select a connection</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Choose a WhatsApp session from the left to view its QR code
                    </p>
                  </div>
                  <Button
                    variant="whatsapp"
                    className="gap-2"
                    onClick={() => {
                      const name = `Session ${sessions.length + 1}`;
                      createMutation.mutate(name);
                    }}
                    disabled={createMutation.isPending}
                  >
                    <Plus className="h-4 w-4" />
                    New Connection
                  </Button>
                </div>
              )}
            </div>

            {/* Social Media */}
            <div className="w-full max-w-md">
              <p className="text-xs font-semibold uppercase text-muted-foreground mb-3 flex items-center gap-2">
                <Facebook className="h-3.5 w-3.5 text-[#1877F2]" />
                <Instagram className="h-3.5 w-3.5 text-[#E1306C]" />
                Social Media Channels
              </p>
              <SocialPagesSection />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
