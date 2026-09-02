"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useState } from "react";
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
  ChevronsRight,
  ChevronsLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppMode } from "@/components/theme-provider";

type NavItem = { href: string; label: string; icon: typeof LayoutDashboard; modes?: string[] };

const parentNav: NavItem[] = [
  { href: "/", label: "Home", icon: LayoutDashboard },
  { href: "/children", label: "Children", icon: Users },
  { href: "/chores", label: "Chores", icon: ListChecks },
  { href: "/schedule", label: "Schedule", icon: Calendar, modes: ["assigned"] },
  { href: "/claim", label: "Claim", icon: Trophy, modes: ["claim"] },
  { href: "/account", label: "Account", icon: Wallet, modes: ["claim"] },
  { href: "/leaderboard", label: "Board", icon: Medal, modes: ["claim"] },
  { href: "/rewards", label: "Rewards", icon: Gift, modes: ["claim"] },
  { href: "/settings", label: "Settings", icon: Settings },
];

const kidNav: NavItem[] = [
  { href: "/", label: "Home", icon: LayoutDashboard },
  { href: "/schedule", label: "Schedule", icon: Calendar, modes: ["assigned"] },
  { href: "/claim", label: "Claim", icon: Trophy, modes: ["claim"] },
  { href: "/rewards", label: "Rewards", icon: Gift, modes: ["claim"] },
  { href: "/account", label: "Account", icon: Wallet, modes: ["claim"] },
  { href: "/leaderboard", label: "Board", icon: Medal, modes: ["claim"] },
];

export function MobileNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isKid = session?.user?.role === "kid";
  const mode = useAppMode();
  const baseNav = isKid ? kidNav : parentNav;
  const nav = baseNav.filter((item) => !item.modes || item.modes.includes(mode));
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      {expanded && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
          onClick={() => setExpanded(false)}
        />
      )}
      <aside
        className={cn(
          "md:hidden fixed top-0 left-0 z-50 h-full flex flex-col border-r bg-white/95 backdrop-blur-lg transition-all duration-200 ease-in-out",
          expanded ? "w-44" : "w-12"
        )}
      >
        <div className={cn(
          "flex items-center gap-2 border-b px-2.5 py-3",
          expanded ? "px-3" : "justify-center"
        )}>
          <div className="h-7 w-7 rounded-lg theme-gradient-br flex items-center justify-center shrink-0">
            <Sparkles className="h-3.5 w-3.5 text-white" />
          </div>
          {expanded && (
            <h1 className="text-sm font-bold theme-text leading-tight truncate">
              Chore Chart
            </h1>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto py-2 px-1.5 space-y-0.5">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setExpanded(false)}
                title={!expanded ? item.label : undefined}
                className={cn(
                  "flex items-center gap-2.5 rounded-xl py-2 text-xs font-medium transition-all",
                  expanded ? "px-2.5" : "justify-center px-0",
                  active
                    ? "theme-gradient text-white shadow-md"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <Icon className="h-[18px] w-[18px] shrink-0" />
                {expanded && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="border-t px-1.5 py-2 space-y-0.5">
          <button
            onClick={() => { signOut({ callbackUrl: "/login" }); }}
            title={!expanded ? "Log out" : undefined}
            className={cn(
              "flex items-center gap-2.5 rounded-xl py-2 text-xs font-medium text-red-400 hover:text-red-600 hover:bg-red-50 w-full transition-all",
              expanded ? "px-2.5" : "justify-center px-0"
            )}
          >
            <LogOut className="h-[18px] w-[18px] shrink-0" />
            {expanded && <span>Log out</span>}
          </button>
          <button
            onClick={() => setExpanded(!expanded)}
            className={cn(
              "flex items-center gap-2.5 rounded-xl py-2 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground w-full transition-all",
              expanded ? "px-2.5" : "justify-center px-0"
            )}
          >
            {expanded ? (
              <>
                <ChevronsLeft className="h-[18px] w-[18px] shrink-0" />
                <span>Collapse</span>
              </>
            ) : (
              <ChevronsRight className="h-[18px] w-[18px] shrink-0" />
            )}
          </button>
        </div>
      </aside>
    </>
  );
}

export function MobileHeader() {
  return null;
}
