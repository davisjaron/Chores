"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { todayString } from "@/lib/utils";
import { Download } from "lucide-react";

export function IcsExportPanel() {
  const [includeCompleted, setIncludeCompleted] = useState(true);
  const [includeSkipped, setIncludeSkipped] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleExport() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        includeCompleted: String(includeCompleted),
        includeSkipped: String(includeSkipped),
      });
      const res = await fetch(`/api/assignments/export-ics?${params}`);
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `chore-schedule-${todayString()}.ics`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-accent flex items-center justify-center">
            <Download className="h-4 w-4 text-primary" />
          </div>
          <div>
            <CardTitle className="text-base">Export to Calendar</CardTitle>
            <CardDescription className="text-xs">
              Download .ics for Google Calendar, Apple Calendar, or Outlook.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2.5">
          <Checkbox
            id="includeCompleted"
            checked={includeCompleted}
            onCheckedChange={(v) => setIncludeCompleted(!!v)}
          />
          <Label htmlFor="includeCompleted" className="text-sm">Include completed</Label>
        </div>
        <div className="flex items-center gap-2.5">
          <Checkbox
            id="includeSkipped"
            checked={includeSkipped}
            onCheckedChange={(v) => setIncludeSkipped(!!v)}
          />
          <Label htmlFor="includeSkipped" className="text-sm">Include skipped</Label>
        </div>
        <Button onClick={handleExport} disabled={loading} variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          {loading ? "Exporting..." : "Download .ics"}
        </Button>
      </CardContent>
    </Card>
  );
}
