"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChildAvatar } from "@/components/child-avatar";
import { formatMoney, formatPoints, getContrastText } from "@/lib/utils";
import {
  Trophy,
  Medal,
  Crown,
  Flame,
  TrendingUp,
  Star,
  Zap,
  DollarSign,
  ClipboardCheck,
  Calendar,
  CalendarDays,
  CalendarRange,
  CalendarCheck,
} from "lucide-react";

type LeaderEntry = {
  childId: string;
  name: string;
  color: string | null;
  emoji: string | null;
  totalPoints: number;
  totalCash: number;
  choreCount: number;
};

type LeaderboardData = {
  period: string;
  startDate: string;
  byPoints: LeaderEntry[];
  byCash: LeaderEntry[];
  byChores: LeaderEntry[];
};

const PERIODS = [
  { id: "daily", label: "Today", icon: Calendar },
  { id: "weekly", label: "This Week", icon: CalendarDays },
  { id: "monthly", label: "This Month", icon: CalendarRange },
  { id: "yearly", label: "This Year", icon: CalendarCheck },
];

const RANK_STYLES = [
  {
    bg: "bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500",
    text: "text-amber-900",
    ring: "ring-amber-400/50",
    icon: Crown,
    label: "1st",
    glow: "shadow-amber-200/60",
  },
  {
    bg: "bg-gradient-to-r from-slate-300 via-gray-200 to-slate-300",
    text: "text-slate-700",
    ring: "ring-slate-300/50",
    icon: Medal,
    label: "2nd",
    glow: "shadow-slate-200/60",
  },
  {
    bg: "bg-gradient-to-r from-amber-600 via-orange-500 to-amber-700",
    text: "text-amber-100",
    ring: "ring-amber-500/50",
    icon: Medal,
    label: "3rd",
    glow: "shadow-orange-200/60",
  },
];

function RankBadge({ rank }: { rank: number }) {
  if (rank < 3) {
    const style = RANK_STYLES[rank];
    const Icon = style.icon;
    return (
      <div className={`h-10 w-10 rounded-full ${style.bg} flex items-center justify-center shadow-lg ${style.glow} ring-2 ${style.ring}`}>
        <Icon className={`h-5 w-5 ${style.text}`} />
      </div>
    );
  }
  return (
    <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-500">
      {rank + 1}
    </div>
  );
}

const LEADER_CONFIG = {
  points: {
    icon: Zap,
    title: "Points Leaders",
    gradient: "theme-gradient-br",
    barGradient: "theme-gradient",
    emptyEmoji: "⚡",
    emptyLabel: "points",
    getValue: (e: LeaderEntry) => e.totalPoints,
    formatValue: (e: LeaderEntry) => formatPoints(e.totalPoints),
  },
  cash: {
    icon: DollarSign,
    title: "Cash Leaders",
    gradient: "bg-gradient-to-br from-emerald-500 to-teal-500",
    barGradient: "bg-gradient-to-r from-emerald-500 to-teal-500",
    emptyEmoji: "💰",
    emptyLabel: "cash",
    getValue: (e: LeaderEntry) => e.totalCash,
    formatValue: (e: LeaderEntry) => formatMoney(e.totalCash),
  },
  chores: {
    icon: ClipboardCheck,
    title: "Chore Leaders",
    gradient: "bg-gradient-to-br from-amber-500 to-orange-500",
    barGradient: "bg-gradient-to-r from-amber-500 to-orange-500",
    emptyEmoji: "🏠",
    emptyLabel: "chores",
    getValue: (e: LeaderEntry) => e.choreCount,
    formatValue: (e: LeaderEntry) => `${e.choreCount} chore${e.choreCount !== 1 ? "s" : ""}`,
  },
} as const;

function computeRanks(entries: LeaderEntry[], getValue: (e: LeaderEntry) => number): number[] {
  const ranks: number[] = [];
  for (let i = 0; i < entries.length; i++) {
    if (i === 0) { ranks.push(0); continue; }
    ranks.push(getValue(entries[i]) === getValue(entries[i - 1]) ? ranks[i - 1] : i);
  }
  return ranks;
}

