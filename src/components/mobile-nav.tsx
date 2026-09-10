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
          "md:hidden fixed top-0 left-0 z-50 h-[82vh] flex flex-col border-r bg-white/95 backdrop-blur-lg transition-all duration-200 ease-in-out",
          expanded ? "w-52" : "w-20"
        )}
      >
        <div className={cn(
          "flex items-center gap-2.5 border-b px-3 py-4",
          expanded ? "px-4" : "justify-center"
        )}>
          <div className="h-11 w-11 rounded-xl theme-gradient-br flex items-center justify-center shrink-0">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          {expanded && (
            <h1 className="text-base font-bold theme-text leading-tight truncate">
              Chore Chart
            </h1>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto py-2 px-2.5 space-y-1">
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
                  "flex items-center gap-3 rounded-xl py-3 text-sm font-medium transition-all",
                  expanded ? "px-3" : "justify-center px-0",
                  active
                    ? "theme-gradient text-white shadow-md"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <Icon className="h-7 w-7 shrink-0" />
                {expanded && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="border-t px-2.5 py-3 space-y-1.5">
          <button
            onClick={() => setExpanded(!expanded)}
            className={cn(
              "flex items-center gap-3 rounded-xl py-3 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground w-full transition-all",
              expanded ? "px-3" : "justify-center px-0"
            )}
          >
            {expanded ? (
              <>
                <ChevronsLeft className="h-7 w-7 shrink-0" />
                <span>Collapse</span>
              </>
            ) : (
              <ChevronsRight className="h-7 w-7 shrink-0" />
            )}
          </button>
          <button
            onClick={() => { signOut({ callbackUrl: "/login" }); }}
            title={!expanded ? "Log out" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-xl py-3 text-sm font-bold bg-red-100 text-red-600 hover:bg-red-200 w-full transition-all",
              expanded ? "px-3" : "justify-center px-0"
            )}
          >
            <LogOut className="h-7 w-7 shrink-0" />
            {expanded && <span>Log out</span>}
          </button>
        </div>
      </aside>
    </>
  );
}

export function MobileHeader() {
  return null;
}
