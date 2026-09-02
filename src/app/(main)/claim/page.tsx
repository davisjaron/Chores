"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ChildAvatar } from "@/components/child-avatar";
import { fireConfetti } from "@/components/confetti";
import { formatMoney, formatPoints, todayInTimezone } from "@/lib/utils";
import { isChoreAtLimit } from "@/lib/rate-limiter";
import { toast } from "sonner";
import { Trophy, Wallet, Zap, ArrowRight, Lock, Clock, CheckCircle2, Undo2, Minus, Trash2, AlertCircle } from "lucide-react";

type Child = { id: string; name: string; color: string | null; emoji: string | null; age: number | null; active: boolean };
type Chore = {
  id: string;
  name: string;
  description: string | null;
  emoji: string | null;
  photo: string | null;
  points: number;
  cashValue: number | null;
  active: boolean;
  allowConcurrent: boolean;
  minAge: number | null;
  maxAge: number | null;
  maxClaimsPerDay: number | null;
  maxClaimsPerWeek: number | null;
  maxConsecutivePerKid: number | null;
  maxTotalPerDay: number | null;
  maxTotalPerWeek: number | null;
};
type ChoreAssignmentItem = {
  id: string;
  childId: string;
  choreId: string;
  points: number | null;
  cashValue: number | null;
  status: string;
  date: string;
  chore: Chore;
  child: Child;
};
type Claim = {
  id: string;
  childId: string;
  choreId: string;
  status: string;
  claimedDate: string;
  completedDate?: string | null;
  points: number | null;
  cashAwarded: number | null;
  assignedByParent: boolean;
  choreAssignmentId: string | null;
  chore: Chore;
  child: Child;
};
type Balances = {
  pointsBalance: number;
  cashBalance: number;
  accountBalance: number;
  earnedPoints: number;
  spentPoints: number;
  earnedCash: number;
  paidCash: number;
  cashPerPoint: number | null;
};
type SettingsData = {
  requireAssignedFirst: boolean;
  timezone?: string;
};