function LeaderCard({
  entries,
  type,
  period,
}: {
  entries: LeaderEntry[];
  type: "points" | "cash" | "chores";
  period: string;
}) {
  const config = LEADER_CONFIG[type];
  const Icon = config.icon;
  const maxValue = Math.max(...entries.map(config.getValue), 1);
  const hasActivity = entries.some((e) => config.getValue(e) > 0);
  const ranks = computeRanks(entries, config.getValue);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${config.gradient}`}>
            <Icon className="h-4.5 w-4.5 text-white" />
          </div>
          <div>
            <CardTitle className="text-base">{config.title}</CardTitle>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!hasActivity ? (
          <div className="text-center py-8">
            <p className="text-4xl mb-2">{config.emptyEmoji}</p>
            <p className="text-muted-foreground text-sm">
              No {config.emptyLabel} earned{" "}
              {period === "daily" ? "today" : `this ${period.replace("ly", "")}`} yet
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Complete chores to climb the board!
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {entries.map((entry, idx) => {
              const value = config.getValue(entry);
              const barWidth = maxValue > 0 ? (value / maxValue) * 100 : 0;
              const rank = ranks[idx];
              const isFirst = rank === 0 && value > 0;

              return (
                <div
                  key={entry.childId}
                  className={`relative rounded-xl border p-3 transition-all ${
                    isFirst
                      ? "border-amber-200 bg-amber-50/40 shadow-sm"
                      : "hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <RankBadge rank={rank} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className="px-2 py-0.5 rounded-md text-xs font-semibold"
                          style={{
                            backgroundColor: entry.color || "#7c3aed",
                            color: getContrastText(entry.color || "#7c3aed"),
                          }}
                        >
                          {entry.name}
                        </span>
                        {isFirst && (
                          <Flame className="h-4 w-4 text-amber-500 animate-pulse" />
                        )}
                      </div>
                      <div className="mt-2 relative">
                        <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ease-out ${config.barGradient}`}
                            style={{ width: `${barWidth}%` }}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-lg font-bold">{config.formatValue(entry)}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function LeaderboardPage() {
  const [period, setPeriod] = useState("weekly");
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/leaderboard?period=${period}`)
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [period]);

  const periodLabel = period === "daily" ? "Today's" : period === "weekly" ? "This week's" : period === "monthly" ? "This month's" : "This year's";

  const topScore = data?.byPoints[0]?.totalPoints || 0;
  const topKids = topScore > 0
    ? data!.byPoints.filter((e) => e.totalPoints === topScore)
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md">
          <Trophy className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Leaderboard</h1>
          <p className="text-muted-foreground text-sm">Who&apos;s crushing it?</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {PERIODS.map((p) => {
          const Icon = p.icon;
          const active = period === p.id;
          return (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                active
                  ? "theme-gradient text-white shadow-md"
                  : "bg-white border hover:border-slate-300 hover:shadow-sm text-muted-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {p.label}
            </button>
          );
        })}
      </div>

      {topKids.length === 1 && (
        <Card className="overflow-hidden border-0 bg-gradient-to-br from-amber-400 via-yellow-400 to-orange-400 text-white shadow-xl">
          <CardContent className="pt-6 pb-5">
            <div className="flex items-center gap-4">
              <div className="relative">
                <ChildAvatar name={topKids[0].name} color={topKids[0].color} emoji={topKids[0].emoji} size="lg" />
                <div className="absolute -top-1 -right-1 h-7 w-7 rounded-full bg-white flex items-center justify-center shadow-md">
                  <Crown className="h-4 w-4 text-amber-500" />
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-lg font-bold">{topKids[0].name}</p>
                  <Star className="h-4 w-4 text-amber-100" />
                </div>
                <p className="text-amber-100 text-sm font-medium">
                  {periodLabel} Champion
                </p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold">{topKids[0].totalPoints}</p>
                <p className="text-amber-100 text-sm">points</p>
                <p className="text-amber-100 text-xs mt-0.5">
                  {topKids[0].choreCount} chore{topKids[0].choreCount !== 1 ? "s" : ""} done
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {topKids.length === 2 && (
        <Card className="overflow-hidden border-0 bg-gradient-to-br from-amber-400 via-yellow-400 to-orange-400 text-white shadow-xl">
          <CardContent className="pt-6 pb-5">
            <div className="flex items-center gap-3">
              <div className="flex-1 flex items-center gap-3 justify-end">
                <div className="text-right">
                  <p className="text-lg font-bold">{topKids[0].name}</p>
                  <p className="text-amber-100 text-xs">{topKids[0].choreCount} chore{topKids[0].choreCount !== 1 ? "s" : ""}</p>
                </div>
                <div className="relative">
                  <ChildAvatar name={topKids[0].name} color={topKids[0].color} emoji={topKids[0].emoji} size="lg" />
                  <div className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-white flex items-center justify-center shadow-md">
                    <Crown className="h-3 w-3 text-amber-500" />
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-center gap-1">
                <p className="text-3xl font-bold">{topScore}</p>
                <p className="text-amber-100 text-xs font-medium">TIE</p>
              </div>
              <div className="flex-1 flex items-center gap-3">
                <div className="relative">
                  <ChildAvatar name={topKids[1].name} color={topKids[1].color} emoji={topKids[1].emoji} size="lg" />
                  <div className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-white flex items-center justify-center shadow-md">
                    <Crown className="h-3 w-3 text-amber-500" />
                  </div>
                </div>
                <div>
                  <p className="text-lg font-bold">{topKids[1].name}</p>
                  <p className="text-amber-100 text-xs">{topKids[1].choreCount} chore{topKids[1].choreCount !== 1 ? "s" : ""}</p>
                </div>
              </div>
            </div>
            <p className="text-center text-amber-100 text-sm font-medium mt-2">
              {periodLabel} Co-Champions!
            </p>
          </CardContent>
        </Card>
      )}

      {topKids.length >= 3 && (
        <Card className="overflow-hidden border-0 bg-gradient-to-br from-amber-400 via-yellow-400 to-orange-400 text-white shadow-xl">
          <CardContent className="pt-6 pb-5 text-center">
            <div className="flex justify-center gap-2 mb-2">
              {topKids.map((k) => (
                <div key={k.childId} className="relative">
                  <ChildAvatar name={k.name} color={k.color} emoji={k.emoji} size="lg" />
                  <div className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-white flex items-center justify-center shadow-md">
                    <Crown className="h-3 w-3 text-amber-500" />
                  </div>
                </div>
              ))}
            </div>
            <p className="text-3xl font-bold">{topScore} pts</p>
            <p className="text-amber-100 text-sm font-medium mt-1">
              {periodLabel} {topKids.length}-Way Tie!
            </p>
            <p className="text-amber-100 text-xs mt-0.5">
              {topKids.map((k) => k.name).join(", ")}
            </p>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="space-y-4 animate-pulse">
          <div className="h-48 bg-white rounded-2xl border" />
          <div className="h-48 bg-white rounded-2xl border" />
        </div>
      ) : data ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <LeaderCard entries={data.byPoints} type="points" period={period} />
          <LeaderCard entries={data.byCash} type="cash" period={period} />
          <LeaderCard entries={data.byChores} type="chores" period={period} />
        </div>
      ) : (
        <p className="text-destructive">Failed to load leaderboard.</p>
      )}

      <Card className="border-dashed">
        <CardContent className="py-6">
          <div className="text-center">
            <div className="flex justify-center gap-2 mb-3">
              <TrendingUp className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              Complete chores to climb the leaderboard! The more you do, the higher you rank.
            </p>
            <div className="flex justify-center gap-4 mt-3">
              <Badge variant="points" className="text-xs">
                <Zap className="h-3 w-3 mr-1" /> Earn Points
              </Badge>
              <Badge variant="success" className="text-xs">
                <DollarSign className="h-3 w-3 mr-1" /> Earn Cash
              </Badge>
              <Badge variant="warning" className="text-xs">
                <Trophy className="h-3 w-3 mr-1" /> Win Glory
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
