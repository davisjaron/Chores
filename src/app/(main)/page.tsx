"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChildAvatar } from "@/components/child-avatar";
import { formatDisplayDate, formatMoney, formatPoints, getContrastText } from "@/lib/utils";
import { Calendar, CheckCircle2, Clock, ArrowRight, Sparkles, ClipboardCheck, Gift } from "lucide-react";
import { toast } from "sonner";

type DashboardData = {
  settings: { mode: string; cashPerPoint: number | null };
  todayAssignments: Array<{
    id: string;
    status: string;
    child: { name: string; color: string | null };
    chore: { name: string; emoji: string | null };
  }>;
  upcomingAssignments: Array<{
    id: string;
    date: string;
    status: string;
    child: { name: string; color: string | null };
    chore: { name: string; emoji: string | null };
  }>;
  recentAssignments: Array<{
    id: string;
    date: string;
    child: { name: string };
    chore: { name: string; emoji: string | null };
  }>;
  recentClaims: Array<{
    id: string;
    child: { name: string };
    chore: { name: string; emoji: string | null };
    points: number | null;
  }>;
  pendingApprovals: Array<{
    id: string;
    completedDate: string | null;
    child: { name: string; color: string | null };
    chore: { name: string; emoji: string | null; points: number };
  }>;
  pendingRedemptions: Array<{
    id: string;
    date: string;
    pointsSpent: number;
    child: { name: string; color: string | null };
    reward: { name: string; emoji: string | null; pointCost: number };
  }>;
  children: Array<{ id: string; name: string; color: string | null; emoji: string | null }>;
  childBalances: Record<string, { pointsBalance: number; cashBalance: number; accountBalance: number }>;
};

