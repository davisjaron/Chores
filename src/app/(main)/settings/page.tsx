"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { IcsExportPanel } from "@/components/ics-export-panel";
import { todayString } from "@/lib/utils";
import { toast } from "sonner";
import { Calendar, Trophy, Settings, Lock, Palette, Check, AlertTriangle, Globe, HardDrive, ChevronRight } from "lucide-react";
import Link from "next/link";

const THEME_OPTIONS = [
  { id: "violet", label: "Violet", from: "#8b5cf6", to: "#d946ef", bg: "from-violet-100 via-fuchsia-50" },
  { id: "blue", label: "Ocean Blue", from: "#3b82f6", to: "#06b6d4", bg: "from-blue-100 via-cyan-50" },
  { id: "rose", label: "Rose", from: "#f43f5e", to: "#ec4899", bg: "from-rose-100 via-pink-50" },
  { id: "teal", label: "Teal", from: "#14b8a6", to: "#06b6d4", bg: "from-teal-100 via-cyan-50" },
  { id: "amber", label: "Sunset", from: "#f59e0b", to: "#ef4444", bg: "from-amber-100 via-orange-50" },
  { id: "indigo", label: "Indigo", from: "#6366f1", to: "#8b5cf6", bg: "from-indigo-100 via-violet-50" },
];

