"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { Loader2, RefreshCw, CheckCircle2, XCircle, Wifi } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { WhatsAppStatus } from "@/types";

interface QrModalProps {
  sessionId: string;
  sessionName: string;
}

interface QrData {
  qrCode: string | null;
  status: WhatsAppStatus;
}

const STATUS_CONFIG: Record<
  WhatsAppStatus,
  { label: string; variant: "success" | "warning" | "info" | "destructive" | "outline" }
> = {
  DISCONNECTED: { label: "Disconnected", variant: "outline" },
  QR_PENDING: { label: "Scan QR Code", variant: "warning" },
  CONNECTING: { label: "Connecting…", variant: "info" },
  CONNECTED: { label: "Connected", variant: "success" },
  BANNED: { label: "Banned", variant: "destructive" },
  LOGGED_OUT: { label: "Logged Out", variant: "destructive" },
};

export function QrPanel({ sessionId, sessionName }: QrModalProps) {
  const [data, setData] = useState<QrData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchQr = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/qr`);
      const text = await res.text();
      let json: Record<string, unknown> = {};
      try { json = JSON.parse(text); } catch { /* ignore */ }
      if (!res.ok) {
        throw new Error((json.error as string) ?? `HTTP ${res.status}: ${text.slice(0, 120)}`);
      }
      setData((json as { data: QrData }).data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    fetchQr();

    // Poll every 5 s until connected
    const interval = setInterval(() => {
      if (data?.status !== "CONNECTED") fetchQr();
      else clearInterval(interval);
    }, 5_000);

    return () => clearInterval(interval);
  }, [fetchQr, data?.status]);

  const statusCfg = data
    ? STATUS_CONFIG[data.status]
    : { label: "Loading…", variant: "outline" as const };

  return (
    <div className="flex flex-col items-center gap-4 p-6 min-w-[280px]">
      <div className="flex items-center gap-2">
        <Wifi className="h-5 w-5 text-whatsapp-green" />
        <h2 className="font-semibold text-lg">{sessionName}</h2>
      </div>

      <Badge variant={statusCfg.variant as never}>{statusCfg.label}</Badge>

      {/* QR area */}
      <div className="flex h-64 w-64 items-center justify-center rounded-xl border-2 border-dashed bg-muted">
        {loading && !data?.qrCode ? (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="text-sm">Generating QR…</span>
          </div>
        ) : data?.status === "CONNECTED" ? (
          <div className="flex flex-col items-center gap-2 text-green-600">
            <CheckCircle2 className="h-12 w-12" />
            <span className="font-medium">WhatsApp Connected!</span>
          </div>
        ) : data?.status === "BANNED" || data?.status === "LOGGED_OUT" ? (
          <div className="flex flex-col items-center gap-2 text-destructive">
            <XCircle className="h-12 w-12" />
            <span className="font-medium text-sm">Session ended</span>
          </div>
        ) : data?.qrCode ? (
          <Image
            src={data.qrCode}
            alt="WhatsApp QR Code"
            width={240}
            height={240}
            className="rounded-lg"
          />
        ) : (
          <div className="text-sm text-muted-foreground">No QR code yet</div>
        )}
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      <p className="text-xs text-muted-foreground text-center max-w-[220px]">
        Open WhatsApp on your phone → Linked Devices → Link a Device → scan this code
      </p>

      <Button
        variant="outline"
        size="sm"
        onClick={fetchQr}
        disabled={loading}
        className="gap-2"
      >
        <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        Refresh
      </Button>
    </div>
  );
}
