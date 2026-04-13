"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Zap, Plus, Trash2, X, Loader2, Play, Pause,
  ShoppingBag, Store, Activity, ToggleLeft, ToggleRight,
} from "lucide-react";
import { Header } from "@/components/dashboard/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

type TriggerType =
  | "SHOPIFY_ORDER"
  | "YOUCAN_ORDER"
  | "LIGHTFUNNEL_STORE"
  | "LIGHTFUNNEL_LEAD"
  | "WOOCOMMERCE_ORDER";

type ActionType = "SEND_WA_MESSAGE" | "UPDATE_STATUS" | "ADD_TAG";

interface FlowAction {
  type: ActionType;
  template?: string;
  status?: string;
  tag?: string;
}

interface Flow {
  id: string;
  name: string;
  trigger: TriggerType;
  actions: FlowAction[];
  isActive: boolean;
  lastRunAt?: string | null;
  runCount: number;
  createdAt: string;
}

const TRIGGERS: Array<{
  type: TriggerType;
  label: string;
  description: string;
  category: string;
  icon: React.ElementType;
  color: string;
  bg: string;
}> = [
  {
    type: "SHOPIFY_ORDER",
    label: "Shopify Order",
    description: "Trigger when a new Shopify order is placed",
    category: "E-commerce",
    icon: ShoppingBag,
    color: "text-[#96bf48]",
    bg: "bg-[#96bf48]/10",
  },
  {
    type: "YOUCAN_ORDER",
    label: "Youcan Order",
    description: "Trigger when a new Youcan order is placed",
    category: "E-commerce",
    icon: Store,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
  },
  {
    type: "LIGHTFUNNEL_STORE",
    label: "LightFunnel Store",
    description: "Trigger when a new LightFunnel order is placed",
    category: "E-commerce",
    icon: Zap,
    color: "text-orange-500",
    bg: "bg-orange-500/10",
  },
  {
    type: "LIGHTFUNNEL_LEAD",
    label: "LightFunnel Lead",
    description: "Capture leads from LightFunnel",
    category: "Marketing",
    icon: Activity,
    color: "text-purple-500",
    bg: "bg-purple-500/10",
  },
  {
    type: "WOOCOMMERCE_ORDER",
    label: "WooCommerce Order",
    description: "Trigger when a new WooCommerce order is created",
    category: "E-commerce",
    icon: Store,
    color: "text-[#7f54b3]",
    bg: "bg-[#7f54b3]/10",
  },
];

const DEFAULT_TEMPLATES: Record<TriggerType, string> = {
  SHOPIFY_ORDER: "🎉 مرحباً {{customer_name}}! شكراً لطلبك من متجرنا. رقم طلبك: #{{order_number}}. إجمالي: {{total}} MAD. سنبلغك عند الشحن!",
  YOUCAN_ORDER: "🎉 مرحباً {{customer_name}}! تم استلام طلبك بنجاح. رقم الطلب: #{{order_ref}}. إجمالي: {{total}} MAD. سنتواصل معك قريباً!",
  LIGHTFUNNEL_STORE: "✅ شكراً {{customer_name}} على طلبك! تم استلامه وسيتم التواصل معك في أقرب وقت.",
  LIGHTFUNNEL_LEAD: "👋 مرحباً {{name}}! شكراً لاهتمامك. سيتواصل معك فريقنا قريباً للمزيد من المعلومات.",
  WOOCOMMERCE_ORDER: "🛒 مرحباً {{customer_name}}! تم استلام طلبك #{{order_number}} بنجاح. سنبدأ التحضير فوراً!",
};

function CreateFlowModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [step, setStep] = useState<"trigger" | "actions">("trigger");
  const [name, setName] = useState("");
  const [selectedTrigger, setSelectedTrigger] = useState<TriggerType | null>(null);
  const [template, setTemplate] = useState("");
  const [error, setError] = useState("");

  const mutation = useMutation({
    mutationFn: async () => {
      if (!selectedTrigger) throw new Error("Select a trigger");
      const res = await fetch("/api/flows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name || `${TRIGGERS.find((t) => t.type === selectedTrigger)?.label} Flow`,
          trigger: selectedTrigger,
          actions: [{ type: "SEND_WA_MESSAGE", template }],
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      return json;
    },
    onSuccess: () => { onSuccess(); onClose(); },
    onError: (err: Error) => setError(err.message),
  });

  const handleTriggerSelect = (trigger: TriggerType) => {
    setSelectedTrigger(trigger);
    setTemplate(DEFAULT_TEMPLATES[trigger]);
    setStep("actions");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-card border shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-lg font-bold">Create New Flow</h2>
            <p className="text-sm text-muted-foreground">Choose a trigger to start your automation</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-accent"><X className="h-5 w-5" /></button>
        </div>

        {step === "trigger" ? (
          <div className="p-6 space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Flow Name</label>
              <Input
                placeholder="e.g., Shopify Lead to WhatsApp"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Trigger</label>
              <div className="grid grid-cols-2 gap-3">
                {TRIGGERS.map((t) => {
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.type}
                      className="relative text-left rounded-xl border p-4 transition-all hover:border-primary hover:bg-accent cursor-pointer"
                      onClick={() => handleTriggerSelect(t.type)}
                    >
                      <div className={`inline-flex rounded-lg p-2 mb-2 ${t.bg}`}>
                        <Icon className={`h-5 w-5 ${t.color}`} />
                      </div>
                      <p className="font-medium text-sm">{t.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>
                      <span className="inline-block mt-2 rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">{t.category}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6 space-y-4">
            <button onClick={() => setStep("trigger")} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
              ← Back to triggers
            </button>

            <div className="rounded-xl border-2 border-primary/20 bg-primary/5 p-4">
              <p className="text-sm font-medium mb-1">Trigger selected:</p>
              <p className="text-primary font-bold">{TRIGGERS.find((t) => t.type === selectedTrigger)?.label}</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Action: Send WhatsApp Message</label>
              <p className="text-xs text-muted-foreground">
                Use variables: {"{customer_name}"}, {"{order_number}"}, {"{total}"}, {"{name}"}
              </p>
              <textarea
                className="w-full rounded-md border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                rows={5}
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
                placeholder="Write your WhatsApp message template..."
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        )}

        <div className="flex gap-3 p-6 border-t">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          {step === "actions" && (
            <Button
              variant="whatsapp"
              className="flex-1"
              disabled={!selectedTrigger || !template || mutation.isPending}
              onClick={() => mutation.mutate()}
            >
              {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
              Create Flow
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function FlowPage() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);

  const { data: flows = [], isLoading } = useQuery<Flow[]>({
    queryKey: ["flows"],
    queryFn: async () => { const r = await fetch("/api/flows"); return (await r.json()).data ?? []; },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fetch(`/api/flows/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["flows"] }),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      fetch(`/api/flows/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["flows"] }),
  });

  const getTriggerMeta = (trigger: TriggerType) => TRIGGERS.find((t) => t.type === trigger);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <Header
        title="Flow Automation"
        description="Automate WhatsApp messages triggered by store events"
        actions={
          <Button variant="whatsapp" size="sm" className="gap-2" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4" /> Create Flow
          </Button>
        }
      />

      <main className="flex-1 overflow-y-auto p-6 space-y-6 max-w-4xl">
        {/* How it works */}
        <div className="rounded-xl border bg-muted/30 p-4">
          <p className="font-semibold text-sm mb-2 flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            How Flows work
          </p>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li><strong>Trigger:</strong> Choose an event (new order from Shopify, YouCan, LightFunnels, etc.)</li>
            <li><strong>Action:</strong> Send a personalized WhatsApp message to the customer automatically</li>
            <li><strong>Run:</strong> Flows execute on the next sync — or instantly via webhook (coming soon)</li>
          </ul>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : flows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="rounded-2xl bg-muted/50 p-6 mb-4">
              <Zap className="h-12 w-12 text-muted-foreground mx-auto" />
            </div>
            <h3 className="font-semibold text-lg mb-1">No flows yet</h3>
            <p className="text-sm text-muted-foreground mb-4">Create your first automation flow to send WhatsApp messages automatically when orders arrive</p>
            <Button variant="whatsapp" className="gap-2" onClick={() => setShowCreate(true)}>
              <Plus className="h-4 w-4" /> Create Flow
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {flows.map((flow) => {
              const meta = getTriggerMeta(flow.trigger);
              const Icon = meta?.icon ?? Zap;

              return (
                <Card key={flow.id} className={`transition-opacity ${!flow.isActive ? "opacity-60" : ""}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className={`rounded-lg p-2 ${meta?.bg ?? "bg-muted"}`}>
                          <Icon className={`h-5 w-5 ${meta?.color ?? "text-muted-foreground"}`} />
                        </div>
                        <div>
                          <CardTitle className="text-base flex items-center gap-2">
                            {flow.name}
                            <Badge variant={flow.isActive ? "success" : "secondary"} className="text-[10px]">
                              {flow.isActive ? "Active" : "Paused"}
                            </Badge>
                          </CardTitle>
                          <CardDescription className="text-xs">
                            Trigger: <span className="font-medium text-foreground">{meta?.label ?? flow.trigger}</span>
                            {" · "}Run {flow.runCount} time{flow.runCount !== 1 ? "s" : ""}
                            {flow.lastRunAt && ` · Last run ${new Date(flow.lastRunAt).toLocaleDateString()}`}
                          </CardDescription>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          className="text-muted-foreground hover:text-foreground transition-colors"
                          title={flow.isActive ? "Pause flow" : "Activate flow"}
                          onClick={() => toggleMutation.mutate({ id: flow.id, isActive: !flow.isActive })}
                        >
                          {flow.isActive ? <ToggleRight className="h-6 w-6 text-primary" /> : <ToggleLeft className="h-6 w-6" />}
                        </button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                          disabled={deleteMutation.isPending}
                          onClick={() => deleteMutation.mutate(flow.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-0 space-y-2">
                    {(flow.actions as FlowAction[]).map((action, i) => (
                      <div key={i} className="rounded-lg bg-muted/40 p-3 text-sm">
                        <p className="text-xs font-semibold text-muted-foreground mb-1">
                          {action.type === "SEND_WA_MESSAGE" ? "Send WhatsApp Message"
                            : action.type === "UPDATE_STATUS" ? "Update Order Status"
                            : "Add Tag"}
                        </p>
                        {action.template && (
                          <p className="text-xs text-foreground line-clamp-2">{action.template}</p>
                        )}
                        {action.status && <p className="text-xs">Status → {action.status}</p>}
                        {action.tag && <p className="text-xs">Tag: #{action.tag}</p>}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      {showCreate && (
        <CreateFlowModal
          onClose={() => setShowCreate(false)}
          onSuccess={() => queryClient.invalidateQueries({ queryKey: ["flows"] })}
        />
      )}
    </div>
  );
}