export default function DashboardPage() {
  const { data: session } = useSession();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  async function updateAssignmentStatus(id: string, status: string) {
    await fetch(`/api/assignments/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const refreshed = await fetch("/api/dashboard").then((r) => r.json());
    setData(refreshed);
  }

  async function approveClaim(id: string) {
    const res = await fetch(`/api/claims/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "approved" }),
    });
    if (res.ok) {
      toast.success("Approved! Points awarded ✅");
      const refreshed = await fetch("/api/dashboard").then((r) => r.json());
      setData(refreshed);
    }
  }

  async function rejectClaim(id: string) {
    const res = await fetch(`/api/claims/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "rejected" }),
    });
    if (res.ok) {
      toast.success("Sent back to kid");
      const refreshed = await fetch("/api/dashboard").then((r) => r.json());
      setData(refreshed);
    }
  }

  async function approveRedemption(id: string) {
    const res = await fetch(`/api/redemptions/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "approved" }),
    });
    if (res.ok) {
      toast.success("Reward approved! 🎁");
      const refreshed = await fetch("/api/dashboard").then((r) => r.json());
      setData(refreshed);
    }
  }

  async function rejectRedemption(id: string) {
    const res = await fetch(`/api/redemptions/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "rejected" }),
    });
    if (res.ok) {
      toast.success("Reward denied — points refunded");
      const refreshed = await fetch("/api/dashboard").then((r) => r.json());
      setData(refreshed);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-48 bg-slate-200 rounded-lg" />
        <div className="h-4 w-64 bg-slate-100 rounded" />
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-40 bg-white rounded-2xl border" />
          ))}
        </div>
      </div>
    );
  }
  if (!data) return <p className="text-destructive">Failed to load dashboard.</p>;

  const isClaimMode = data.settings.mode === "claim";
  const isKid = session?.user?.role === "kid";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">
            {isKid ? (
              <>Hey {session.user.name}! <span className="animate-bounce-subtle inline-block">👋</span></>
            ) : (
              "Dashboard"
            )}
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {isKid
              ? "Let's see what's on your list today"
              : "Overview of your family's chores"}
          </p>
        </div>
        <Badge
          variant={isClaimMode ? "warning" : "secondary"}
          className="text-xs px-3 py-1"
        >
          {isClaimMode ? "🏆 Claim & Earn" : "📅 Assigned Schedule"}
        </Badge>
      </div>

      {!isClaimMode && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-accent flex items-center justify-center">
                <Calendar className="h-4 w-4 text-primary" />
              </div>
              <CardTitle>Today&apos;s Chores</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.todayAssignments.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-3xl mb-2">🎉</p>
                <p className="text-muted-foreground text-sm">No chores today — enjoy your day!</p>
              </div>
            ) : (
              data.todayAssignments.map((a) => (
                <div
                  key={a.id}
                  className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3 transition-all ${
                    a.status === "complete" ? "bg-emerald-50/50 border-emerald-200" : "hover:border-primary/30"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold"
                      style={{
                        backgroundColor: a.child.color || "#7c3aed",
                        color: getContrastText(a.child.color || "#7c3aed"),
                      }}
                    >
                      {a.child.name}
                    </span>
                    <span className="font-medium text-sm">{a.chore.emoji && <span className="mr-1">{a.chore.emoji}</span>}{a.chore.name}</span>
                    {a.status === "complete" && (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    )}
                  </div>
                  {a.status === "pending" && (
                    <div className="flex gap-2">
                      <Button size="sm" variant="success" onClick={() => updateAssignmentStatus(a.id, "complete")}>
                        ✓ Done
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateAssignmentStatus(a.id, "skipped")}
                      >
                        Skip
                      </Button>
                    </div>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}

      {isClaimMode && !isKid && (
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
          {data.children.map((child) => {
            const bal = data.childBalances[child.id];
            return (
              <Card key={child.id} className="overflow-hidden">
                <div className="h-2" style={{ backgroundColor: child.color || "#7c3aed" }} />
                <CardHeader className="pb-2 pt-4 flex flex-row items-center gap-3">
                  <ChildAvatar name={child.name} color={child.color} emoji={child.emoji} size="sm" />
                  <CardTitle className="text-base">{child.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{formatPoints(bal?.pointsBalance || 0)}</p>
                  <p className="text-xs text-muted-foreground">
                    Chore cash: {formatMoney(bal?.cashBalance || 0)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Total held: {formatMoney(bal?.accountBalance || 0)}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {isClaimMode && isKid && (
        <Card className="overflow-hidden border-0 theme-gradient-br text-white shadow-lg">
          <CardContent className="pt-6 pb-5">
            {(() => {
              const bal = data.childBalances[session?.user?.childId || ""];
              return (
                <div className="flex flex-col sm:flex-row gap-6 items-start">
                  <div className="flex-1">
                    <p className="text-white/70 text-sm font-medium">Your Points</p>
                    <p className="text-4xl font-bold mt-1">{bal?.pointsBalance || 0} <span className="text-lg font-normal text-white/70">pts</span></p>
                    {data.settings.cashPerPoint && (
                      <p className="text-white/70 text-sm mt-1">
                        Worth {formatMoney((bal?.pointsBalance || 0) * data.settings.cashPerPoint)}
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="text-white/70 text-sm font-medium">Chore Cash</p>
                    <p className="text-4xl font-bold mt-1">{formatMoney(bal?.cashBalance || 0)}</p>
                    {(bal?.accountBalance ?? 0) !== 0 && (
                      <Link href="/account" className="text-white/70 text-xs mt-1 block underline underline-offset-2 hover:text-white/90">
                        Total with parents: {formatMoney(bal?.accountBalance || 0)}
                      </Link>
                    )}
                  </div>
                </div>
              );
            })()}
            <Button asChild variant="secondary" className="mt-4 bg-white/20 text-white hover:bg-white/30 border-0">
              <Link href="/claim" className="gap-2">
                Go earn more <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {isClaimMode && !isKid && data.pendingApprovals && data.pendingApprovals.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/30">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-amber-100 flex items-center justify-center">
                <ClipboardCheck className="h-4 w-4 text-amber-600" />
              </div>
              <CardTitle className="flex items-center gap-2">
                Approval Queue
                <Badge variant="warning" className="text-xs">{data.pendingApprovals.length}</Badge>
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.pendingApprovals.map((claim) => (
              <div key={claim.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200 bg-white p-3">
                <div className="flex items-center gap-2.5">
                  <span
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold"
                    style={{
                      backgroundColor: claim.child.color || "#7c3aed",
                      color: getContrastText(claim.child.color || "#7c3aed"),
                    }}
                  >
                    {claim.child.name}
                  </span>
                  <div>
                    <p className="font-medium text-sm">{claim.chore.emoji && <span className="mr-1">{claim.chore.emoji}</span>}{claim.chore.name}</p>
                    <p className="text-xs text-muted-foreground">{claim.chore.points} pts</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="success" onClick={() => approveClaim(claim.id)}>
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Approve
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => rejectClaim(claim.id)}>
                    Return
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {isClaimMode && !isKid && data.pendingRedemptions && data.pendingRedemptions.length > 0 && (
        <Card className="border-purple-200 bg-purple-50/30">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-purple-100 flex items-center justify-center">
                <Gift className="h-4 w-4 text-purple-600" />
              </div>
              <CardTitle className="flex items-center gap-2">
                Reward Requests
                <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-700">{data.pendingRedemptions.length}</Badge>
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.pendingRedemptions.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-purple-200 bg-white p-3">
                <div className="flex items-center gap-2.5">
                  <span
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold"
                    style={{
                      backgroundColor: r.child.color || "#7c3aed",
                      color: getContrastText(r.child.color || "#7c3aed"),
                    }}
                  >
                    {r.child.name}
                  </span>
                  <div>
                    <p className="font-medium text-sm">{r.reward.emoji && <span className="mr-1">{r.reward.emoji}</span>}{r.reward.name}</p>
                    <p className="text-xs text-muted-foreground">{r.pointsSpent} pts</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="success" onClick={() => approveRedemption(r.id)}>
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Approve
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => rejectRedemption(r.id)}>
                    Deny
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {!isClaimMode && data.upcomingAssignments.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-amber-100 flex items-center justify-center">
                <Clock className="h-4 w-4 text-amber-600" />
              </div>
              <CardTitle>Coming Up</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {data.upcomingAssignments.slice(0, 8).map((a) => (
              <div key={a.id} className="flex items-center gap-2.5 text-sm py-1.5">
                <span className="text-muted-foreground text-xs w-24 shrink-0">{formatDisplayDate(a.date)}</span>
                <span
                  className="px-2 py-0.5 rounded-md text-[11px] font-medium"
                  style={{
                    backgroundColor: a.child.color || "#7c3aed",
                    color: getContrastText(a.child.color || "#7c3aed"),
                  }}
                >
                  {a.child.name}
                </span>
                <span className="text-sm truncate">{a.chore.emoji && <span className="mr-1">{a.chore.emoji}</span>}{a.chore.name}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-emerald-100 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-emerald-600" />
            </div>
            <CardTitle>Recently Completed</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {isClaimMode
              ? data.recentClaims.map((c) => (
                  <Badge key={c.id} variant="success" className="gap-1">
                    ✓ {c.child.name}: {c.chore.emoji}{c.chore.name} (+{c.points} pts)
                  </Badge>
                ))
              : data.recentAssignments.map((a) => (
                  <Badge key={a.id} variant="success" className="gap-1">
                    ✓ {a.child.name}: {a.chore.emoji}{a.chore.name}
                  </Badge>
                ))}
            {(isClaimMode ? data.recentClaims : data.recentAssignments).length === 0 && (
              <div className="text-center py-4 w-full">
                <p className="text-2xl mb-1">🏁</p>
                <p className="text-muted-foreground text-sm">Nothing completed yet — get started!</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
