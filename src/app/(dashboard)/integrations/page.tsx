"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Check, Loader2, Trash2, ExternalLink, AlertCircle,
  ShoppingBag, Store, RefreshCw, ArrowDownToLine, Zap, Package,
  FileSpreadsheet, Download, Globe, CheckCircle2, X, Instagram, Facebook,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Header } from "@/components/dashboard/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

// ─── Types ────────────────────────────────────────────────────────────────────

type IntegrationType = "SHOPIFY" | "WOOCOMMERCE" | "YOUCAN" | "LIGHTFUNNELS" | "GOOGLESHEETS" | "FACEBOOK" | "INSTAGRAM" | "TIKTOK";

interface Integration {
  id: string;
  type: IntegrationType;
  isActive: boolean;
  shopDomain?: string;
  siteUrl?: string;
  lastSyncAt?: string;
}

interface SyncResult {
  created: number; skipped: number; updated: number;
}

interface PlatformDef {
  label: string;
  description: string;
  category: string;
  iconBg: string;
  iconColor: string;
  Icon: React.ElementType;
  oauthPath?: string;
  needsUrl?: boolean;         // needs a URL input before connecting (shown in a popup)
  urlPlaceholder?: string;
  urlParam?: string;          // query param name to pass the url
  comingSoon?: boolean;
  badge?: string;
}

// ─── Platform definitions ─────────────────────────────────────────────────────

const PLATFORMS: Record<IntegrationType, PlatformDef> = {
  SHOPIFY: {
    label: "Shopify",
    description: "Sync products and orders from your Shopify store",
    category: "E-commerce",
    iconBg: "bg-[#96bf48]/15",
    iconColor: "text-[#96bf48]",
    Icon: ShoppingBag,
    oauthPath: "/api/oauth/shopify",
    needsUrl: true,
    urlPlaceholder: "mystore.myshopify.com",
    urlParam: "shop",
  },
  YOUCAN: {
    label: "YouCan Shop",
    description: "Connect your YouCan store to sync orders",
    category: "E-commerce",
    iconBg: "bg-blue-500/15",
    iconColor: "text-blue-500",
    Icon: Store,
    oauthPath: "/api/oauth/youcan",
  },
  LIGHTFUNNELS: {
    label: "LightFunnels",
    description: "Integrate with LightFunnels funnels and leads",
    category: "Marketing",
    iconBg: "bg-orange-500/15",
    iconColor: "text-orange-500",
    Icon: Zap,
    oauthPath: "/api/oauth/lightfunnels",
  },
  WOOCOMMERCE: {
    label: "WooCommerce",
    description: "Connect your WordPress / WooCommerce store",
    category: "E-commerce",
    iconBg: "bg-[#7f54b3]/15",
    iconColor: "text-[#7f54b3]",
    Icon: Store,
    oauthPath: "/api/oauth/woocommerce",
    needsUrl: true,
    urlPlaceholder: "https://mystore.com",
    urlParam: "url",
  },
  GOOGLESHEETS: {
    label: "Google Sheets",
    description: "Export contacts and orders to a spreadsheet",
    category: "Productivity",
    iconBg: "bg-green-500/15",
    iconColor: "text-green-600",
    Icon: FileSpreadsheet,
    oauthPath: "/api/oauth/google",
    badge: "Export",
  },
  INSTAGRAM: {
    label: "Instagram",
    description: "Connect Instagram Business Account",
    category: "Social Media",
    iconBg: "bg-pink-500/15",
    iconColor: "text-pink-500",
    Icon: Instagram,
    oauthPath: "/api/oauth/instagram",
  },
  FACEBOOK: {
    label: "Facebook",
    description: "Connect your Facebook Business Page",
    category: "Social Media",
    iconBg: "bg-blue-600/15",
    iconColor: "text-blue-600",
    Icon: Facebook,
    oauthPath: "/api/oauth/facebook",
  },
  TIKTOK: {
    label: "TikTok",
    description: "Connect your TikTok account",
    category: "Social Media",
    iconBg: "bg-neutral-500/15",
    iconColor: "text-neutral-700 dark:text-neutral-300",
    Icon: ({ className }: { className?: string }) => (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.32 6.32 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.75a4.85 4.85 0 0 1-1.02-.06z"/>
      </svg>
    ),
    oauthPath: "/api/oauth/tiktok",
  },
};