export default function ClaimPage() {
  const { data: session } = useSession();
  const isParent = session?.user?.role === "parent";
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChildId, setSelectedChildId] = useState("");
  const [chores, setChores] = useState<Chore[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [allClaims, setAllClaims] = useState<Claim[]>([]);
  const [balances, setBalances] = useState<Balances | null>(null);
  const [choreAssignments, setChoreAssignments] = useState<ChoreAssignmentItem[]>([]);
  const [appSettings, setAppSettings] = useState<SettingsData | null>(null);
  const [cashoutOpen, setCashoutOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [cashoutPoints, setCashoutPoints] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [adjustPoints, setAdjustPoints] = useState("");
  const [adjustCash, setAdjustCash] = useState("");
  const [adjustNote, setAdjustNote] = useState("");

  const childId = isParent ? selectedChildId : session?.user?.childId || "";

  async function load() {
    const [childRes, choreRes, claimRes, settingsRes] = await Promise.all([
      fetch("/api/children"),
      fetch("/api/chores"),
      fetch("/api/claims"),
      fetch("/api/settings"),
    ]);
    const childData = await childRes.json();
    setChildren(childData.filter((c: Child) => c.active));
    setChores(await choreRes.json());
    const claimData = await claimRes.json();
    setAllClaims(claimData);
    setAppSettings(await settingsRes.json());

    if (!isParent && session?.user?.childId) {
      setSelectedChildId(session.user.childId);
    } else if (isParent && childData.length > 0 && !selectedChildId) {
      setSelectedChildId(childData[0].id);
    }
  }

  async function loadBalances(id: string) {
    if (!id) return;
    const res = await fetch("/api/settings?action=balances", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ childId: id }),
    });
    setBalances(await res.json());
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadAssignments(id: string) {
    if (!id) return;
    const res = await fetch(`/api/chore-assignments?childId=${id}&status=pending`);
    setChoreAssignments(await res.json());
  }

  useEffect(() => {
    if (childId) {
      setClaims(allClaims.filter((c) => c.childId === childId));
      loadBalances(childId);
      loadAssignments(childId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [childId, allClaims]);

  async function claimChore(choreId: string, choreAssignmentId?: string) {
    const body: Record<string, string> = { childId, choreId };
    if (choreAssignmentId) body.choreAssignmentId = choreAssignmentId;
    const res = await fetch("/api/claims", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const data = await res.json();
      toast.error(data.error || "Could not claim chore");
      return;
    }
    toast.success(choreAssignmentId ? "Assigned chore started! Get to work! 💪" : "Chore claimed! Get to work! 💪");
    load();
  }

  async function removeAssignment(id: string) {
    await fetch(`/api/chore-assignments/${id}`, { method: "DELETE" });
    toast.success("Assignment removed");
    load();
  }

  async function completeClaim(id: string) {
    const res = await fetch(`/api/claims/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "complete" }),
    });
    if (res.ok) {
      fireConfetti();
      if (isParent) {
        toast.success("Approved! Points awarded! 🎉");
      } else {
        toast.success("Great job! Waiting for parent approval 🎉");
      }
      load();
    }
  }

  async function approveClaim(id: string) {
    const res = await fetch(`/api/claims/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "approved" }),
    });
    if (res.ok) {
      toast.success("Approved! Points awarded! ✅");
      load();
    }
  }

  async function rejectClaim(id: string) {
    const res = await fetch(`/api/claims/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "rejected" }),
    });
    if (res.ok) {
      toast.success("Sent back — chore returned to kid");
      load();
    }
  }

  async function dropClaim(id: string) {
    await fetch(`/api/claims/${id}`, { method: "DELETE" });
    toast.success("Claim dropped");
    load();
  }

  async function cashOut() {
    const res = await fetch("/api/cash-transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ childId, kind: "cashout", points: Number(cashoutPoints) }),
    });
    if (!res.ok) {
      const data = await res.json();
      toast.error(data.error || "Cash out failed");
      return;
    }
    toast.success("Points cashed out! 💰");
    setCashoutOpen(false);
    setCashoutPoints("");
    load();
  }

  async function unapproveClaim(id: string) {
    const res = await fetch(`/api/claims/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "unapproved" }),
    });
    if (res.ok) {
      toast.success("Approval reversed — sent back for review");
      load();
    }
  }

  async function deleteClaim(id: string) {
    await fetch(`/api/claims/${id}`, { method: "DELETE" });
    toast.success("Claim removed");
    load();
  }

  async function submitAdjustment() {
    const res = await fetch("/api/cash-transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        childId,
        kind: "adjustment",
        points: adjustPoints ? Number(adjustPoints) : null,
        amount: adjustCash ? Number(adjustCash) : 0,
        note: adjustNote || "Manual adjustment",
      }),
    });
    if (!res.ok) {
      toast.error("Adjustment failed");
      return;
    }
    toast.success("Adjustment applied");
    setAdjustOpen(false);
    setAdjustPoints("");
    setAdjustCash("");
    setAdjustNote("");
    load();
  }

  async function recordPayment() {
    const res = await fetch("/api/cash-transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ childId, kind: "payment", amount: Number(paymentAmount) }),
    });
    if (!res.ok) {
      toast.error("Payment recording failed");
      return;
    }
    toast.success("Payment recorded");
    setPaymentOpen(false);
    setPaymentAmount("");
    load();
  }

  const today = appSettings?.timezone ? todayInTimezone(appSettings.timezone) : new Date().toISOString().slice(0, 10);
  const myClaims = claims.filter((c) => c.status === "claimed");
  const pendingApproval = claims.filter((c) => c.status === "pending_approval");
  const completedClaims = claims.filter((c) => c.status === "approved" || c.status === "complete");
  const selectedChild = children.find((c) => c.id === childId);
  const busyChoreIds = [
    ...myClaims,
    ...pendingApproval.filter((c) => c.claimedDate === today),
  ].map((c) => c.choreId);

  const myPendingAssignments = choreAssignments.filter((a) => a.childId === childId && a.status === "pending");
  const hasIncompleteAssignments = myPendingAssignments.length > 0 ||
    myClaims.some((c) => c.assignedByParent);
  const voluntaryBlocked = appSettings?.requireAssignedFirst && hasIncompleteAssignments;

  const availableChores = chores.filter((c) => {
    if (!c.active || busyChoreIds.includes(c.id)) return false;
    if (selectedChild?.age != null) {
      if (c.minAge != null && selectedChild.age < c.minAge) return false;
      if (c.maxAge != null && selectedChild.age > c.maxAge) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md">
          <Trophy className="h-5 w-5 text-white" />
        </div>
        <h1 className="text-2xl md:text-3xl font-bold">Claim & Earn</h1>
      </div>

      {isParent && (
        <div className="flex flex-wrap gap-4 justify-center md:justify-start">
          {children.map((child) => (
            <button
              type="button"
              key={child.id}
              onClick={() => setSelectedChildId(child.id)}
              className="flex flex-col items-center gap-1.5 group"
            >
              <ChildAvatar
                name={child.name}
                color={child.color}
                emoji={child.emoji}
                selected={childId === child.id}
                size="lg"
              />
              <span className={`text-xs font-medium transition-colors ${
                childId === child.id ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
              }`}>
                {child.name}
              </span>
            </button>
          ))}
        </div>
      )}

      {balances && selectedChild && (
        <div className="grid gap-4 grid-cols-2">
          <Card className="overflow-hidden border-0 theme-gradient-br text-white shadow-lg">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-8 w-8 rounded-lg bg-white/20 flex items-center justify-center">
                  <Zap className="h-4 w-4" />
                </div>
                <span className="text-sm font-medium text-white/70">Points</span>
              </div>
              <p className="text-3xl md:text-4xl font-bold">{balances.pointsBalance}</p>
              <p className="text-xs text-white/70 mt-1">
                +{balances.earnedPoints} earned · -{balances.spentPoints} spent
              </p>
              {balances.cashPerPoint && (
                <p className="text-xs text-white/70">
                  = {formatMoney(balances.pointsBalance * balances.cashPerPoint)}
                </p>
              )}
              {isParent && (
                <Button size="sm" className="bg-white/20 text-white hover:bg-white/30 border-0 text-xs h-7 mt-3" onClick={() => setAdjustOpen(true)}>
                  <Minus className="h-3 w-3 mr-1" /> Adjust
                </Button>
              )}
            </CardContent>
          </Card>
          <Card className="overflow-hidden border-0 bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-lg">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-8 w-8 rounded-lg bg-white/20 flex items-center justify-center">
                  <Wallet className="h-4 w-4" />
                </div>
                <span className="text-sm font-medium text-emerald-200">Chore Cash</span>
              </div>
              <p className="text-3xl md:text-4xl font-bold">{formatMoney(balances.cashBalance)}</p>
              <p className="text-xs text-emerald-200 mt-1">
                +{formatMoney(balances.earnedCash)} · -{formatMoney(balances.paidCash)}
              </p>
              {(balances.accountBalance ?? 0) !== 0 && (
                <Link href="/account" className="text-xs text-emerald-200 mt-1 block underline underline-offset-2 hover:text-white/90">
                  Total with parents: {formatMoney(balances.accountBalance)}
                </Link>
              )}
              <div className="flex gap-2 mt-3">
                {balances.cashPerPoint && (
                  <Button size="sm" className="bg-white/20 text-white hover:bg-white/30 border-0 text-xs h-7" onClick={() => setCashoutOpen(true)}>
                    Cash out
                  </Button>
                )}
                {isParent && (
                  <Button size="sm" className="bg-white/20 text-white hover:bg-white/30 border-0 text-xs h-7" onClick={() => setPaymentOpen(true)}>
                    Record pay
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-amber-100 flex items-center justify-center">
              <Zap className="h-4 w-4 text-amber-600" />
            </div>
            <CardTitle>My Chores</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {myClaims.length === 0 && pendingApproval.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-3xl mb-2">🎯</p>
              <p className="text-muted-foreground text-sm">No chores claimed yet — grab one below!</p>
            </div>
          ) : (
            <>
              {myClaims.map((claim) => (
                <div key={claim.id} className="flex items-center justify-between border rounded-xl p-3 hover:border-primary/30 transition-colors">
                  <div className="flex items-center gap-2 min-w-0">
                    {claim.chore.photo && (
                      <img src={claim.chore.photo} alt="" className="h-10 w-10 rounded-lg object-cover border shrink-0" />
                    )}
                    <div>
                      <p className="font-semibold text-sm">{claim.chore.emoji && <span className="mr-1">{claim.chore.emoji}</span>}{claim.chore.name}</p>
                      <div className="flex gap-1.5 mt-1">
                        <Badge variant="points">{formatPoints(claim.points ?? claim.chore.points)}</Badge>
                        {(claim.cashAwarded ?? claim.chore.cashValue) != null && (
                          <Badge variant="success">{formatMoney((claim.cashAwarded ?? claim.chore.cashValue)!)}</Badge>
                        )}
                        {claim.assignedByParent && (
                          <Badge variant="outline" className="text-[10px] text-blue-600 border-blue-300">Assigned</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0 ml-2">
                    <Button size="sm" variant="success" onClick={() => completeClaim(claim.id)}>
                      ✓ Done!
                    </Button>
                    <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-600" onClick={() => dropClaim(claim.id)}>
                      Drop
                    </Button>
                  </div>
                </div>
              ))}
              {pendingApproval.map((claim) => (
                <div key={claim.id} className="flex items-center justify-between border border-amber-200 bg-amber-50/50 rounded-xl p-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm">{claim.chore.emoji && <span className="mr-1">{claim.chore.emoji}</span>}{claim.chore.name}</p>
                    <div className="flex gap-1.5 mt-1">
                      <Badge variant="warning" className="gap-1">
                        <Clock className="h-3 w-3" /> Waiting for approval
                      </Badge>
                    </div>
                  </div>
                  {isParent && (
                    <div className="flex gap-2 shrink-0 ml-2">
                      <Button size="sm" variant="success" onClick={() => approveClaim(claim.id)}>
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Approve
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => rejectClaim(claim.id)}>
                        Return
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </>
          )}
        </CardContent>
      </Card>

      {myPendingAssignments.length > 0 && (
        <Card className="border-blue-200">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center">
                <AlertCircle className="h-4 w-4 text-blue-600" />
              </div>
              <CardTitle>Assigned Chores</CardTitle>
              {voluntaryBlocked && (
                <Badge variant="warning" className="ml-auto text-[10px]">Must complete first</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {myPendingAssignments.map((assignment) => (
              <div key={assignment.id} className="flex items-center justify-between border border-blue-200 bg-blue-50/50 rounded-xl p-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {assignment.chore.photo && (
                      <img src={assignment.chore.photo} alt="" className="h-10 w-10 rounded-lg object-cover border shrink-0" />
                    )}
                    <div>
                      <p className="font-semibold text-sm">
                        {assignment.chore.emoji && <span className="mr-1">{assignment.chore.emoji}</span>}
                        {assignment.chore.name}
                      </p>
                      <div className="flex gap-1.5 mt-1">
                        <Badge variant="points">{formatPoints(assignment.points ?? assignment.chore.points)}</Badge>
                        {(assignment.cashValue ?? assignment.chore.cashValue) != null && (
                          <Badge variant="success">{formatMoney((assignment.cashValue ?? assignment.chore.cashValue)!)}</Badge>
                        )}
                        <Badge variant="outline" className="text-[10px] text-blue-600 border-blue-300">Assigned</Badge>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0 ml-2">
                  <Button size="sm" onClick={() => claimChore(assignment.choreId, assignment.id)}>
                    Start
                  </Button>
                  {isParent && (
                    <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-600" onClick={() => removeAssignment(assignment.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-accent flex items-center justify-center">
              <ArrowRight className="h-4 w-4 text-primary" />
            </div>
            <CardTitle>Available Chores</CardTitle>
            {voluntaryBlocked && (
              <Badge variant="warning" className="ml-auto gap-1 text-[10px]">
                <Lock className="h-3 w-3" /> Locked
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {voluntaryBlocked && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <p className="text-sm text-amber-800 font-medium flex items-center gap-1.5">
                <Lock className="h-4 w-4" /> Complete your assigned chores before picking up new ones.
              </p>
            </div>
          )}
          <div className={`grid gap-3 sm:grid-cols-2 ${voluntaryBlocked ? "opacity-50 pointer-events-none" : ""}`}>
            {availableChores.map((chore) => {
              const atLimit = childId
                ? isChoreAtLimit(chore, childId, today, allClaims)
                : false;
              return (
                <div
                  key={chore.id}
                  className={`border rounded-xl p-4 transition-all ${
                    atLimit ? "opacity-50 bg-slate-50" : "hover:border-primary/30 hover:shadow-sm"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 min-w-0">
                      {chore.photo && (
                        <img src={chore.photo} alt="" className="h-10 w-10 rounded-lg object-cover border shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="font-semibold text-sm">{chore.emoji && <span className="mr-1">{chore.emoji}</span>}{chore.name}</p>
                        {chore.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{chore.description}</p>
                        )}
                      </div>
                    </div>
                    {atLimit && <Lock className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />}
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <Badge variant="points">{formatPoints(chore.points)}</Badge>
                    {chore.cashValue != null && (
                      <Badge variant="success">{formatMoney(chore.cashValue)}</Badge>
                    )}
                    {chore.maxClaimsPerDay != null && (
                      <Badge variant="outline" className="text-[10px]">{chore.maxClaimsPerDay}/day</Badge>
                    )}
                  </div>
                  <Button
                    size="sm"
                    className="w-full mt-3"
                    disabled={atLimit || !childId || !!voluntaryBlocked}
                    onClick={() => claimChore(chore.id)}
                  >
                    {atLimit ? "At limit" : "Claim this chore"}
                  </Button>
                </div>
              );
            })}
            {availableChores.length === 0 && (
              <div className="col-span-full text-center py-6">
                <p className="text-3xl mb-2">🏆</p>
                <p className="text-muted-foreground text-sm">All chores claimed! Nice work.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {completedClaims.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-muted-foreground">Recently Completed</CardTitle>
          </CardHeader>
          <CardContent>
            {isParent ? (
              <div className="space-y-2">
                {completedClaims.slice(0, 10).map((c) => (
                  <div key={c.id} className="flex items-center justify-between border border-emerald-200 bg-emerald-50/30 rounded-xl p-2.5">
                    <div className="min-w-0">
                      <p className="font-medium text-sm">{c.chore.emoji && <span className="mr-1">{c.chore.emoji}</span>}{c.chore.name}</p>
                      <p className="text-xs text-muted-foreground">+{c.points} pts{c.cashAwarded ? ` · ${formatMoney(c.cashAwarded)}` : ""}</p>
                    </div>
                    <div className="flex gap-1.5 shrink-0 ml-2">
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => unapproveClaim(c.id)}>
                        <Undo2 className="h-3 w-3" /> Undo
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs text-red-400 hover:text-red-600 hover:bg-red-50" onClick={() => deleteClaim(c.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {completedClaims.slice(0, 10).map((c) => (
                  <Badge key={c.id} variant="success" className="gap-1">
                    ✓ {c.chore.emoji}{c.chore.name} (+{c.points} pts)
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={cashoutOpen} onOpenChange={setCashoutOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Cash Out Points</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Points to convert</Label>
              <Input type="number" placeholder="100" value={cashoutPoints} onChange={(e) => setCashoutPoints(e.target.value)} />
            </div>
            {balances?.cashPerPoint && cashoutPoints && (
              <p className="text-sm text-muted-foreground text-center">
                = <span className="font-semibold text-foreground">{formatMoney(Number(cashoutPoints) * balances.cashPerPoint)}</span>
              </p>
            )}
            <Button onClick={cashOut} className="w-full">Cash out</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record Payment</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Amount paid to child</Label>
              <Input type="number" step="0.01" placeholder="5.00" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} />
            </div>
            <Button onClick={recordPayment} className="w-full">Record</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Manual Adjustment</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Use negative numbers to deduct. Leave blank to skip.</p>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Points adjustment</Label>
              <Input type="number" placeholder="e.g. -10 to remove 10 points" value={adjustPoints} onChange={(e) => setAdjustPoints(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Cash adjustment</Label>
              <Input type="number" step="0.01" placeholder="e.g. -1.00 to remove $1" value={adjustCash} onChange={(e) => setAdjustCash(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Note (optional)</Label>
              <Input placeholder="Reason for adjustment" value={adjustNote} onChange={(e) => setAdjustNote(e.target.value)} />
            </div>
            <Button onClick={submitAdjustment} className="w-full" disabled={!adjustPoints && !adjustCash}>
              Apply adjustment
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
