"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, isSameMonth, isToday } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { IcsExportPanel } from "@/components/ics-export-panel";
import { formatDisplayDate, getContrastText, todayString } from "@/lib/utils";
import { addMonthsToDate } from "@/lib/schedule-generator";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Calendar, CheckCircle2 } from "lucide-react";

type Assignment = {
  id: string;
  date: string;
  status: string;
  childId: string;
  choreId: string;
  child: { id: string; name: string; color: string | null };
  chore: { id: string; name: string; emoji: string | null };
};

type Child = { id: string; name: string };
type Chore = { id: string; name: string };

export default function SchedulePage() {
  const { data: session } = useSession();
  const isParent = session?.user?.role === "parent";
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [chores, setChores] = useState<Chore[]>([]);
  const [startDate, setStartDate] = useState(todayString());
  const [months, setMonths] = useState("3");
  const [allowSameDay, setAllowSameDay] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [editing, setEditing] = useState<Assignment | null>(null);
  const [editForm, setEditForm] = useState({ date: "", childId: "", choreId: "", status: "pending" });
  const [loading, setLoading] = useState(false);

  async function load() {
    const monthStart = format(startOfMonth(currentMonth), "yyyy-MM-dd");
    const monthEnd = format(endOfMonth(currentMonth), "yyyy-MM-dd");
    const [aRes, cRes, chRes] = await Promise.all([
      fetch(`/api/assignments?start=${monthStart}&end=${monthEnd}`),
      fetch("/api/children"),
      fetch("/api/chores"),
    ]);
    setAssignments(await aRes.json());
    setChildren(await cRes.json());
    setChores(await chRes.json());
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMonth]);

  async function generate() {
    if (!confirm("This will replace all existing assignments. Continue?")) return;
    setLoading(true);
    const endDate = addMonthsToDate(startDate, Number(months));
    const res = await fetch("/api/assignments/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ startDate, endDate, allowSameDay }),
    });
    setLoading(false);
    if (res.ok) {
      const data = await res.json();
      toast.success(`Generated ${data.count} assignments`);
      load();
    } else {
      toast.error("Failed to generate schedule");
    }
  }

  async function updateStatus(id: string, status: string) {
    await fetch(`/api/assignments/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    load();
  }

  async function saveEdit() {
    if (!editing) return;
    await fetch(`/api/assignments/${editing.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    setEditing(null);
    toast.success("Assignment updated");
    load();
  }

  async function deleteAssignment() {
    if (!editing || !confirm("Delete this assignment?")) return;
    await fetch(`/api/assignments/${editing.id}`, { method: "DELETE" });
    setEditing(null);
    load();
  }

  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  const assignmentsByDate = assignments.reduce<Record<string, Assignment[]>>((acc, a) => {
    if (!acc[a.date]) acc[a.date] = [];
    acc[a.date].push(a);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-accent flex items-center justify-center">
          <Calendar className="h-5 w-5 text-primary" />
        </div>
        <h1 className="text-2xl md:text-3xl font-bold">Schedule</h1>
      </div>

      {isParent && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Generate Schedule</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3 items-end">
              <div className="space-y-1.5">
                <Label className="text-xs">Start date</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-40" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Duration</Label>
                <Select value={months} onValueChange={setMonths}>
                  <SelectTrigger className="w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["1", "3", "6", "12", "24"].map((m) => (
                      <SelectItem key={m} value={m}>{m} mo</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={allowSameDay} onCheckedChange={setAllowSameDay} />
                <Label className="text-xs">Allow same-day</Label>
              </div>
              <Button onClick={generate} disabled={loading} size="sm">
                {loading ? "Generating..." : "Generate"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="calendar">
        <TabsList className="rounded-xl bg-accent p-1">
          <TabsTrigger value="calendar" className="rounded-lg">Calendar</TabsTrigger>
          <TabsTrigger value="list" className="rounded-lg">List</TabsTrigger>
          {isParent && <TabsTrigger value="export" className="rounded-lg">Export</TabsTrigger>}
        </TabsList>

        <TabsContent value="calendar" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <h2 className="text-lg font-semibold">{format(currentMonth, "MMMM yyyy")}</h2>
            <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>

          {/* Desktop calendar */}
          <div className="hidden md:grid grid-cols-7 gap-1">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} className="text-center text-xs font-semibold text-muted-foreground p-2">{d}</div>
            ))}
            {Array.from({ length: days[0].getDay() }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {days.map((day) => {
              const dateStr = format(day, "yyyy-MM-dd");
              const dayAssignments = assignmentsByDate[dateStr] || [];
              const today = isToday(day);
              return (
                <div
                  key={dateStr}
                  className={`min-h-[100px] border rounded-xl p-1.5 transition-colors ${
                    today ? "bg-accent border-primary/30" : "hover:bg-slate-50"
                  } ${!isSameMonth(day, currentMonth) ? "opacity-40" : ""}`}
                >
                  <div className={`text-xs font-medium mb-1 ${today ? "text-primary font-bold" : ""}`}>
                    {format(day, "d")}
                  </div>
                  <div className="space-y-0.5">
                    {dayAssignments.map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        className="w-full text-left text-[10px] px-1.5 py-0.5 rounded-md truncate font-medium transition-opacity hover:opacity-80"
                        style={{
                          backgroundColor: a.child.color || "#7c3aed",
                          color: getContrastText(a.child.color || "#7c3aed"),
                        }}
                        onClick={() => {
                          if (isParent) {
                            setEditing(a);
                            setEditForm({ date: a.date, childId: a.childId, choreId: a.choreId, status: a.status });
                          }
                        }}
                      >
                        {a.status === "complete" ? "✓ " : ""}{a.child.name}: {a.chore.emoji}{a.chore.name}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Mobile calendar — list by day */}
          <div className="md:hidden space-y-2">
            {days.map((day) => {
              const dateStr = format(day, "yyyy-MM-dd");
              const dayAssignments = assignmentsByDate[dateStr] || [];
              if (dayAssignments.length === 0) return null;
              const today = isToday(day);
              return (
                <Card key={dateStr} className={today ? "border-primary/30 bg-accent/50" : ""}>
                  <CardContent className="py-3 px-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-sm font-semibold ${today ? "text-primary" : ""}`}>
                        {format(day, "EEE, MMM d")}
                      </span>
                      {today && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Today</Badge>}
                    </div>
                    <div className="space-y-1.5">
                      {dayAssignments.map((a) => (
                        <div key={a.id} className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className="px-2 py-0.5 rounded-md text-[11px] font-medium shrink-0"
                              style={{
                                backgroundColor: a.child.color || "#7c3aed",
                                color: getContrastText(a.child.color || "#7c3aed"),
                              }}
                            >
                              {a.child.name}
                            </span>
                            <span className="text-sm truncate">{a.chore.emoji && <span className="mr-1">{a.chore.emoji}</span>}{a.chore.name}</span>
                            {a.status === "complete" && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />}
                          </div>
                          {a.status === "pending" && (
                            <Button size="sm" variant="success" className="h-7 text-xs shrink-0" onClick={() => updateStatus(a.id, "complete")}>
                              Done
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {Object.keys(assignmentsByDate).length === 0 && (
              <div className="text-center py-8">
                <p className="text-3xl mb-2">📅</p>
                <p className="text-muted-foreground text-sm">No assignments this month</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="list" className="mt-4">
          <div className="space-y-2">
            {assignments.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-3xl mb-2">📋</p>
                <p className="text-muted-foreground">No assignments yet. Generate a schedule to get started.</p>
              </div>
            ) : (
              assignments.map((a) => (
                <div key={a.id} className={`flex flex-wrap items-center justify-between gap-2 border rounded-xl p-3 transition-all ${
                  a.status === "complete" ? "bg-emerald-50/50 border-emerald-200" : "hover:border-primary/30"
                }`}>
                  <div className="flex items-center gap-2 text-sm min-w-0">
                    <span className="text-muted-foreground text-xs w-24 shrink-0">{formatDisplayDate(a.date)}</span>
                    <span
                      className="px-2 py-0.5 rounded-md text-[11px] font-medium shrink-0"
                      style={{
                        backgroundColor: a.child.color || "#7c3aed",
                        color: getContrastText(a.child.color || "#7c3aed"),
                      }}
                    >
                      {a.child.name}
                    </span>
                    <span className="truncate">{a.chore.emoji && <span className="mr-1">{a.chore.emoji}</span>}{a.chore.name}</span>
                    {a.status === "complete" && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {a.status === "pending" && (
                      <>
                        <Button size="sm" variant="success" onClick={() => updateStatus(a.id, "complete")}>Done</Button>
                        <Button size="sm" variant="outline" onClick={() => updateStatus(a.id, "skipped")}>Skip</Button>
                      </>
                    )}
                    {isParent && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditing(a);
                          setEditForm({ date: a.date, childId: a.childId, choreId: a.choreId, status: a.status });
                        }}
                      >
                        Edit
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </TabsContent>

        {isParent && (
          <TabsContent value="export" className="mt-4">
            <IcsExportPanel />
          </TabsContent>
        )}
      </Tabs>

      <Dialog open={!!editing} onOpenChange={() => setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Assignment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input type="date" value={editForm.date} onChange={(e) => setEditForm({ ...editForm, date: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Child</Label>
              <Select value={editForm.childId} onValueChange={(v) => setEditForm({ ...editForm, childId: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {children.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Chore</Label>
              <Select value={editForm.choreId} onValueChange={(v) => setEditForm({ ...editForm, choreId: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {chores.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={editForm.status} onValueChange={(v) => setEditForm({ ...editForm, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="complete">Complete</SelectItem>
                  <SelectItem value="skipped">Skipped</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button onClick={saveEdit} className="flex-1">Save</Button>
              <Button variant="destructive" onClick={deleteAssignment}>Delete</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