const STORE_TYPES: IntegrationType[] = ["SHOPIFY", "WOOCOMMERCE", "YOUCAN", "LIGHTFUNNELS"];

// ─── URL prompt modal ─────────────────────────────────────────────────────────

function UrlPromptModal({
  platform, def, onClose,
}: {
  platform: string;
  def: PlatformDef;
  onClose: () => void;
}) {
  const [url, setUrl] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleConnect = () => {
    if (!url.trim() || !def.oauthPath) return;
    window.location.href = `${def.oauthPath}?${def.urlParam}=${encodeURIComponent(url.trim())}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-background border rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`rounded-xl p-2.5 ${def.iconBg}`}>
              <def.Icon className={`h-5 w-5 ${def.iconColor}`} />
            </div>
            <div>
              <p className="font-semibold">{def.label}</p>
              <p className="text-xs text-muted-foreground">Enter your store URL to continue</p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="relative">
          <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            ref={inputRef}
            className="pl-9"
            placeholder={def.urlPlaceholder}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleConnect()}
          />
        </div>

        <Button variant="whatsapp" className="w-full gap-2" disabled={!url.trim()} onClick={handleConnect}>
          <ExternalLink className="h-4 w-4" />
          Connect with {def.label}
        </Button>
        <p className="text-[11px] text-center text-muted-foreground">
          You&apos;ll be redirected to {def.label} to approve access
        </p>
      </div>
    </div>
  );
}

// ─── Sheet ID modal (Google Sheets post-OAuth) ────────────────────────────────

function SheetIdModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [sheetId, setSheetId] = useState("");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const save = async () => {
    if (!sheetId.trim()) return;
    setSaving(true);
    try {
      await fetch("/api/oauth/google/sheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spreadsheetId: sheetId.trim() }),
      });
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-background border rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <p className="font-semibold">Add your Spreadsheet ID</p>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>
        <p className="text-xs text-muted-foreground">
          Open your Google Sheet and copy the ID from the URL:<br />
          <code className="bg-muted px-1 rounded">docs.google.com/spreadsheets/d/<strong>ID_HERE</strong>/edit</code>
        </p>
        <Input ref={inputRef} placeholder="Paste spreadsheet ID" value={sheetId} onChange={(e) => setSheetId(e.target.value)} onKeyDown={(e) => e.key === "Enter" && save()} />
        <Button variant="whatsapp" className="w-full" disabled={!sheetId.trim() || saving} onClick={save}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Spreadsheet"}
        </Button>
      </div>
    </div>
  );
}

// ─── Single platform card ─────────────────────────────────────────────────────

function PlatformCard({
  platformKey, def, integration, onConnect, onDisconnect, disconnecting,
}: {
  platformKey: string;
  def: PlatformDef;
  integration?: Integration;
  onConnect: () => void;
  onDisconnect: () => void;
  disconnecting: boolean;
}) {
  const connected = !!integration;

  return (
    <div
      className={`relative rounded-2xl border p-5 flex flex-col gap-3 transition-all
        ${connected ? "border-primary/30 bg-primary/5" : def.comingSoon ? "opacity-60" : "hover:border-primary/20 hover:shadow-sm cursor-pointer bg-background"}
      `}
      onClick={() => !connected && !def.comingSoon && onConnect()}
    >
      {/* Connected badge */}
      {connected && (
        <div className="absolute top-3 right-3 flex items-center gap-1 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 text-[10px] font-semibold">
          <Check className="h-3 w-3" /> Connected
        </div>
      )}

      {/* Coming soon badge */}
      {def.comingSoon && (
        <div className="absolute top-3 right-3 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-0.5 text-[10px] font-semibold">
          Coming Soon
        </div>
      )}

      {/* Export badge */}
      {def.badge && !connected && !def.comingSoon && (
        <div className="absolute top-3 right-3 rounded-full bg-muted text-muted-foreground px-2 py-0.5 text-[10px] font-semibold">
          {def.badge}
        </div>
      )}

      {/* Icon + name */}
      <div className="flex items-center gap-3">
        <div className={`rounded-xl p-2.5 ${def.iconBg} shrink-0`}>
          <def.Icon className={`h-5 w-5 ${def.iconColor}`} />
        </div>
        <div>
          <p className="font-semibold text-sm">{def.label}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{def.description}</p>
        </div>
      </div>

      {/* Category tag */}
      <div>
        <span className="text-[10px] rounded-full border px-2 py-0.5 text-muted-foreground">
          {def.category}
        </span>
      </div>

      {/* Disconnect button if connected */}
      {connected && (
        <button
          className="flex items-center gap-1 text-[11px] text-destructive/70 hover:text-destructive transition-colors w-fit"
          onClick={(e) => { e.stopPropagation(); onDisconnect(); }}
          disabled={disconnecting}
        >
          <Trash2 className="h-3 w-3" /> Disconnect
        </button>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function IntegrationsPage() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();

  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [urlPrompt, setUrlPrompt] = useState<string | null>(null);   // platform key
  const [sheetModal, setSheetModal] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [syncError, setSyncError] = useState("");
  const [productSyncDone, setProductSyncDone] = useState(false);
  const [sheetsMsg, setSheetsMsg] = useState("");

  // OAuth callback feedback
  useEffect(() => {
    const success = searchParams.get("success");
    const error = searchParams.get("error");
    const needsSheet = searchParams.get("needsSheet");
    if (success) {
      const label = PLATFORMS[success as IntegrationType]?.label ?? success;
      setToast({ msg: `${label} connected successfully!`, ok: true });
      setTimeout(() => setToast(null), 5000);
    }
    if (error) {
      setToast({ msg: `Connection failed: ${error.replace(/_/g, " ")}`, ok: false });
      setTimeout(() => setToast(null), 6000);
    }
    if (needsSheet === "1") setSheetModal(true);
  }, [searchParams]);

  const { data: integrations = [] } = useQuery<Integration[]>({
    queryKey: ["integrations"],
    queryFn: async () => { const r = await fetch("/api/integrations"); return (await r.json()).data ?? []; },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fetch(`/api/integrations?id=${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["integrations"] }),
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      setSyncError(""); setSyncResult(null);
      const res = await fetch("/api/integrations/sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      return json.data as SyncResult;
    },
    onSuccess: (d) => { setSyncResult(d); queryClient.invalidateQueries({ queryKey: ["integrations", "orders", "contacts-page"] }); },
    onError: (err: Error) => setSyncError(err.message),
  });

  const productSyncMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/integrations/products", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      return json.data;
    },
    onSuccess: () => { setProductSyncDone(true); queryClient.invalidateQueries({ queryKey: ["product-counts"] }); },
  });

  const sheetsExportMutation = useMutation({
    mutationFn: async (exportType: "orders" | "contacts") => {
      setSheetsMsg("");
      const res = await fetch("/api/integrations/sheets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ exportType }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      return json.data as { exported: number; type: string };
    },
    onSuccess: (d) => setSheetsMsg(`✅ ${d.exported} ${d.type} exported`),
    onError: (err: Error) => setSheetsMsg(`❌ ${err.message}`),
  });

  const getIntegration = (type: IntegrationType) => integrations.find((i) => i.type === type);
  const connectedStores = STORE_TYPES.filter((t) => getIntegration(t));
  const gSheets = getIntegration("GOOGLESHEETS");

  const handleConnect = (key: string) => {
    const def = PLATFORMS[key as IntegrationType];
    if (!def?.oauthPath) return;
    if (def.needsUrl) {
      setUrlPrompt(key);
    } else {
      window.location.href = def.oauthPath;
    }
  };

  const platformOrder = ["SHOPIFY", "YOUCAN", "LIGHTFUNNELS", "WOOCOMMERCE", "GOOGLESHEETS", "INSTAGRAM", "FACEBOOK", "TIKTOK"];

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <Header title="Integrations" description="Connect your platforms with one click" />

      <main className="flex-1 overflow-y-auto p-6 space-y-6 max-w-4xl">

        {/* Toast */}
        {toast && (
          <div className={`flex items-center gap-2 rounded-xl p-4 text-sm font-medium border ${toast.ok ? "bg-green-50 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800" : "bg-destructive/10 text-destructive border-destructive/20"}`}>
            {toast.ok ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
            {toast.msg}
          </div>
        )}

        {/* Sync panel — only when a store is connected */}
        {connectedStores.length > 0 && (
          <div className="rounded-2xl border-2 border-primary/20 bg-primary/5 p-5 space-y-4">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <p className="font-semibold text-sm flex items-center gap-2">
                  <ArrowDownToLine className="h-4 w-4 text-primary" /> Sync Data
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Pull orders & products from {connectedStores.map((t) => PLATFORMS[t].label).join(", ")}
                </p>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button variant="whatsapp" size="sm" className="gap-2 h-8" disabled={syncMutation.isPending} onClick={() => syncMutation.mutate()}>
                  {syncMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                  Sync Orders
                </Button>
                <Button variant="outline" size="sm" className="gap-2 h-8" disabled={productSyncMutation.isPending} onClick={() => productSyncMutation.mutate()}>
                  {productSyncMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Package className="h-3.5 w-3.5" />}
                  Sync Products
                </Button>
              </div>
            </div>

            {syncMutation.isPending && (
              <div className="rounded-lg bg-background border p-3 text-xs text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" /> Fetching orders, please wait…
              </div>
            )}
            {syncResult && !syncMutation.isPending && (
              <div className="grid grid-cols-3 gap-2">
                {[{ v: syncResult.created, l: "Imported", c: "text-green-600" }, { v: syncResult.updated, l: "Updated", c: "text-blue-500" }, { v: syncResult.skipped, l: "Skipped", c: "text-muted-foreground" }].map(({ v, l, c }) => (
                  <div key={l} className="rounded-lg border bg-background p-3 text-center">
                    <p className={`text-xl font-bold ${c}`}>{v}</p>
                    <p className="text-[11px] text-muted-foreground">{l}</p>
                  </div>
                ))}
              </div>
            )}
            {syncError && (
              <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-xs text-destructive">
                <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />{syncError}
              </div>
            )}
            {productSyncDone && !productSyncMutation.isPending && (
              <p className="text-xs text-green-700 bg-green-50 dark:bg-green-900/20 dark:text-green-400 rounded-lg p-3 border border-green-100 dark:border-green-800">
                ✅ Products synced — AI chatbot now knows your catalog
              </p>
            )}
          </div>
        )}

        {/* Google Sheets export bar */}
        {gSheets?.shopDomain && (
          <div className="rounded-2xl border border-green-200 dark:border-green-800 bg-green-50/60 dark:bg-green-900/10 p-4 flex items-center justify-between gap-4 flex-wrap">
            <p className="text-sm font-medium flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4 text-green-600" /> Export to Google Sheets
            </p>
            <div className="flex gap-2 items-center flex-wrap">
              <Button size="sm" variant="outline" className="gap-1.5 h-8 border-green-300" disabled={sheetsExportMutation.isPending} onClick={() => sheetsExportMutation.mutate("orders")}>
                <Download className="h-3.5 w-3.5" /> Orders
              </Button>
              <Button size="sm" variant="outline" className="gap-1.5 h-8 border-green-300" disabled={sheetsExportMutation.isPending} onClick={() => sheetsExportMutation.mutate("contacts")}>
                <Download className="h-3.5 w-3.5" /> Contacts
              </Button>
              {sheetsMsg && <span className={`text-xs ${sheetsMsg.startsWith("✅") ? "text-green-700" : "text-destructive"}`}>{sheetsMsg}</span>}
            </div>
          </div>
        )}

        {/* Platform grid */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
            Choose a platform to connect
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {platformOrder.map((key) => {
              const def = PLATFORMS[key as IntegrationType];
              if (!def) return null;
              const integration = integrations.find((i) => i.type === key);
              return (
                <PlatformCard
                  key={key}
                  platformKey={key}
                  def={def}
                  integration={integration}
                  onConnect={() => handleConnect(key)}
                  onDisconnect={() => integration && deleteMutation.mutate(integration.id)}
                  disconnecting={deleteMutation.isPending}
                />
              );
            })}
          </div>
        </div>

      </main>

      {/* URL prompt modal */}
      {urlPrompt && (
        <UrlPromptModal
          platform={urlPrompt}
          def={PLATFORMS[urlPrompt as IntegrationType]}
          onClose={() => setUrlPrompt(null)}
        />
      )}

      {/* Google Sheet ID modal */}
      {sheetModal && (
        <SheetIdModal
          onClose={() => setSheetModal(false)}
          onSaved={() => { setSheetModal(false); queryClient.invalidateQueries({ queryKey: ["integrations"] }); }}
        />
      )}
    </div>
  );
}
