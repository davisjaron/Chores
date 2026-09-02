"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Users,
  ListChecks,
  Calendar,
  Trophy,
  Gift,
  Settings,
  LogOut,
  Sparkles,
  Medal,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAppMode } from "@/components/theme-provider";

type NavItem = { href: string; label: string; icon: typeof LayoutDashboard; modes?: string[] };

const parentNav: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/children", label: "Children", icon: Users },
  { href: "/chores", label: "Chores", icon: ListChecks },
  { href: "/schedule", label: "Schedule", icon: Calendar, modes: ["assigned"] },
  { href: "/claim", label: "Claim & Earn", icon: Trophy, modes: ["claim"] },
  { href: "/account", label: "Account", icon: Wallet, modes: ["claim"] },
  { href: "/leaderboard", label: "Leaderboard", icon: Medal, modes: ["claim"] },
  { href: "/rewards", label: "Rewards", icon: Gift, modes: ["claim"] },
  { href: "/settings", label: "Settings", icon: Settings },
];

const kidNav: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/schedule", label: "My Schedule", icon: Calendar, modes: ["assigned"] },
  { href: "/claim", label: "Claim & Earn", icon: Trophy, modes: ["claim"] },
  { href: "/account", label: "Account", icon: Wallet, modes: ["claim"] },
  { href: "/leaderboard", label: "Leaderboard", icon: Medal, modes: ["claim"] },
  { href: "/rewards", label: "Rewards", icon: Gift, modes: ["claim"] },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isKid = session?.user?.role === "kid";
  const mode = useAppMode();
  const baseNav = isKid ? kidNav : parentNav;
  const nav = baseNav.filter((item) => !item.modes || item.modes.includes(mode));

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 border-r bg-white/80 backdrop-blur-sm">
      <div className="p-6 pb-4">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl theme-gradient-br flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold theme-text">
              Chore Chart
            </h1>
            <p className="text-[11px] text-muted-foreground leading-none">
              {isKid ? `Hi, ${session?.user?.name}!` : "Family chore planner"}
            </p>
          </div>
        </div>
      </div>
      <nav className="flex-1 px-3 space-y-0.5">
        {nav.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                active
                  ? "theme-gradient text-white shadow-md"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Icon className="h-[18px] w-[18px]" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-border">
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded-xl"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          <LogOut className="h-4 w-4" />
          Log out
        </Button>
      </div>
    </aside>
  );
}
