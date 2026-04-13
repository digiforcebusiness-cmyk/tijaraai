"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ShoppingCart, Loader2, Package, ChevronDown, ExternalLink, Trash2 } from "lucide-react";
import { Header } from "@/components/dashboard/header";
import { formatPhoneNumber, formatRelativeTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { OrderStatus } from "@/types";

interface OrderWithContact {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  items: unknown;
  totalAmount: string;
  currency: string;
  createdAt: string;
  platform?: string | null;
  externalOrderId?: string | null;
  externalOrderUrl?: string | null;
  contact: { id: string; name: string | null; phoneNumber: string; jid: string; sessionId: string };
}

const STATUS_BADGE: Record<OrderStatus, { label: string; variant: string }> = {
  PENDING:    { label: "Pending",    variant: "warning"     },
  CONFIRMED:  { label: "Confirmed",  variant: "info"        },
  PROCESSING: { label: "Processing", variant: "info"        },
  SHIPPED:    { label: "Shipped",    variant: "secondary"   },
  DELIVERED:  { label: "Delivered",  variant: "success"     },
  CANCELLED:  { label: "Cancelled",  variant: "destructive" },
  REFUNDED:   { label: "Refunded",   variant: "outline"     },
};

const STATUS_FLOW: OrderStatus[] = [
  "PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED",
];

async function fetchOrders(status: string): Promise<OrderWithContact[]> {
  const params = new URLSearchParams({ limit: "30" });
  if (status) params.set("status", status);
  const res = await fetch(`/api/orders?${params}`);
  if (!res.ok) throw new Error("Failed to load orders");
  const json = await res.json();
  return json.data as OrderWithContact[];
}

const FILTERS: Array<{ label: string; value: string }> = [
  { label: "All", value: "" },
  { label: "Pending", value: "PENDING" },
  { label: "Confirmed", value: "CONFIRMED" },
  { label: "Processing", value: "PROCESSING" },
  { label: "Shipped", value: "SHIPPED" },
  { label: "Delivered", value: "DELIVERED" },
  { label: "Cancelled", value: "CANCELLED" },
];

function StatusMenu({ order, onUpdate }: { order: OrderWithContact; onUpdate: (id: string, status: OrderStatus) => void }) {
  const [open, setOpen] = useState(false);
  const badge = STATUS_BADGE[order.status];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1"
      >
        <Badge variant={badge.variant as never}>{badge.label}</Badge>
        <ChevronDown className="h-3 w-3 text-muted-foreground" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-8 z-20 w-40 rounded-lg border bg-popover shadow-lg py-1">
            {STATUS_FLOW.map((s) => (
              <button
                key={s}
                className={`w-full text-left px-3 py-1.5 text-xs hover:bg-accent transition-colors ${s === order.status ? "font-semibold text-primary" : ""}`}
                onClick={() => { onUpdate(order.id, s); setOpen(false); }}
              >
                {STATUS_BADGE[s].label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function OrdersPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState("");

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["orders", filter],
    queryFn: () => fetchOrders(filter),
    refetchInterval: 15_000,
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: OrderStatus }) => {
      const res = await fetch(`/api/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["orders"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/orders/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["orders"] }),
  });

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <Header title="Orders" description="Customer orders extracted from WhatsApp conversations" />
      <main className="flex-1 overflow-y-auto p-6 space-y-4">
        {/* Filter tabs */}
        <div className="flex gap-2 flex-wrap">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                filter === f.value
                  ? "border-primary bg-primary text-primary-foreground"
                  : "hover:bg-accent"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
            <ShoppingCart className="h-12 w-12 text-muted-foreground/30" />
            <p className="text-muted-foreground">No orders found</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {orders.map((order) => {
              const items = order.items as Array<{ name: string; qty: number; price: number }>;

              return (
                <Card key={order.id} className="hover:border-primary/40 transition-colors">
                  <CardHeader className="pb-2 flex flex-row items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-sm font-semibold">
                        #{order.orderNumber.slice(-8).toUpperCase()}
                      </CardTitle>
                      <p className="text-xs font-medium mt-0.5 truncate">
                        {order.contact.name ?? "Unknown"}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {formatPhoneNumber(order.contact.phoneNumber)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <StatusMenu
                        order={order}
                        onUpdate={(id, status) => updateMutation.mutate({ id, status })}
                      />
                      <button
                        onClick={() => {
                          if (confirm("Delete this order?")) deleteMutation.mutate(order.id);
                        }}
                        disabled={deleteMutation.isPending}
                        className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                        title="Delete order"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="space-y-1">
                      {items.slice(0, 3).map((item, i) => (
                        <div key={i} className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-1.5 truncate">
                            <Package className="h-3 w-3 text-muted-foreground shrink-0" />
                            <span className="truncate">{item.name} × {item.qty}</span>
                          </span>
                          <span className="text-muted-foreground shrink-0 ml-2">
                            {order.currency} {(item.price * item.qty).toFixed(2)}
                          </span>
                        </div>
                      ))}
                      {items.length > 3 && (
                        <p className="text-[10px] text-muted-foreground">
                          +{items.length - 3} more items
                        </p>
                      )}
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t">
                      <span className="text-xs text-muted-foreground">
                        {formatRelativeTime(order.createdAt)}
                      </span>
                      <span className="font-semibold text-sm">
                        {order.currency} {Number(order.totalAmount).toFixed(2)}
                      </span>
                    </div>
                    {order.platform && (
                      <div className="flex items-center justify-between text-xs">
                        <span className={`font-medium ${order.platform === "SHOPIFY" ? "text-[#96bf48]" : "text-[#7f54b3]"}`}>
                          {order.platform === "SHOPIFY" ? "Shopify" : "WooCommerce"} #{order.externalOrderId}
                        </span>
                        {order.externalOrderUrl && (
                          <a href={order.externalOrderUrl} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground flex items-center gap-1">
                            View <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
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
