"use client";

import { useQuery } from "@tanstack/react-query";
import { MessageSquare, Users, Smartphone, ShoppingCart, Bot, Activity, Zap, Send, TrendingUp } from "lucide-react";
import Link from "next/link";
import { Header } from "@/components/dashboard/header";
import { StatsCard } from "@/components/dashboard/stats-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatRelativeTime, truncate } from "@/lib/utils";
import type { DashboardStats } from "@/types";

interface RecentMessage { id: string; body: string; direction: string; timestamp: string; isAiReply: boolean; contact: { name: string | null; phoneNumber: string } }
interface RecentOrder { id: string; orderNumber: string; status: string; totalAmount: string; currency: string; createdAt: string; contact: { name: string | null; phoneNumber: string } }

async function fetchStats(): Promise<DashboardStats> {
  const r = await fetch("/api/dashboard/stats");
  if (!r.ok) throw new Error("Failed");
  return (await r.json()).data;
}
async function fetchRecentMessages(): Promise<RecentMessage[]> {
  const r = await fetch("/api/messages?limit=6&sessionId=all&contactId=all");
  // fallback gracefully
  if (!r.ok) return [];
  const j = await r.json();
  return j.data ?? [];
}
async function fetchRecentOrders(): Promise<RecentOrder[]> {
  const r = await fetch("/api/orders?limit=5");
  if (!r.ok) return [];
  return (await r.json()).data ?? [];
}

const ORDER_COLORS: Record<string, string> = {
  PENDING: "warning", CONFIRMED: "info", PROCESSING: "info",
  SHIPPED: "secondary", DELIVERED: "success", CANCELLED: "destructive", REFUNDED: "outline",
};

export default function DashboardPage() {
  const { data: stats, isLoading } = useQuery({ queryKey: ["dashboard-stats"], queryFn: fetchStats, refetchInterval: 60_000 });
  const { data: recentOrders = [] } = useQuery({ queryKey: ["recent-orders"], queryFn: fetchRecentOrders, refetchInterval: 30_000 });

  const v = (n?: number) => isLoading ? "—" : (n ?? 0).toLocaleString();

  return (
    <div className="flex flex-col overflow-hidden flex-1">
      <Header title="Dashboard" description="Your WhatsApp automation overview" />
      <main className="flex-1 overflow-y-auto p-6 space-y-6">

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard title="Messages (30d)" value={v(stats?.totalMessages)} change={stats?.messagesChange} icon={MessageSquare} iconColor="text-blue-500" />
          <StatsCard title="New Contacts (30d)" value={v(stats?.totalContacts)} change={stats?.contactsChange} icon={Users} iconColor="text-violet-500" />
          <StatsCard title="Active Sessions" value={v(stats?.activeSessions)} icon={Smartphone} iconColor="text-whatsapp-green" description="Connected devices" />
          <StatsCard title="Orders (30d)" value={v(stats?.totalOrders)} change={stats?.ordersChange} icon={ShoppingCart} iconColor="text-orange-500" />
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {/* AI Activity */}
          <Card>
            <CardHeader className="flex flex-row items-center gap-2 pb-3">
              <Bot className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">AI Auto-Replies</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{v(stats?.aiReplies)}</div>
              <p className="text-sm text-muted-foreground mt-1">AI replies in last 30 days</p>
              <div className="mt-4 h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-whatsapp-green transition-all duration-700"
                  style={{ width: stats?.totalMessages ? `${Math.min(100, Math.round(((stats.aiReplies ?? 0) / stats.totalMessages) * 100))}%` : "0%" }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats?.totalMessages ? `${Math.round(((stats.aiReplies ?? 0) / stats.totalMessages) * 100)}% automation rate` : "No messages yet"}
              </p>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader className="flex flex-row items-center gap-2 pb-3">
              <Zap className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { label: "New Connection",   href: "/connections", icon: Smartphone, color: "text-green-500"  },
                { label: "Start Chat",        href: "/chat",        icon: MessageSquare, color: "text-blue-500" },
                { label: "New Campaign",      href: "/campaigns",   icon: Send,    color: "text-pink-500"  },
                { label: "View Orders",       href: "/orders",      icon: ShoppingCart, color: "text-orange-500" },
              ].map((a) => (
                <Link key={a.href} href={a.href} className="flex items-center gap-3 rounded-lg border px-3 py-2.5 hover:bg-accent transition-colors group">
                  <a.icon className={`h-4 w-4 shrink-0 ${a.color}`} />
                  <span className="text-sm font-medium">{a.label}</span>
                  <TrendingUp className="h-3.5 w-3.5 ml-auto text-muted-foreground group-hover:text-foreground transition-colors" />
                </Link>
              ))}
            </CardContent>
          </Card>

          {/* System Status */}
          <Card>
            <CardHeader className="flex flex-row items-center gap-2 pb-3">
              <Activity className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">System Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: "WhatsApp Sessions",    badge: `${stats?.activeSessions ?? 0} connected`, variant: (stats?.activeSessions ?? 0) > 0 ? "success" : "outline" },
                { label: "AI Engine",            badge: "Operational",  variant: "success" },
                { label: "Database",             badge: "Connected",    variant: "success" },
                { label: "Campaign Engine",      badge: "Ready",        variant: "success" },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between rounded-lg border p-2.5">
                  <span className="text-sm">{item.label}</span>
                  <Badge variant={item.variant as never} className="text-[10px]">{item.badge}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Recent Orders */}
        {recentOrders.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="flex items-center gap-2 text-base"><ShoppingCart className="h-4 w-4" />Recent Orders</CardTitle>
              <Button variant="ghost" size="sm" asChild><Link href="/orders">View all</Link></Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {recentOrders.map((o) => (
                  <div key={o.id} className="flex items-center justify-between rounded-lg border px-3 py-2">
                    <div>
                      <p className="text-sm font-medium">#{o.orderNumber.slice(-8).toUpperCase()}</p>
                      <p className="text-xs text-muted-foreground">{o.contact.name ?? o.contact.phoneNumber} · {formatRelativeTime(o.createdAt)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={ORDER_COLORS[o.status] as never} className="text-[10px]">{o.status}</Badge>
                      <span className="text-sm font-semibold">{o.currency} {Number(o.totalAmount).toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
