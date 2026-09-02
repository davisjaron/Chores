"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
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
import { formatMoney, formatPoints } from "@/lib/utils";
import { toast } from "sonner";
import { Wallet, Plus, Minus, Trash2, ArrowDownLeft, ArrowUpRight, Zap, Pencil } from "lucide-react";

type Child = { id: string; name: string; color: string | null; emoji: string | null; active: boolean };
type LedgerEntry = {
  id: string;
  childId: string;
  date: string;
  kind: string;
  amount: number;
  note: string | null;
};
type PointsEvent = {
  id: string;
  date: string;
  kind: string;
  source: string;
  points: number;
  note: string;
};
type Balances = {
  cashBalance: number;
  accountBalance: number;
  pointsBalance: number;
};

export default function AccountPage() {
  const { data: session } = useSession();
  const isParent = session?.user?.role === "parent";
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChildId, setSelectedChildId] = useState("");
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [pointsEvents, setPointsEvents] = useState<PointsEvent[]>([]);
  const [balances, setBalances] = useState<Balances | null>(null);
  const [activeTab, setActiveTab] = useState<"cash" | "points">("cash");
  const [depositOpen, setDepositOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(() => {
    try {
      return new Intl.DateTimeFormat("en-CA", { timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
    } catch { return new Date().toISOString().slice(0, 10); }
  });

  const [editCashOpen, setEditCashOpen] = useState(false);
  const [editCashEntry, setEditCashEntry] = useState<LedgerEntry | null>(null);
  const [editCashDate, setEditCashDate] = useState("");
  const [editCashAmount, setEditCashAmount] = useState("");
  const [editCashNote, setEditCashNote] = useState("");

  const [editPointsOpen, setEditPointsOpen] = useState(false);
  const [editPointsEvent, setEditPointsEvent] = useState<PointsEvent | null>(null);
  const [editPointsDate, setEditPointsDate] = useState("");
  const [editPointsValue, setEditPointsValue] = useState("");
  const [editPointsNote, setEditPointsNote] = useState("");

  const childId = isParent ? selectedChildId : session?.user?.childId || "";

  async function load() {
    if (isParent) {
      const res = await fetch("/api/children");
      const data = await res.json();
      setChildren(data.filter((c: Child) => c.active));
      if (data.length > 0 && !selectedChildId) {
        setSelectedChildId(data[0].id);
      }
    }
  }

  async function loadEntries(id: string) {
    if (!id) return;
    const [entryRes, balRes, ptsRes] = await Promise.all([
      fetch(`/api/ledger?childId=${id}`),
      fetch("/api/settings?action=balances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ childId: id }),
      }),
      fetch(`/api/points-history?childId=${id}`),
    ]);
    setEntries(await entryRes.json());
    const bal = await balRes.json();
    setBalances({ cashBalance: bal.cashBalance, accountBalance: bal.accountBalance, pointsBalance: bal.pointsBalance });
    setPointsEvents(await ptsRes.json());
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (childId) loadEntries(childId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [childId]);

  async function submitDeposit() {
    const res = await fetch("/api/ledger", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        childId,
        kind: "deposit",
        amount: Math.abs(Number(amount)),
        note: note || "Deposit",
        date,
      }),
    });
    if (!res.ok) {
      toast.error("Failed to record deposit");
      return;
    }
    toast.success("Deposit recorded");
    setDepositOpen(false);
    resetForm();
    loadEntries(childId);
  }

  async function submitWithdrawal() {
    const res = await fetch("/api/ledger", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        childId,
        kind: "withdrawal",
        amount: -Math.abs(Number(amount)),
        note: note || "Withdrawal",
        date,
      }),
    });
    if (!res.ok) {
      toast.error("Failed to record withdrawal");
      return;
    }
    toast.success("Withdrawal recorded");
    setWithdrawOpen(false);
    resetForm();
    loadEntries(childId);
  }

  async function deleteEntry(id: string) {
    await fetch(`/api/ledger/${id}`, { method: "DELETE" });
    toast.success("Entry removed");
    loadEntries(childId);
  }

  function resetForm() {
    setAmount("");
    setNote("");
    try {
      setDate(new Intl.DateTimeFormat("en-CA", { timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()));
    } catch { setDate(new Date().toISOString().slice(0, 10)); }
  }

  function openEditCash(entry: LedgerEntry) {
    setEditCashEntry(entry);
    setEditCashDate(entry.date);
    setEditCashAmount(Math.abs(entry.amount).toString());
    setEditCashNote(entry.note || "");
    setEditCashOpen(true);
  }

  async function saveEditCash() {
    if (!editCashEntry) return;
    const sign = editCashEntry.amount >= 0 ? 1 : -1;
    const res = await fetch(`/api/ledger/${editCashEntry.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: editCashDate,
        amount: sign * Math.abs(Number(editCashAmount)),
        note: editCashNote,
      }),
    });
    if (!res.ok) { toast.error("Failed to update"); return; }
    toast.success("Transaction updated");
    setEditCashOpen(false);
    loadEntries(childId);
  }

  function openEditPoints(event: PointsEvent) {
    setEditPointsEvent(event);
    setEditPointsDate(event.date);
    setEditPointsValue(Math.abs(event.points).toString());
    setEditPointsNote(event.note);
    setEditPointsOpen(true);
  }

  async function saveEditPoints() {
    if (!editPointsEvent) return;
    const res = await fetch(`/api/points-history/${editPointsEvent.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source: editPointsEvent.source,
        date: editPointsDate,
        points: Number(editPointsValue),
        ...(editPointsEvent.source === "cashTransaction" && { note: editPointsNote }),
      }),
    });
    if (!res.ok) { toast.error("Failed to update"); return; }
    toast.success("Transaction updated");
    setEditPointsOpen(false);
    loadEntries(childId);
  }

  async function deletePointsEvent(event: PointsEvent) {
    if (!confirm("Delete this transaction?")) return;
    const res = await fetch(`/api/points-history/${event.id}?source=${event.source}`, { method: "DELETE" });
    if (!res.ok) { toast.error("Failed to delete"); return; }
    toast.success("Transaction deleted");
    loadEntries(childId);
  }

  function formatDate(d: string) {
    const [y, m, day] = d.split("-");
    return `${Number(m)}/${Number(day)}/${y}`;
  }

  const selectedChild = children.find((c) => c.id === childId);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-md">
          <Wallet className="h-5 w-5 text-white" />
        </div>
        <h1 className="text-2xl md:text-3xl font-bold">Account</h1>
      </div>

      {isParent && children.length > 0 && (
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

      {balances && (
        <div className="grid gap-4 grid-cols-3">
          <Card className="overflow-hidden border-0 bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-lg">
            <CardContent className="pt-5 pb-4">
              <p className="text-sm text-white/70 font-medium">Cash Balance</p>
              <p className="text-3xl md:text-4xl font-bold mt-1">{formatMoney(balances.accountBalance)}</p>
              <p className="text-xs text-white/70 mt-1">Held by parents</p>
            </CardContent>
          </Card>
          <Card className="overflow-hidden border-0 theme-gradient-br text-white shadow-lg">
            <CardContent className="pt-5 pb-4">
              <p className="text-sm text-white/70 font-medium">From Chores</p>
              <p className="text-3xl md:text-4xl font-bold mt-1">{formatMoney(balances.cashBalance)}</p>
              <p className="text-xs text-white/70 mt-1">Included in total</p>
            </CardContent>
          </Card>
          <Card className="overflow-hidden border-0 bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-lg">
            <CardContent className="pt-5 pb-4">
              <p className="text-sm text-white/70 font-medium">Points</p>
              <p className="text-3xl md:text-4xl font-bold mt-1">{balances.pointsBalance}</p>
              <p className="text-xs text-white/70 mt-1">Available pts</p>
            </CardContent>
          </Card>
        </div>
      )}

      {isParent && (
        <div className="flex gap-3">
          <Button onClick={() => { resetForm(); setDepositOpen(true); }} className="gap-1.5">
            <Plus className="h-4 w-4" /> Deposit
          </Button>
          <Button variant="outline" onClick={() => { resetForm(); setWithdrawOpen(true); }} className="gap-1.5">
            <Minus className="h-4 w-4" /> Withdrawal
          </Button>
        </div>
      )}

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Transaction History</CardTitle>
            <div className="flex rounded-lg border overflow-hidden">
              <button
                type="button"
                onClick={() => setActiveTab("cash")}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  activeTab === "cash" ? "bg-primary text-primary-foreground" : "bg-background hover:bg-accent"
                }`}
              >
                <Wallet className="h-3 w-3 inline mr-1" />Cash
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("points")}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  activeTab === "points" ? "bg-primary text-primary-foreground" : "bg-background hover:bg-accent"
                }`}
              >
                <Zap className="h-3 w-3 inline mr-1" />Points
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {activeTab === "cash" ? (
            entries.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-3xl mb-2">📒</p>
                <p className="text-muted-foreground text-sm">No cash transactions yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {entries.map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between border rounded-xl p-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                        entry.amount >= 0 ? "bg-emerald-100" : "bg-red-100"
                      }`}>
                        {entry.amount >= 0 ? (
                          <ArrowDownLeft className="h-4 w-4 text-emerald-600" />
                        ) : (
                          <ArrowUpRight className="h-4 w-4 text-red-600" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{entry.note || entry.kind}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-muted-foreground">{formatDate(entry.date)}</span>
                          <Badge variant={entry.kind === "chore_earning" ? "success" : entry.kind === "deposit" ? "secondary" : "warning"} className="text-[10px] px-1.5 py-0">
                            {entry.kind === "chore_earning" ? "Chore" : entry.kind === "deposit" ? "Deposit" : "Spent"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      <span className={`font-semibold text-sm ${entry.amount >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                        {entry.amount >= 0 ? "+" : ""}{formatMoney(entry.amount)}
                      </span>
                      {isParent && (
                        <>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground" onClick={() => openEditCash(entry)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-400 hover:text-red-600 hover:bg-red-50" onClick={() => deleteEntry(entry.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            pointsEvents.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-3xl mb-2">💎</p>
                <p className="text-muted-foreground text-sm">No points activity yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {pointsEvents.map((event) => (
                  <div key={event.id} className="flex items-center justify-between border rounded-xl p-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                        event.points >= 0 ? "bg-amber-100" : "bg-red-100"
                      }`}>
                        {event.points >= 0 ? (
                          <ArrowDownLeft className="h-4 w-4 text-amber-600" />
                        ) : (
                          <ArrowUpRight className="h-4 w-4 text-red-600" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{event.note}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-muted-foreground">{formatDate(event.date)}</span>
                          <Badge
                            variant={event.kind === "chore_earned" ? "success" : event.kind === "reward_redeemed" ? "warning" : "secondary"}
                            className="text-[10px] px-1.5 py-0"
                          >
                            {event.kind === "chore_earned" ? "Earned" : event.kind === "reward_redeemed" ? "Reward" : event.kind === "cashout" ? "Cashout" : "Adjust"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      <span className={`font-semibold text-sm ${event.points >= 0 ? "text-amber-600" : "text-red-600"}`}>
                        {event.points >= 0 ? "+" : ""}{formatPoints(Math.abs(event.points))}
                      </span>
                      {isParent && (
                        <>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground" onClick={() => openEditPoints(event)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-400 hover:text-red-600 hover:bg-red-50" onClick={() => deletePointsEvent(event)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </CardContent>
      </Card>

      <Dialog open={depositOpen} onOpenChange={setDepositOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record Deposit</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Add money to {selectedChild?.name || "this child"}&apos;s account (e.g., allowance, birthday money, chore bonus).</p>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Amount</Label>
              <Input type="number" step="0.01" placeholder="10.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Note</Label>
              <Input placeholder="e.g. Weekly allowance" value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
            <Button onClick={submitDeposit} className="w-full" disabled={!amount || Number(amount) <= 0}>
              Record Deposit
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={withdrawOpen} onOpenChange={setWithdrawOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record Withdrawal</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Record money spent from {selectedChild?.name || "this child"}&apos;s account.</p>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Amount</Label>
              <Input type="number" step="0.01" placeholder="11.49" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>What was it for?</Label>
              <Input placeholder="e.g. Bought stuff at Wal-Mart" value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
            <Button onClick={submitWithdrawal} className="w-full" disabled={!amount || Number(amount) <= 0}>
              Record Withdrawal
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={editCashOpen} onOpenChange={setEditCashOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Cash Transaction</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input type="date" value={editCashDate} onChange={(e) => setEditCashDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Amount</Label>
              <Input type="number" step="0.01" value={editCashAmount} onChange={(e) => setEditCashAmount(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Note</Label>
              <Input value={editCashNote} onChange={(e) => setEditCashNote(e.target.value)} />
            </div>
            <Button onClick={saveEditCash} className="w-full" disabled={!editCashAmount || Number(editCashAmount) <= 0}>
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={editPointsOpen} onOpenChange={setEditPointsOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Points Transaction</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input type="date" value={editPointsDate} onChange={(e) => setEditPointsDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Points</Label>
              <Input type="number" value={editPointsValue} onChange={(e) => setEditPointsValue(e.target.value)} />
            </div>
            {editPointsEvent?.source === "cashTransaction" && (
              <div className="space-y-1.5">
                <Label>Note</Label>
                <Input value={editPointsNote} onChange={(e) => setEditPointsNote(e.target.value)} />
              </div>
            )}
            <Button onClick={saveEditPoints} className="w-full" disabled={!editPointsValue || Number(editPointsValue) <= 0}>
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
