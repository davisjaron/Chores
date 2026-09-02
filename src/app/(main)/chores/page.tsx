"use client";

import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ChildAvatar } from "@/components/child-avatar";
import { ageRangeLabel, formatMoney, formatPoints } from "@/lib/utils";
import { CHORE_EMOJI_CATEGORIES } from "@/lib/constants";
import { useAppMode } from "@/components/theme-provider";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, ListChecks, Image, X, UserPlus } from "lucide-react";

type Child = { id: string; name: string; color: string | null; emoji: string | null; age: number | null; active: boolean };
type Chore = {
  id: string;
  name: string;
  description: string | null;
  emoji: string | null;
  photo: string | null;
  active: boolean;
  allowConcurrent: boolean;
  minAge: number | null;
  maxAge: number | null;
  points: number;
  cashValue: number | null;
  maxClaimsPerDay: number | null;
  maxClaimsPerWeek: number | null;
  maxConsecutivePerKid: number | null;
  maxTotalPerDay: number | null;
  maxTotalPerWeek: number | null;
};

const emptyForm = {
  name: "",
  description: "",
  emoji: "",
  photo: "",
  active: true,
  allowConcurrent: false,
  minAge: "",
  maxAge: "",
  points: "1",
  cashValue: "",
  maxClaimsPerDay: "",
  maxClaimsPerWeek: "",
  maxConsecutivePerKid: "",
  maxTotalPerDay: "",
  maxTotalPerWeek: "",
};

