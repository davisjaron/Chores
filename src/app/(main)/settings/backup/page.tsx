"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  HardDrive,
  Shield,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  CloudUpload,
  Download,
  RotateCcw,
  ArrowLeft,
  Wifi,
} from "lucide-react";
import Link from "next/link";

type BackupConfig = {
  provider: string;
  enabled: boolean;
  endpoint: string;
  region: string;
  bucket: string;
  path: string;
  accessKey: string;
  secretKey: string;
  dailyBackupTime: string;
  retentionDays: number;
  lastBackupAt: string | null;
  lastBackupStatus: string | null;
  lastBackupError: string | null;
  lastBackupFile: string | null;
  nextBackupAt: string | null;
};

type BackupFile = {
  key: string;
  name: string;
  size: number;
  lastModified: string;
};

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "Never";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

const emptyConfig: BackupConfig = {
  provider: "s3",
  enabled: false,
  endpoint: "",
  region: "",
  bucket: "",
  path: "chores-backups",
  accessKey: "",
  secretKey: "",
  dailyBackupTime: "02:00",
  retentionDays: 30,
  lastBackupAt: null,
  lastBackupStatus: null,
  lastBackupError: null,
  lastBackupFile: null,
  nextBackupAt: null,
};

export default function BackupSettingsPage() {
  const [config, setConfig] = useState<BackupConfig>(emptyConfig);
  const [form, setForm] = useState<BackupConfig>(emptyConfig);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [backingUp, setBackingUp] = useState(false);
  const [backups, setBackups] = useState<BackupFile[]>([]);
  const [loadingBackups, setLoadingBackups] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [restoreConfirm, setRestoreConfirm] = useState("");
  const [showRestore, setShowRestore] = useState(false);

  async function loadConfig() {
    try {
      const res = await fetch("/api/backup/config");
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
        setForm(data);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }

  async function loadBackups() {
    setLoadingBackups(true);
    try {
      const res = await fetch("/api/backup/list");
      if (res.ok) {
        setBackups(await res.json());
      }
    } catch {
    } finally {
      setLoadingBackups(false);
    }
  }

  useEffect(() => {
    loadConfig();
  }, []);

  async function saveConfig() {
    setSaving(true);
    try {
      const res = await fetch("/api/backup/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        toast.success("Backup settings saved");
        loadConfig();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to save");
      }
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  async function testConnection() {
    setTesting(true);
    try {
      const res = await fetch("/api/backup/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Connection successful");
      } else {
        toast.error(data.error || "Connection failed");
      }
    } catch {
      toast.error("Connection test failed");
    } finally {
      setTesting(false);
    }
  }

  async function triggerBackup() {
    setBackingUp(true);
    try {
      const res = await fetch("/api/backup/trigger", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Backup created: ${data.filename} (${formatBytes(data.size)})`);
        loadConfig();
        if (showRestore) loadBackups();
      } else {
        toast.error(data.error || "Backup failed");
      }
    } catch {
      toast.error("Backup failed");
    } finally {
      setBackingUp(false);
    }
  }

  async function handleRestore(key: string) {
    if (restoreConfirm !== "RESTORE") {
      toast.error("Type RESTORE to confirm");
      return;
    }
    setRestoring(key);
    try {
      const res = await fetch("/api/backup/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Backup restored! Reloading...");
        setRestoreConfirm("");
        setTimeout(() => window.location.reload(), 2000);
      } else {
        toast.error(data.error || "Restore failed");
      }
    } catch {
      toast.error("Restore failed");
    } finally {
      setRestoring(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-48 bg-slate-200 rounded-lg" />
        <div className="h-40 bg-white rounded-2xl border" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/settings" className="h-10 w-10 rounded-xl bg-accent flex items-center justify-center hover:bg-accent/80 transition-colors">
          <ArrowLeft className="h-5 w-5 text-primary" />
        </Link>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Backup & Recovery</h1>
          <p className="text-sm text-muted-foreground">Automated disaster recovery for your Chores data</p>
        </div>
      </div>

      {/* Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <CardTitle>Backup Status</CardTitle>
            </div>
            {config.enabled ? (
              <Badge variant="success">Active</Badge>
            ) : (
              <Badge variant="outline">Disabled</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Last Backup</p>
              <div className="flex items-center gap-2">
                {config.lastBackupStatus === "success" && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                {config.lastBackupStatus === "failed" && <XCircle className="h-4 w-4 text-red-500" />}
                {!config.lastBackupStatus && <Clock className="h-4 w-4 text-muted-foreground" />}
                <span className="text-sm font-medium">{formatDateTime(config.lastBackupAt)}</span>
              </div>
              {config.lastBackupFile && (
                <p className="text-xs text-muted-foreground">{config.lastBackupFile}</p>
              )}
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Next Scheduled</p>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">
                  {config.enabled ? formatDateTime(config.nextBackupAt) : "Not scheduled"}
                </span>
              </div>
            </div>
          </div>
          {config.lastBackupStatus === "failed" && config.lastBackupError && (
            <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-100">
              <p className="text-sm text-red-700">{config.lastBackupError}</p>
            </div>
          )}
          <div className="mt-4 flex gap-2">
            <Button
              onClick={triggerBackup}
              disabled={backingUp || !config.bucket}
              size="sm"
            >
              {backingUp ? (
                <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />Backing up...</>
              ) : (
                <><CloudUpload className="h-4 w-4 mr-1.5" />Backup Now</>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setShowRestore(!showRestore); if (!showRestore) loadBackups(); }}
              disabled={!config.bucket}
            >
              <RotateCcw className="h-4 w-4 mr-1.5" />
              {showRestore ? "Hide Restore" : "Restore From Backup"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Restore Panel */}
      {showRestore && (
        <Card className="border-amber-200">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Download className="h-5 w-5 text-amber-600" />
              <CardTitle className="text-amber-700">Restore From Backup</CardTitle>
            </div>
            <CardDescription>
              Select a backup to restore. This will replace all current data including the database and uploaded files.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loadingBackups ? (
              <div className="flex items-center gap-2 py-4 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Loading backups...</span>
              </div>
            ) : backups.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">No backups found in the configured storage.</p>
            ) : (
              <>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {backups.map((backup) => (
                    <div
                      key={backup.key}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{backup.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDateTime(backup.lastModified)} &middot; {formatBytes(backup.size)}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="ml-3 shrink-0"
                        disabled={restoring !== null || restoreConfirm !== "RESTORE"}
                        onClick={() => handleRestore(backup.key)}
                      >
                        {restoring === backup.key ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          "Restore"
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
                <Separator />
                <div className="space-y-1.5 max-w-xs">
                  <Label>Type <span className="font-bold">RESTORE</span> to enable restore buttons</Label>
                  <Input
                    value={restoreConfirm}
                    onChange={(e) => setRestoreConfirm(e.target.value)}
                    placeholder="RESTORE"
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Storage Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <HardDrive className="h-5 w-5 text-primary" />
            <CardTitle>Storage Configuration</CardTitle>
          </div>
          <CardDescription>
            Connect to S3-compatible storage (AWS S3, Backblaze B2, Cloudflare R2, Wasabi, MinIO, etc.)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Endpoint URL</Label>
              <Input
                value={form.endpoint}
                onChange={(e) => setForm({ ...form, endpoint: e.target.value })}
                placeholder="https://s3.us-east-1.amazonaws.com (optional for AWS)"
              />
              <p className="text-xs text-muted-foreground">
                Required for non-AWS services. Leave blank for standard AWS S3.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>Region</Label>
              <Input
                value={form.region}
                onChange={(e) => setForm({ ...form, region: e.target.value })}
                placeholder="us-east-1"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Bucket Name</Label>
              <Input
                value={form.bucket}
                onChange={(e) => setForm({ ...form, bucket: e.target.value })}
                placeholder="my-chores-backups"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Backup Path / Prefix</Label>
              <Input
                value={form.path}
                onChange={(e) => setForm({ ...form, path: e.target.value })}
                placeholder="chores-backups"
              />
              <p className="text-xs text-muted-foreground">
                Folder path within the bucket.
              </p>
            </div>
          </div>
          <Separator />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Access Key ID</Label>
              <Input
                type="password"
                autoComplete="off"
                value={form.accessKey}
                onChange={(e) => setForm({ ...form, accessKey: e.target.value })}
                placeholder="Enter access key"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Secret Access Key</Label>
              <Input
                type="password"
                autoComplete="off"
                value={form.secretKey}
                onChange={(e) => setForm({ ...form, secretKey: e.target.value })}
                placeholder="Enter secret key"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={testConnection}
              disabled={testing || !form.bucket}
            >
              {testing ? (
                <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />Testing...</>
              ) : (
                <><Wifi className="h-4 w-4 mr-1.5" />Test Connection</>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Schedule Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            <CardTitle>Backup Schedule</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2.5">
            <Switch
              checked={form.enabled}
              onCheckedChange={(checked) => setForm({ ...form, enabled: checked })}
            />
            <Label>Enable automated daily backups</Label>
          </div>
          {form.enabled && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Daily Backup Time</Label>
                <Input
                  type="time"
                  value={form.dailyBackupTime}
                  onChange={(e) => setForm({ ...form, dailyBackupTime: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Uses your configured timezone from Settings.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label>Retention (days)</Label>
                <Input
                  type="number"
                  min="1"
                  max="365"
                  value={form.retentionDays}
                  onChange={(e) => setForm({ ...form, retentionDays: Number(e.target.value) || 30 })}
                />
                <p className="text-xs text-muted-foreground">
                  Backups older than this are automatically deleted.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex gap-2">
        <Button onClick={saveConfig} disabled={saving}>
          {saving ? (
            <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />Saving...</>
          ) : (
            "Save Backup Settings"
          )}
        </Button>
      </div>
    </div>
  );
}