type SettingsData = {
  mode: string;
  startDate: string;
  allowSameDay: boolean;
  cashPerPoint: number | null;
  themeColor?: string;
  requireAssignedFirst?: boolean;
  timezone?: string;
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [cashPerPoint, setCashPerPoint] = useState("");
  const [startDate, setStartDate] = useState(todayString());
  const [allowSameDay, setAllowSameDay] = useState(false);
  const [saving, setSaving] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPw, setChangingPw] = useState(false);

  const [selectedTheme, setSelectedTheme] = useState("violet");
  const [requireAssignedFirst, setRequireAssignedFirst] = useState(false);
  const [timezone, setTimezone] = useState("America/Chicago");
  const [resetConfirm, setResetConfirm] = useState("");
  const [resetting, setResetting] = useState(false);

  async function load() {
    const res = await fetch("/api/settings");
    const data = await res.json();
    setSettings(data);
    setCashPerPoint(data.cashPerPoint?.toString() || "");
    setStartDate(data.startDate || todayString());
    setAllowSameDay(data.allowSameDay || false);
    setSelectedTheme(data.themeColor || "violet");
    setRequireAssignedFirst(data.requireAssignedFirst || false);
    setTimezone(data.timezone || "America/Chicago");
  }

  useEffect(() => { load(); }, []);

  async function setMode(mode: string) {
    setSaving(true);
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...settings,
        mode,
        startDate,
        allowSameDay,
        cashPerPoint: cashPerPoint || null,
        themeColor: selectedTheme,
        requireAssignedFirst,
        timezone,
      }),
    });
    toast.success(`Switched to ${mode === "claim" ? "Claim & Earn" : "Assigned Schedule"} mode`);
    setSaving(false);
    load();
  }

  async function saveSettings() {
    setSaving(true);
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...settings,
        startDate,
        allowSameDay,
        cashPerPoint: cashPerPoint || null,
        themeColor: selectedTheme,
        requireAssignedFirst,
        timezone,
      }),
    });
    toast.success("Settings saved");
    setSaving(false);
    load();
    window.location.reload();
  }

  async function changePassword() {
    if (newPassword !== confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }
    setChangingPw(true);
    const res = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data = await res.json();
    setChangingPw(false);
    if (res.ok) {
      toast.success("Password changed!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } else {
      toast.error(data.error || "Failed to change password");
    }
  }

  async function resetAllData() {
    if (resetConfirm !== "RESET") {
      toast.error("Type RESET to confirm");
      return;
    }
    setResetting(true);
    const res = await fetch("/api/settings/reset", { method: "POST" });
    setResetting(false);
    if (res.ok) {
      toast.success("All chore data has been reset");
      setResetConfirm("");
    } else {
      toast.error("Reset failed");
    }
  }

  if (!settings) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-36 bg-slate-200 rounded-lg" />
        <div className="grid gap-4 md:grid-cols-2">
          <div className="h-40 bg-white rounded-2xl border" />
          <div className="h-40 bg-white rounded-2xl border" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-accent flex items-center justify-center">
          <Settings className="h-5 w-5 text-primary" />
        </div>
        <h1 className="text-2xl md:text-3xl font-bold">Settings</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card
          className={`cursor-pointer transition-all hover:shadow-md ${
            settings.mode === "assigned" ? "ring-2 ring-ring shadow-md" : ""
          }`}
          onClick={() => !saving && setMode("assigned")}
        >
          <CardHeader>
            <div className="h-12 w-12 rounded-xl bg-accent flex items-center justify-center mb-2">
              <Calendar className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Assigned Schedule</CardTitle>
            <CardDescription>
              Fair rotating schedule — one chore per child every other day.
            </CardDescription>
          </CardHeader>
        </Card>
        <Card
          className={`cursor-pointer transition-all hover:shadow-md ${
            settings.mode === "claim" ? "ring-2 ring-amber-500 shadow-md" : ""
          }`}
          onClick={() => !saving && setMode("claim")}
        >
          <CardHeader>
            <div className="h-12 w-12 rounded-xl bg-amber-100 flex items-center justify-center mb-2">
              <Trophy className="h-6 w-6 text-amber-600" />
            </div>
            <CardTitle>Claim & Earn</CardTitle>
            <CardDescription>
              Gamified board where kids claim chores for points and rewards.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-primary" />
            <CardTitle>App Theme</CardTitle>
          </div>
          <CardDescription>Choose your family&apos;s color scheme</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {THEME_OPTIONS.map((theme) => (
              <button
                key={theme.id}
                type="button"
                onClick={() => setSelectedTheme(theme.id)}
                className={`relative rounded-xl p-3 border-2 transition-all text-left ${
                  selectedTheme === theme.id
                    ? "border-slate-800 shadow-md"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="h-8 w-8 rounded-lg"
                    style={{ background: `linear-gradient(135deg, ${theme.from}, ${theme.to})` }}
                  />
                  <span className="text-sm font-semibold">{theme.label}</span>
                </div>
                <div className="flex gap-1">
                  <div className="h-2 flex-1 rounded-full" style={{ backgroundColor: theme.from }} />
                  <div className="h-2 flex-1 rounded-full" style={{ backgroundColor: theme.to }} />
                  <div className="h-2 flex-1 rounded-full bg-emerald-500" />
                </div>
                {selectedTheme === theme.id && (
                  <div className="absolute top-2 right-2 h-5 w-5 rounded-full bg-slate-800 flex items-center justify-center">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                )}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            The green cash color stays the same across all themes.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>General</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {settings.mode === "claim" && (
            <div className="space-y-1.5">
              <Label>Cash per point</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="e.g. 0.10 (leave blank if N/A)"
                value={cashPerPoint}
                onChange={(e) => setCashPerPoint(e.target.value)}
              />
            </div>
          )}
          {settings.mode === "assigned" && (
            <>
              <div className="space-y-1.5">
                <Label>Default schedule start date</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <Switch checked={allowSameDay} onCheckedChange={setAllowSameDay} />
                  <Label>Allow same chore on same day</Label>
                </div>
                <p className="text-xs text-muted-foreground ml-11">
                  When off, the schedule generator won&apos;t assign the same chore to multiple kids on the same day. Turn on if you have more kids than chores.
                </p>
              </div>
            </>
          )}
          {settings.mode === "claim" && (
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <Switch checked={requireAssignedFirst} onCheckedChange={setRequireAssignedFirst} />
                <Label>Make assigned chores required first</Label>
              </div>
              <p className="text-xs text-muted-foreground ml-11">
                When on, kids must complete all parent-assigned chores before they can voluntarily claim new ones.
              </p>
            </div>
          )}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <Label>Timezone</Label>
            </div>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="America/New_York">Eastern (America/New_York)</option>
              <option value="America/Chicago">Central (America/Chicago)</option>
              <option value="America/Denver">Mountain (America/Denver)</option>
              <option value="America/Los_Angeles">Pacific (America/Los_Angeles)</option>
              <option value="America/Anchorage">Alaska (America/Anchorage)</option>
              <option value="Pacific/Honolulu">Hawaii (Pacific/Honolulu)</option>
              <option value="UTC">UTC</option>
            </select>
            <p className="text-xs text-muted-foreground">
              Controls when the &quot;day&quot; rolls over for rate limits, claims, and transaction dates.
            </p>
          </div>
          <Button onClick={saveSettings} disabled={saving}>
            {saving ? "Saving..." : "Save settings"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            <CardTitle>Change Password</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 max-w-md">
          <div className="space-y-1.5">
            <Label>Current password</Label>
            <Input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>New password</Label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Confirm new password</Label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
          <Button
            onClick={changePassword}
            disabled={changingPw || !currentPassword || !newPassword || !confirmPassword}
          >
            {changingPw ? "Changing..." : "Change password"}
          </Button>
        </CardContent>
      </Card>

      <Link href="/settings/backup" className="block">
        <Card className="hover:shadow-md transition-all cursor-pointer border-blue-100">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HardDrive className="h-5 w-5 text-blue-600" />
                <CardTitle>Backup & Recovery</CardTitle>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </div>
            <CardDescription>
              Configure automated backups to S3-compatible storage for disaster recovery.
            </CardDescription>
          </CardHeader>
        </Card>
      </Link>

      <Card className="border-red-200">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <CardTitle className="text-red-600">Reset All Data</CardTitle>
          </div>
          <CardDescription>
            Clears all claims, assignments, redemptions, and cash transactions. Children, chores, rewards, and settings are kept.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 max-w-md">
          <div className="space-y-1.5">
            <Label>Type <span className="font-bold">RESET</span> to confirm</Label>
            <Input
              value={resetConfirm}
              onChange={(e) => setResetConfirm(e.target.value)}
              placeholder="RESET"
            />
          </div>
          <Button
            variant="destructive"
            onClick={resetAllData}
            disabled={resetting || resetConfirm !== "RESET"}
          >
            {resetting ? "Resetting..." : "Reset all chore data"}
          </Button>
        </CardContent>
      </Card>

      {settings.mode === "assigned" && <IcsExportPanel />}
    </div>
  );
}
