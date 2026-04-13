"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Users, UserPlus, Trash2, Mail, Loader2, Crown, Shield, User } from "lucide-react";
import { Header } from "@/components/dashboard/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatRelativeTime } from "@/lib/utils";

type InviteStatus = "PENDING" | "ACCEPTED" | "REVOKED";
type UserRole = "ADMIN" | "AGENT";

interface TeamMember {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  status: InviteStatus;
  createdAt: string;
  joinedAt: string | null;
}

const ROLE_ICON = { OWNER: Crown, ADMIN: Shield, AGENT: User };
const STATUS_BADGE: Record<InviteStatus, { label: string; variant: string }> = {
  PENDING:  { label: "Invite Sent", variant: "warning"  },
  ACCEPTED: { label: "Active",      variant: "success"  },
  REVOKED:  { label: "Revoked",     variant: "outline"  },
};

export default function TeamPage() {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<UserRole>("AGENT");

  const { data: members = [], isLoading } = useQuery<TeamMember[]>({
    queryKey: ["team"],
    queryFn: async () => { const r = await fetch("/api/team"); return (await r.json()).data; },
  });

  const inviteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name, role }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team"] });
      setEmail(""); setName("");
    },
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => fetch(`/api/team?id=${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["team"] }),
  });

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <Header title="Team" description="Invite agents and admins to manage conversations" />

      <main className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Invite form */}
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><UserPlus className="h-4 w-4" />Invite Team Member</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Input className="flex-1 min-w-[200px]" placeholder="Email address" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              <Input className="flex-1 min-w-[160px]" placeholder="Name (optional)" value={name} onChange={(e) => setName(e.target.value)} />
              <select
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
              >
                <option value="AGENT">Agent</option>
                <option value="ADMIN">Admin</option>
              </select>
              <Button
                variant="whatsapp"
                className="gap-2"
                disabled={!email || inviteMutation.isPending}
                onClick={() => inviteMutation.mutate()}
              >
                {inviteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                Invite
              </Button>
            </div>
            {inviteMutation.isError && <p className="text-sm text-destructive mt-2">{(inviteMutation.error as Error).message}</p>}
            {inviteMutation.isSuccess && <p className="text-sm text-green-600 mt-2">Invite created! Share the invite link with your team member.</p>}
          </CardContent>
        </Card>

        {/* Members list */}
        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : members.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
            <Users className="h-12 w-12 text-muted-foreground/30" />
            <p className="font-medium">No team members yet</p>
            <p className="text-sm text-muted-foreground">Invite an agent or admin above</p>
          </div>
        ) : (
          <div className="space-y-3">
            {members.map((m) => {
              const RoleIcon = ROLE_ICON[m.role] ?? User;
              const badge = STATUS_BADGE[m.status];
              const initials = (m.name ?? m.email).slice(0, 2).toUpperCase();
              return (
                <div key={m.id} className="flex items-center gap-4 rounded-lg border bg-card p-4">
                  <Avatar>
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm truncate">{m.name ?? m.email}</p>
                      <Badge variant={badge.variant as never} className="text-[10px] px-1.5">{badge.label}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Mail className="h-3 w-3" />{m.email}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 text-xs text-muted-foreground border rounded-full px-2.5 py-1">
                      <RoleIcon className="h-3 w-3" />{m.role}
                    </span>
                    <span className="text-xs text-muted-foreground hidden sm:block">{formatRelativeTime(m.createdAt)}</span>
                    <button
                      onClick={() => removeMutation.mutate(m.id)}
                      className="rounded p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
