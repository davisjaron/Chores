"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { ChildAvatar } from "@/components/child-avatar";
import { CHILD_COLORS, formatDisplayDate } from "@/lib/utils";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, CalendarOff, Users } from "lucide-react";

type Child = {
  id: string;
  name: string;
  color: string | null;
  emoji: string | null;
  age: number | null;
  active: boolean;
  hasPin?: boolean;
  unavailableDates: { id: string; date: string; reason: string | null }[];
};

const AVATAR_EMOJI_OPTIONS = [
  "🦊", "🐻", "🐱", "🐶", "🦄", "🐸", "🦁", "🐹", "🦋", "🐰",
  "🐨", "🦎", "🐵", "🦉", "🐙", "🐼", "🦆", "🐯", "🐍", "🐢",
  "🦈", "🦅", "🐺", "🦀", "🐝", "🦓", "🐧", "🦩", "🐲", "🌟",
  "🚀", "⚡", "🎯", "🎨", "🎸", "🏆",
  "⚽", "🏀", "🏈", "⚾", "🎾", "🏐", "🏒", "🥊", "🏄", "🚴",
  "🤸", "🏊", "⛷️", "🎳", "🥋", "🏹",
];

const emptyForm = { name: "", color: CHILD_COLORS[0], emoji: "", age: "", active: true, pin: "", clearPin: false };

export default function ChildrenPage() {
  const [children, setChildren] = useState<Child[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState<Child | null>(null);
  const [open, setOpen] = useState(false);
  const [unavailDate, setUnavailDate] = useState("");
  const [unavailReason, setUnavailReason] = useState("");

  async function load() {
    const res = await fetch("/api/children");
    setChildren(await res.json());
  }

  useEffect(() => { load(); }, []);

  async function save() {
    const payload = {
      name: form.name,
      color: form.color,
      emoji: form.emoji || null,
      age: form.age,
      active: form.active,
      pin: form.pin || undefined,
      clearPin: form.clearPin,
    };

    if (editing) {
      await fetch(`/api/children/${editing.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      toast.success("Child updated");
    } else {
      await fetch("/api/children", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      toast.success("Child added");
    }

    setOpen(false);
    setEditing(null);
    setForm(emptyForm);
    load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this child?")) return;
    await fetch(`/api/children/${id}`, { method: "DELETE" });
    toast.success("Child deleted");
    load();
  }

  async function addUnavailable(childId: string) {
    if (!unavailDate) return;
    await fetch(`/api/children/${childId}/unavailable`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: unavailDate, reason: unavailReason }),
    });
    setUnavailDate("");
    setUnavailReason("");
    toast.success("Unavailable day added");
    load();
  }

  async function removeUnavailable(childId: string, unavailableId: string) {
    await fetch(`/api/children/${childId}/unavailable?unavailableId=${unavailableId}`, {
      method: "DELETE",
    });
    load();
  }

  function openEdit(child: Child) {
    setEditing(child);
    setForm({
      name: child.name,
      color: child.color || CHILD_COLORS[0],
      emoji: child.emoji || "",
      age: child.age?.toString() || "",
      active: child.active,
      pin: "",
      clearPin: false,
    });
    setOpen(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-accent flex items-center justify-center">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold">Children</h1>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditing(null); setForm(emptyForm); }}>
              <Plus className="h-4 w-4 mr-1.5" /> Add Child
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Edit Child" : "Add Child"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input placeholder="Emma" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Color</Label>
                <div className="flex flex-wrap gap-2.5 mt-1">
                  {CHILD_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={`h-9 w-9 rounded-xl transition-all ${form.color === c ? "ring-2 ring-offset-2 ring-ring scale-110" : "hover:scale-105"}`}
                      style={{ backgroundColor: c }}
                      onClick={() => setForm({ ...form, color: c })}
                    />
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Icon</Label>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {AVATAR_EMOJI_OPTIONS.map((e) => (
                    <button
                      key={e}
                      type="button"
                      className={`text-xl p-1 rounded-lg transition-all ${form.emoji === e ? "ring-2 ring-primary bg-accent scale-110" : "hover:bg-slate-100 hover:scale-105"}`}
                      onClick={() => setForm({ ...form, emoji: e })}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Age</Label>
                <Input type="number" placeholder="8" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>{editing?.hasPin ? "New PIN (leave blank to keep)" : "PIN for kid login"}</Label>
                <Input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="1234"
                  value={form.pin}
                  onChange={(e) => setForm({ ...form, pin: e.target.value })}
                />
              </div>
              {editing?.hasPin && (
                <div className="flex items-center gap-2.5">
                  <Switch checked={form.clearPin} onCheckedChange={(v) => setForm({ ...form, clearPin: v })} />
                  <Label>Remove PIN</Label>
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

      {children.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="text-center py-12">
            <p className="text-4xl mb-3">👨‍👩‍👧‍👦</p>
            <p className="text-muted-foreground">No children added yet. Add your first child to get started!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {children.map((child) => (
            <Card key={child.id} className="overflow-hidden">
              <div className="h-1.5" style={{ backgroundColor: child.color || "#7c3aed" }} />
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="flex items-center gap-3">
                  <ChildAvatar name={child.name} color={child.color} emoji={child.emoji} size="lg" />
                  <div>
                    <CardTitle>{child.name}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {child.age ? `Age ${child.age}` : "No age set"}
                      {child.hasPin && " · 🔑 PIN set"}
                    </p>
                  </div>
                </div>
                <div className="flex gap-0.5">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(child)} className="rounded-xl">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => remove(child.id)} className="rounded-xl text-red-400 hover:text-red-600 hover:bg-red-50">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <Badge variant={child.active ? "success" : "secondary"}>
                  {child.active ? "Active" : "Inactive"}
                </Badge>
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <CalendarOff className="h-3.5 w-3.5 text-muted-foreground" />
                    <Label className="text-xs text-muted-foreground">Unavailable days</Label>
                  </div>
                  {child.unavailableDates.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {child.unavailableDates.map((u) => (
                        <Badge key={u.id} variant="outline" className="gap-1 text-[11px]">
                          {formatDisplayDate(u.date)}
                          {u.reason && ` · ${u.reason}`}
                          <button onClick={() => removeUnavailable(child.id, u.id)} className="ml-0.5 text-red-400 hover:text-red-600">×</button>
                        </Badge>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Input type="date" value={unavailDate} onChange={(e) => setUnavailDate(e.target.value)} className="text-xs" />
                    <Input placeholder="Reason (optional)" value={unavailReason} onChange={(e) => setUnavailReason(e.target.value)} className="text-xs" />
                    <Button size="sm" variant="outline" onClick={() => addUnavailable(child.id)}>Add</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