export default function ChoresPage() {
  const appMode = useAppMode();
  const [chores, setChores] = useState<Chore[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState<Chore | null>(null);
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignChore, setAssignChore] = useState<Chore | null>(null);
  const [assignChildId, setAssignChildId] = useState("");
  const [assignPoints, setAssignPoints] = useState("");
  const [assignCash, setAssignCash] = useState("");
  const [emojiExpanded, setEmojiExpanded] = useState<string | null>(null);

  async function load() {
    const [choreRes, childRes] = await Promise.all([
      fetch("/api/chores"),
      fetch("/api/children"),
    ]);
    setChores(await choreRes.json());
    const childData = await childRes.json();
    setChildren(childData.filter((c: Child) => c.active));
  }

  useEffect(() => { load(); }, []);

  async function uploadPhoto(file: File) {
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    setUploading(false);
    if (!res.ok) {
      toast.error("Photo upload failed");
      return;
    }
    const data = await res.json();
    setForm({ ...form, photo: data.path });
    toast.success("Photo uploaded");
  }

  function totalLimitError(): string | null {
    const perDay = form.maxClaimsPerDay !== "" ? Number(form.maxClaimsPerDay) : null;
    const perWeek = form.maxClaimsPerWeek !== "" ? Number(form.maxClaimsPerWeek) : null;
    const totalDay = form.maxTotalPerDay !== "" ? Number(form.maxTotalPerDay) : null;
    const totalWeek = form.maxTotalPerWeek !== "" ? Number(form.maxTotalPerWeek) : null;
    if (totalDay != null && perDay != null && totalDay < perDay) {
      return "Total/day must be ≥ per-kid max/day";
    }
    if (totalWeek != null && perWeek != null && totalWeek < perWeek) {
      return "Total/week must be ≥ per-kid max/week";
    }
    return null;
  }

  async function save() {
    const limitErr = totalLimitError();
    if (limitErr) { toast.error(limitErr); return; }
    const payload = { ...form };
    const url = editing ? `/api/chores/${editing.id}` : "/api/chores";
    await fetch(url, {
      method: editing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    toast.success(editing ? "Chore updated" : "Chore added");
    setOpen(false);
    setEditing(null);
    setForm(emptyForm);
    load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this chore?")) return;
    await fetch(`/api/chores/${id}`, { method: "DELETE" });
    toast.success("Chore deleted");
    load();
  }

  function openEdit(chore: Chore) {
    setEditing(chore);
    setForm({
      name: chore.name,
      description: chore.description || "",
      emoji: chore.emoji || "",
      photo: chore.photo || "",
      active: chore.active,
      allowConcurrent: chore.allowConcurrent,
      minAge: chore.minAge?.toString() || "",
      maxAge: chore.maxAge?.toString() || "",
      points: chore.points.toString(),
      cashValue: chore.cashValue?.toString() || "",
      maxClaimsPerDay: chore.maxClaimsPerDay?.toString() || "",
      maxClaimsPerWeek: chore.maxClaimsPerWeek?.toString() || "",
      maxConsecutivePerKid: chore.maxConsecutivePerKid?.toString() || "",
      maxTotalPerDay: chore.maxTotalPerDay?.toString() || "",
      maxTotalPerWeek: chore.maxTotalPerWeek?.toString() || "",
    });
    setOpen(true);
  }

  function openAssign(chore: Chore) {
    setAssignChore(chore);
    setAssignChildId(children[0]?.id || "");
    setAssignPoints("");
    setAssignCash("");
    setAssignOpen(true);
  }

  async function submitAssignment() {
    if (!assignChore || !assignChildId) return;
    const res = await fetch("/api/chore-assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        childId: assignChildId,
        choreId: assignChore.id,
        points: assignPoints || null,
        cashValue: assignCash || null,
      }),
    });
    if (!res.ok) {
      toast.error("Failed to assign chore");
      return;
    }
    const child = children.find((c) => c.id === assignChildId);
    toast.success(`Assigned "${assignChore.name}" to ${child?.name}`);
    setAssignOpen(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-accent flex items-center justify-center">
            <ListChecks className="h-5 w-5 text-primary" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold">Chores</h1>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditing(null); setForm(emptyForm); }}>
              <Plus className="h-4 w-4 mr-1.5" /> Add Chore
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editing ? "Edit Chore" : "Add Chore"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input placeholder="Wash dishes" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Textarea placeholder="What does this chore involve?" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Photo</Label>
                <div className="flex items-center gap-3">
                  {form.photo ? (
                    <div className="relative">
                      <img src={form.photo} alt="Chore" className="h-20 w-20 rounded-xl object-cover border" />
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, photo: "" })}
                        className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={uploading}
                      onClick={() => fileRef.current?.click()}
                    >
                      <Image className="h-4 w-4 mr-1.5" />
                      {uploading ? "Uploading..." : "Add photo"}
                    </Button>
                  )}
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) uploadPhoto(file);
                      e.target.value = "";
                    }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">Photos are compressed automatically to save storage.</p>
              </div>
              <div className="space-y-1.5">
                <Label>Icon</Label>
                <div className="space-y-2 mt-1">
                  {CHORE_EMOJI_CATEGORIES.map((cat) => (
                    <div key={cat.label}>
                      <button
                        type="button"
                        className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 hover:text-foreground transition-colors"
                        onClick={() => setEmojiExpanded(emojiExpanded === cat.label ? null : cat.label)}
                      >
                        {cat.emojis[0]} {cat.label} {emojiExpanded === cat.label ? "▾" : "▸"}
                      </button>
                      {emojiExpanded === cat.label && (
                        <div className="flex flex-wrap gap-1.5">
                          {cat.emojis.map((e, i) => (
                            <button
                              key={`${e}-${i}`}
                              type="button"
                              className={`text-xl p-1 rounded-lg transition-all ${form.emoji === e ? "ring-2 ring-primary bg-accent scale-110" : "hover:bg-slate-100 hover:scale-105"}`}
                              onClick={() => setForm({ ...form, emoji: form.emoji === e ? "" : e })}
                            >
                              {e}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                {form.emoji && (
                  <p className="text-sm mt-1">
                    Selected: <span className="text-2xl">{form.emoji}</span>
                    <button type="button" className="ml-2 text-xs text-red-500 hover:underline" onClick={() => setForm({ ...form, emoji: "" })}>
                      clear
                    </button>
                  </p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Min age</Label>
                  <Input type="number" placeholder="—" value={form.minAge} onChange={(e) => setForm({ ...form, minAge: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Max age</Label>
                  <Input type="number" placeholder="—" value={form.maxAge} onChange={(e) => setForm({ ...form, maxAge: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Points</Label>
                  <Input type="number" value={form.points} onChange={(e) => setForm({ ...form, points: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Cash value</Label>
                  <Input type="number" step="0.01" placeholder="$0.00" value={form.cashValue} onChange={(e) => setForm({ ...form, cashValue: e.target.value })} />
                </div>
              </div>
              {appMode === "claim" && (
                <div className="bg-accent rounded-xl p-4 space-y-3">
                  <p className="text-xs font-semibold text-accent-foreground uppercase tracking-wider">Rate Limits (per kid)</p>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Max/day</Label>
                      <Input type="number" placeholder="—" value={form.maxClaimsPerDay} onChange={(e) => setForm({ ...form, maxClaimsPerDay: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Max/week</Label>
                      <Input type="number" placeholder="—" value={form.maxClaimsPerWeek} onChange={(e) => setForm({ ...form, maxClaimsPerWeek: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Max consec.</Label>
                      <Input type="number" placeholder="—" value={form.maxConsecutivePerKid} onChange={(e) => setForm({ ...form, maxConsecutivePerKid: e.target.value })} />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">Each kid gets their own limit. Setting 1/day means each kid can do it once per day.</p>
                </div>
              )}
              {appMode === "claim" && (
                <div className="bg-accent rounded-xl p-4 space-y-3">
                  <p className="text-xs font-semibold text-accent-foreground uppercase tracking-wider">Total Limits (all kids combined)</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Total/day</Label>
                      <Input type="number" placeholder="—" value={form.maxTotalPerDay} onChange={(e) => setForm({ ...form, maxTotalPerDay: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Total/week</Label>
                      <Input type="number" placeholder="—" value={form.maxTotalPerWeek} onChange={(e) => setForm({ ...form, maxTotalPerWeek: e.target.value })} />
                    </div>
                  </div>
                  {totalLimitError() && (
                    <p className="text-xs text-destructive font-medium">{totalLimitError()}</p>
                  )}
                  <p className="text-xs text-muted-foreground">First come, first served. Setting 1/day means only one kid can claim it per day total.</p>
                </div>
              )}
              {appMode === "assigned" && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <Switch checked={form.allowConcurrent} onCheckedChange={(v) => setForm({ ...form, allowConcurrent: v })} />
                    <Label>Allow multiple kids on same day</Label>
                  </div>
                  <p className="text-xs text-muted-foreground ml-11">
                    When off, the schedule won&apos;t give this chore to more than one kid on the same day.
                  </p>
                </div>
              )}
              <div className="flex items-center gap-2.5">
                <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
                <Label>Active</Label>
              </div>
              <Button onClick={save} disabled={!form.name} className="w-full">Save</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {chores.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="text-center py-12">
            <p className="text-4xl mb-3">🧹</p>
            <p className="text-muted-foreground">No chores yet. Add your first chore to get started!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {chores.map((chore) => (
            <Card key={chore.id} className={!chore.active ? "opacity-60" : ""}>
              <CardHeader className="flex flex-row items-start justify-between py-4">
                <div className="flex gap-3 flex-1 min-w-0">
                  {chore.photo && (
                    <img src={chore.photo} alt={chore.name} className="h-14 w-14 rounded-xl object-cover border shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base">
                      {chore.emoji && <span className="mr-1.5">{chore.emoji}</span>}
                      {chore.name}
                    </CardTitle>
                    {chore.description && (
                      <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{chore.description}</p>
                    )}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      <Badge variant="points">{formatPoints(chore.points)}</Badge>
                      {chore.cashValue != null && (
                        <Badge variant="success">{formatMoney(chore.cashValue)}</Badge>
                      )}
                      <Badge variant="outline">{ageRangeLabel(chore.minAge, chore.maxAge)}</Badge>
                      {appMode === "claim" && chore.maxClaimsPerDay != null && (
                        <Badge variant="outline">{chore.maxClaimsPerDay}/day per kid</Badge>
                      )}
                      {appMode === "claim" && chore.maxClaimsPerWeek != null && (
                        <Badge variant="outline">{chore.maxClaimsPerWeek}/week per kid</Badge>
                      )}
                      {appMode === "claim" && chore.maxConsecutivePerKid != null && (
                        <Badge variant="outline">Max {chore.maxConsecutivePerKid}x consec.</Badge>
                      )}
                      {appMode === "claim" && chore.maxTotalPerDay != null && (
                        <Badge variant="secondary">{chore.maxTotalPerDay}/day total</Badge>
                      )}
                      {appMode === "claim" && chore.maxTotalPerWeek != null && (
                        <Badge variant="secondary">{chore.maxTotalPerWeek}/week total</Badge>
                      )}
                      {!chore.active && <Badge variant="secondary">Inactive</Badge>}
                    </div>
                  </div>
                </div>
                <div className="flex gap-0.5 shrink-0 ml-2">
                  {appMode === "claim" && children.length > 0 && (
                    <Button variant="ghost" size="icon" onClick={() => openAssign(chore)} className="rounded-xl text-blue-500 hover:text-blue-700 hover:bg-blue-50" title="Assign to kid">
                      <UserPlus className="h-4 w-4" />
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" onClick={() => openEdit(chore)} className="rounded-xl">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => remove(chore.id)} className="rounded-xl text-red-400 hover:text-red-600 hover:bg-red-50">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Chore</DialogTitle>
          </DialogHeader>
          {assignChore && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-3 bg-accent rounded-xl">
                {assignChore.emoji && <span className="text-xl">{assignChore.emoji}</span>}
                <span className="font-semibold">{assignChore.name}</span>
              </div>
              <div className="space-y-1.5">
                <Label>Assign to</Label>
                <div className="flex flex-wrap gap-3">
                  {children.map((child) => (
                    <button
                      type="button"
                      key={child.id}
                      onClick={() => setAssignChildId(child.id)}
                      className="flex flex-col items-center gap-1.5 group"
                    >
                      <ChildAvatar
                        name={child.name}
                        color={child.color}
                        emoji={child.emoji}
                        selected={assignChildId === child.id}
                        size="lg"
                      />
                      <span className={`text-xs font-medium transition-colors ${
                        assignChildId === child.id ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                      }`}>
                        {child.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Points override</Label>
                  <Input
                    type="number"
                    placeholder={`Default: ${assignChore.points}`}
                    value={assignPoints}
                    onChange={(e) => setAssignPoints(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Cash override</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder={assignChore.cashValue != null ? `Default: $${assignChore.cashValue}` : "Leave blank"}
                    value={assignCash}
                    onChange={(e) => setAssignCash(e.target.value)}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Leave blank to use the chore&apos;s default point and cash values.
              </p>
              <Button onClick={submitAssignment} disabled={!assignChildId} className="w-full">
                Assign chore
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
