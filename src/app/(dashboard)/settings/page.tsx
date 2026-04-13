"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { Save, Plus, Trash2, Copy, Check, Code2, Loader2, Bot, User, Palette } from "lucide-react";
import { Header } from "@/components/dashboard/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Widget {
  id: string;
  name: string;
  welcomeMessage: string;
  buttonColor: string;
  position: string;
  phoneNumber: string;
  isActive: boolean;
  embedViews: number;
}

interface Session { id: string; name: string; status: string; aiEnabled: boolean; aiPrompt: string | null }

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy} className="p-1.5 rounded hover:bg-accent transition-colors text-muted-foreground">
      {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

export default function SettingsPage() {
  const { data: authSession } = useSession();
  const queryClient = useQueryClient();

  // Widget form
  const [widgetForm, setWidgetForm] = useState({
    name: "Support Widget",
    welcomeMessage: "Hi! How can we help you?",
    buttonColor: "#25D366",
    position: "bottom-right",
    phoneNumber: "",
  });

  // AI settings per session
  const [aiPrompts, setAiPrompts] = useState<Record<string, string>>({});

  const { data: widgets = [], isLoading: widgetsLoading } = useQuery<Widget[]>({
    queryKey: ["widgets"],
    queryFn: async () => { const r = await fetch("/api/widgets"); return (await r.json()).data; },
  });

  const { data: sessions = [] } = useQuery<Session[]>({
    queryKey: ["sessions"],
    queryFn: async () => { const r = await fetch("/api/sessions"); return (await r.json()).data; },
  });

  const createWidgetMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/widgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(widgetForm),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["widgets"] }),
  });

  const saveAiPrompt = async (sessionId: string) => {
    await fetch(`/api/sessions/${sessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ aiPrompt: aiPrompts[sessionId] }),
    });
    queryClient.invalidateQueries({ queryKey: ["sessions"] });
  };

  const embedCode = (widget: Widget) =>
    `<script src="${typeof window !== "undefined" ? window.location.origin : ""}/widget.js" data-widget-id="${widget.id}" defer></script>`;

  const userName = authSession?.user?.name ?? "User";
  const userEmail = authSession?.user?.email ?? "";

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <Header title="Settings" description="Manage your account, AI configuration, and widgets" />

      <main className="flex-1 overflow-y-auto p-6 space-y-6 max-w-4xl">

        {/* Profile */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><User className="h-4 w-4" />Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-sm font-medium">Name</label>
                <Input defaultValue={userName} placeholder="Your name" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Email</label>
                <Input defaultValue={userEmail} disabled className="opacity-60" />
              </div>
            </div>
            <Button size="sm" className="gap-2"><Save className="h-3.5 w-3.5" />Save Profile</Button>
          </CardContent>
        </Card>

        {/* AI Configuration per session */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Bot className="h-4 w-4" />AI Configuration</CardTitle>
            <CardDescription>Customize AI behavior for each WhatsApp session</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {sessions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No sessions yet. Create a connection first.</p>
            ) : sessions.map((s) => (
              <div key={s.id} className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{s.name}</p>
                    <p className="text-xs text-muted-foreground">{s.status}</p>
                  </div>
                  <Badge variant={s.aiEnabled ? "success" : "outline"} className="text-xs">
                    {s.aiEnabled ? "AI On" : "AI Off"}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Custom System Prompt</label>
                  <textarea
                    rows={3}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    placeholder="مثال: أنت مساعد لمتجر X. نبيع الإلكترونيات. كن دائماً ودوداً وموجزاً في ردودك."
                    defaultValue={s.aiPrompt ?? ""}
                    onChange={(e) => setAiPrompts((p) => ({ ...p, [s.id]: e.target.value }))}
                  />
                </div>
                <Button size="sm" variant="outline" className="gap-2" onClick={() => saveAiPrompt(s.id)}>
                  <Save className="h-3.5 w-3.5" />Save Prompt
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Website Widget */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Code2 className="h-4 w-4" />Website Chat Widget</CardTitle>
            <CardDescription>Embed a WhatsApp chat button on your website with one line of code</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Create widget form */}
            <div className="rounded-lg border p-4 space-y-3 bg-muted/30">
              <p className="text-sm font-medium flex items-center gap-2"><Plus className="h-4 w-4" />Create New Widget</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-medium">Widget Name</label>
                  <Input placeholder="Support Widget" value={widgetForm.name} onChange={(e) => setWidgetForm({ ...widgetForm, name: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium">WhatsApp Phone Number</label>
                  <Input placeholder="+1234567890" value={widgetForm.phoneNumber} onChange={(e) => setWidgetForm({ ...widgetForm, phoneNumber: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium">Welcome Message</label>
                  <Input placeholder="Hi! How can we help?" value={widgetForm.welcomeMessage} onChange={(e) => setWidgetForm({ ...widgetForm, welcomeMessage: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium">Button Color</label>
                  <div className="flex gap-2">
                    <input type="color" value={widgetForm.buttonColor} onChange={(e) => setWidgetForm({ ...widgetForm, buttonColor: e.target.value })} className="h-10 w-14 rounded-md border cursor-pointer" />
                    <Input value={widgetForm.buttonColor} onChange={(e) => setWidgetForm({ ...widgetForm, buttonColor: e.target.value })} className="flex-1" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium">Position</label>
                  <select
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                    value={widgetForm.position}
                    onChange={(e) => setWidgetForm({ ...widgetForm, position: e.target.value })}
                  >
                    <option value="bottom-right">Bottom Right</option>
                    <option value="bottom-left">Bottom Left</option>
                  </select>
                </div>
              </div>
              <Button
                size="sm"
                variant="whatsapp"
                className="gap-2"
                disabled={!widgetForm.phoneNumber || createWidgetMutation.isPending}
                onClick={() => createWidgetMutation.mutate()}
              >
                {createWidgetMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                Create Widget
              </Button>
            </div>

            {/* Widget list */}
            {widgetsLoading ? (
              <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : widgets.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No widgets created yet</p>
            ) : widgets.map((w) => (
              <div key={w.id} className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 rounded-full border" style={{ backgroundColor: w.buttonColor }} />
                    <p className="font-medium text-sm">{w.name}</p>
                  </div>
                  <Badge variant="success" className="text-xs">Active</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{w.phoneNumber} · {w.position} · {w.embedViews} views</p>
                <div className="rounded-md bg-muted p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-muted-foreground">Embed Code</span>
                    <CopyButton text={embedCode(w)} />
                  </div>
                  <code className="text-xs text-foreground break-all">{embedCode(w)}</code>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Danger zone */}
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="text-base text-destructive">Danger Zone</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Delete Account</p>
                <p className="text-xs text-muted-foreground">Permanently delete your account and all data</p>
              </div>
              <Button variant="destructive" size="sm">Delete Account</Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
