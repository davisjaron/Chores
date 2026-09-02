"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { EMOJI_OPTIONS } from "@/lib/constants";
import { formatPoints, getContrastText } from "@/lib/utils";
import { fireConfetti } from "@/components/confetti";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Gift, Lightbulb, Send, X, Clock, CheckCircle2 } from "lucide-react";

type Reward = {
  id: string;
  name: string;
  description: string | null;
  pointCost: number;
  emoji: string | null;
  active: boolean;
};

type Redemption = {
  id: string;
  childId: string;
  rewardId: string;
  date: string;
  pointsSpent: number;
  status: string;
  child: { name: string; color: string | null };
  reward: { name: string; emoji: string | null; pointCost: number };
};

type Suggestion = { name: string; count: number; children: string[]; ids: string[] };
type KidSuggestion = { id: string; name: string };

const emptyForm = { name: "", description: "", pointCost: "10", emoji: "🎁", active: true };

export default function RewardsPage() {
  const { data: session } = useSession();
  const isParent = session?.user?.role === "parent";
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState<Reward | null>(null);
  const [open, setOpen] = useState(false);
  const [childId, setChildId] = useState("");
  const [balances, setBalances] = useState<{ pointsBalance: number } | null>(null);
  const [pendingRedemptions, setPendingRedemptions] = useState<Redemption[]>([]);
  const [myPendingRedemptions, setMyPendingRedemptions] = useState<Redemption[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [kidSuggestions, setKidSuggestions] = useState<KidSuggestion[]>([]);
  const [suggestionInput, setSuggestionInput] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    const [rewardRes, pendingRes] = await Promise.all([
      fetch("/api/rewards"),
      fetch(`/api/redemptions?status=pending_approval`),
    ]);
    setRewards(await rewardRes.json());
    const allPending: Redemption[] = await pendingRes.json();
    if (isParent) {
      setPendingRedemptions(allPending);
    } else {
      setMyPendingRedemptions(allPending);
    }
  }

  async function loadSuggestions() {
    const res = await fetch("/api/reward-suggestions");
    if (res.ok) {
      const data = await res.json();
      if (isParent) {
        setSuggestions(data);
      } else {
        setKidSuggestions(data);
      }
    }
  }

  useEffect(() => {
    load();
    loadSuggestions();
    if (session?.user?.role === "kid" && session.user.childId) {
      setChildId(session.user.childId);
      fetch("/api/settings?action=balances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ childId: session.user.childId }),
      })
        .then((r) => r.json())
        .then(setBalances);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  async function save() {
    const url = editing ? `/api/rewards/${editing.id}` : "/api/rewards";
    await fetch(url, {
      method: editing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    toast.success(editing ? "Reward updated" : "Reward added");
    setOpen(false);
    setEditing(null);
    setForm(emptyForm);
    load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this reward?")) return;
    await fetch(`/api/rewards/${id}`, { method: "DELETE" });
    load();
  }

  async function redeem(rewardId: string) {
    const res = await fetch("/api/redemptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ childId, rewardId }),
    });
    if (!res.ok) {
      const data = await res.json();
      toast.error(data.error || "Not enough points");
      return;
    }
    if (isParent) {
      fireConfetti();
      const redemption = await res.json();
      await fetch(`/api/redemptions/${redemption.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "approved" }),
      });
      toast.success("Reward redeemed! 🎁");
    } else {
      toast.success("Reward requested! Waiting for parent approval");
    }
    load();
    if (childId) {
      fetch("/api/settings?action=balances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ childId }),
      })
        .then((r) => r.json())
        .then(setBalances);
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
      load();
    }
  }

  async function rejectRedemption(id: string) {
    const res = await fetch(`/api/redemptions/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "rejected" }),
    });
    if (res.ok) {
      toast.success("Reward request denied — points refunded");
      load();
    }
  }

  async function submitSuggestion() {
    if (!suggestionInput.trim()) return;
    setSubmitting(true);
    const res = await fetch("/api/reward-suggestions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: suggestionInput.trim() }),
    });
    setSubmitting(false);
    if (res.status === 409) {
      toast.error("You've already suggested this!");
      return;
    }
    if (!res.ok) {
      toast.error("Could not submit suggestion");
      return;
    }
    toast.success("Suggestion sent to your parents!");
    setSuggestionInput("");
    loadSuggestions();
  }

  async function dismissSuggestion(name: string) {
    await fetch(`/api/reward-suggestions?name=${encodeURIComponent(name)}`, {
      method: "DELETE",
    });
    loadSuggestions();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-accent flex items-center justify-center">
            <Gift className="h-5 w-5 text-primary" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold">Rewards</h1>
        </div>
        {isParent && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditing(null); setForm(emptyForm); }}>
                <Plus className="h-4 w-4 mr-1.5" /> Add Reward
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editing ? "Edit Reward" : "Add Reward"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Name</Label>
                  <Input placeholder="Movie night" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Description</Label>
                  <Textarea placeholder="What's the reward?" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Point cost</Label>
                  <Input type="number" value={form.pointCost} onChange={(e) => setForm({ ...form, pointCost: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Emoji</Label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {EMOJI_OPTIONS.map((e) => (
                      <button
                        key={e}
                        type="button"
                        className={`text-2xl p-1.5 rounded-xl transition-all ${form.emoji === e ? "ring-2 ring-primary bg-accent scale-110" : "hover:bg-slate-100 hover:scale-105"}`}
                        onClick={() => setForm({ ...form, emoji: e })}
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
                  <Label>Active</Label>
                </div>
                <Button onClick={save} disabled={!form.name} className="w-full">Save</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {isParent && suggestions.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/30">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-amber-100 flex items-center justify-center">
                <Lightbulb className="h-4 w-4 text-amber-600" />
              </div>
              <CardTitle className="flex items-center gap-2">
                Reward Suggestions
                <Badge variant="warning" className="text-xs">{suggestions.length}</Badge>
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {suggestions.map((s) => (
              <div key={s.name} className="flex items-center justify-between border border-amber-200 bg-white rounded-xl p-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm">{s.name}</p>
                    {s.count > 1 && (
                      <Badge variant="warning" className="text-xs">+{s.count - 1}</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    From: {s.children.join(", ")}
                  </p>
                </div>
                <div className="flex gap-1.5 shrink-0 ml-2">
                  <Button
                    size="sm"
                    variant="success"
                    onClick={() => {
                      setEditing(null);
                      setForm({ ...emptyForm, name: s.name });
                      setOpen(true);
                    }}
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-muted-foreground hover:text-red-600"
                    onClick={() => dismissSuggestion(s.name)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {isParent && pendingRedemptions.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/30">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-amber-100 flex items-center justify-center">
                <Clock className="h-4 w-4 text-amber-600" />
              </div>
              <CardTitle className="flex items-center gap-2">
                Reward Approval Queue
                <Badge variant="warning" className="text-xs">{pendingRedemptions.length}</Badge>
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingRedemptions.map((r) => (
              <div key={r.id} className="flex items-center justify-between border border-amber-200 bg-white rounded-xl p-3">
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
                    <p className="text-xs text-muted-foreground">{formatPoints(r.pointsSpent)}</p>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0 ml-2">
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

      {!isParent && balances && (
        <Card className="border-0 theme-gradient text-white">
          <CardContent className="py-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-white/70">Your balance</p>
              <p className="text-2xl font-bold">{formatPoints(balances.pointsBalance)}</p>
            </div>
            <span className="text-4xl">💎</span>
          </CardContent>
        </Card>
      )}

      {rewards.filter((r) => r.active || isParent).length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="text-center py-12">
            <p className="text-4xl mb-3">🎁</p>
            <p className="text-muted-foreground">No rewards yet. {isParent ? "Add your first reward!" : "Ask a parent to set up rewards!"}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
          {rewards.filter((r) => r.active || isParent).map((reward) => {
            const canAfford = !isParent && balances ? balances.pointsBalance >= reward.pointCost : true;
            return (
              <Card key={reward.id} className={`overflow-hidden transition-all ${
                !reward.active ? "opacity-50" : canAfford || isParent ? "hover:shadow-md" : "opacity-70"
              }`}>
                <CardContent className="pt-5 pb-4 text-center">
                  <span className="text-4xl block mb-2">{reward.emoji || "🎁"}</span>
                  <p className="font-semibold text-sm">{reward.name}</p>
                  {reward.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{reward.description}</p>
                  )}
                  <Badge variant="points" className="mt-2">{formatPoints(reward.pointCost)}</Badge>

                  {isParent ? (
                    <div className="flex gap-1 justify-center mt-3">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-xl"
                        onClick={() => {
                          setEditing(reward);
                          setForm({
                            name: reward.name,
                            description: reward.description || "",
                            pointCost: reward.pointCost.toString(),
                            emoji: reward.emoji || "🎁",
                            active: reward.active,
                          });
                          setOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="rounded-xl text-red-400 hover:text-red-600 hover:bg-red-50" onClick={() => remove(reward.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : reward.active && (
                    <Button
                      size="sm"
                      className="w-full mt-3"
                      disabled={!canAfford}
                      onClick={() => redeem(reward.id)}
                    >
                      {canAfford ? "Redeem" : "Need more pts"}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {!isParent && myPendingRedemptions.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/30">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-amber-100 flex items-center justify-center">
                <Clock className="h-4 w-4 text-amber-600" />
              </div>
              <CardTitle>Waiting for Approval</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {myPendingRedemptions.map((r) => (
              <div key={r.id} className="flex items-center justify-between border border-amber-200 bg-white rounded-xl p-3">
                <div>
                  <p className="font-semibold text-sm">{r.reward.emoji && <span className="mr-1">{r.reward.emoji}</span>}{r.reward.name}</p>
                  <div className="flex gap-1.5 mt-1">
                    <Badge variant="points">{formatPoints(r.pointsSpent)}</Badge>
                    <Badge variant="warning" className="gap-1">
                      <Clock className="h-3 w-3" /> Pending
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {!isParent && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-accent flex items-center justify-center">
                <Lightbulb className="h-4 w-4 text-primary" />
              </div>
              <CardTitle>Suggest a Reward</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              Want something that&apos;s not listed? Suggest it and your parents will see it!
            </p>
            <div className="flex gap-2">
              <Input
                placeholder="e.g. Pizza party, Extra screen time..."
                value={suggestionInput}
                onChange={(e) => setSuggestionInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") submitSuggestion(); }}
              />
              <Button onClick={submitSuggestion} disabled={!suggestionInput.trim() || submitting}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
            {kidSuggestions.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                <p className="text-xs text-muted-foreground w-full">Your suggestions:</p>
                {kidSuggestions.map((s) => (
                  <Badge key={s.id} variant="secondary">{s.name}</Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
