"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChildAvatar } from "@/components/child-avatar";
import { Sparkles, KeyRound, User } from "lucide-react";

type ChildOption = { id: string; name: string; color: string | null; emoji: string | null; hasPin?: boolean };

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");
  const [childId, setChildId] = useState("");
  const [children, setChildren] = useState<ChildOption[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/children/login-list")
      .then((r) => (r.ok ? r.json() : []))
      .then(setChildren)
      .catch(() => {});
  }, []);

  async function handleParentLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const result = await signIn("parent", { email, password, redirect: false });
    setLoading(false);
    if (result?.error) setError("Invalid username or password");
    else router.push("/");
  }

  async function handleKidLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const result = await signIn("kid", { childId, pin, redirect: false });
    setLoading(false);
    if (result?.error) setError("Wrong PIN &mdash; try again!");
    else router.push("/");
  }

  return (
    <div className="min-h-screen flex items-center justify-center theme-bg-subtle p-4">
      <div className="w-full max-w-md space-y-6 animate-fade-in">
        <div className="text-center space-y-2">
          <div className="inline-flex h-16 w-16 rounded-2xl theme-gradient-br items-center justify-center shadow-xl mx-auto">
            <Sparkles className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold theme-text">
            Chore Chart
          </h1>
          <p className="text-muted-foreground text-sm">Ready to get stuff done?</p>
        </div>

        <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <CardContent className="pt-6">
            <Tabs defaultValue="kid">
              <TabsList className="grid w-full grid-cols-2 rounded-xl bg-accent p-1">
                <TabsTrigger value="kid" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm gap-1.5">
                  <span className="text-base">👋</span> I&apos;m a Kid
                </TabsTrigger>
                <TabsTrigger value="parent" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm gap-1.5" onClick={() => {
                  fetch("/api/children/login-list")
                    .then((r) => r.json())
                    .then(setChildren);
                }}>
                  <User className="h-3.5 w-3.5" /> Parent
                </TabsTrigger>
              </TabsList>

              <TabsContent value="kid">
                <form onSubmit={handleKidLogin} className="space-y-5 mt-5">
                  <div>
                    <Label className="text-base font-semibold">Who are you?</Label>
                    <div className="flex flex-wrap gap-4 mt-3 justify-center">
                      {children.map((child) => (
                        <button
                          type="button"
                          key={child.id}
                          onClick={() => { setChildId(child.id); setError(""); }}
                          className="flex flex-col items-center gap-1.5 group"
                        >
                          <ChildAvatar
                            name={child.name}
                            color={child.color}
                            emoji={child.emoji}
                            selected={childId === child.id}
                            size="lg"
                          />
                          <span className={`text-xs font-medium transition-colors ${
                            childId === child.id ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                          }`}>
                            {child.name}
                          </span>
                        </button>
                      ))}
                    </div>
                    {children.length === 0 && (
                      <div className="text-center py-8">
                        <p className="text-4xl mb-2">🤷</p>
                        <p className="text-sm text-muted-foreground">
                          No kids set up yet. Ask a parent to add you!
                        </p>
                      </div>
                    )}
                  </div>
                  {childId && (
                    <div className="space-y-2 animate-slide-up">
                      <Label className="flex items-center gap-1.5">
                        <KeyRound className="h-3.5 w-3.5" /> Enter your PIN
                      </Label>
                      <div className="flex justify-center gap-2">
                        {[0, 1, 2, 3].map((i) => (
                          <div
                            key={i}
                            className={`h-12 w-12 rounded-xl border-2 flex items-center justify-center text-xl font-bold transition-all ${
                              pin.length > i
                                ? "border-primary/60 bg-accent text-primary"
                                : "border-slate-200 bg-white text-transparent"
                            }`}
                          >
                            {pin.length > i ? "●" : "○"}
                          </div>
                        ))}
                      </div>
                      <Input
                        type="password"
                        inputMode="numeric"
                        maxLength={6}
                        value={pin}
                        onChange={(e) => { setPin(e.target.value); setError(""); }}
                        className="sr-only"
                        autoFocus
                        required
                      />
                      <div className="grid grid-cols-3 gap-2 pt-2">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, null, 0, "del"].map((key, idx) => {
                          if (key === null) return <div key={idx} />;
                          if (key === "del") {
                            return (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => setPin(pin.slice(0, -1))}
                                className="h-12 rounded-xl bg-slate-100 text-sm font-medium hover:bg-slate-200 active:bg-slate-300 transition-colors"
                              >
                                ←
                              </button>
                            );
                          }
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => pin.length < 6 && setPin(pin + key)}
                              className="h-12 rounded-xl bg-white border border-slate-200 text-lg font-semibold hover:bg-accent hover:border-primary/30 active:bg-accent transition-colors"
                            >
                              {key}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {error && (
                    <p className="text-sm text-red-500 text-center font-medium animate-wiggle">{error}</p>
                  )}
                  <Button type="submit" className="w-full h-12 text-base" disabled={loading || !childId || !pin}>
                    {loading ? "Signing in..." : "Let's go! 🚀"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="parent">
                <form onSubmit={handleParentLogin} className="space-y-4 mt-5">
                  <div className="space-y-1.5">
                    <Label htmlFor="email">Username</Label>
                    <Input
                      id="email"
                      type="text"
                      placeholder="admin"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  {error && (
                    <p className="text-sm text-red-500 text-center font-medium">{error}</p>
                  )}
                  <Button type="submit" className="w-full h-11" disabled={loading}>
                    {loading ? "Signing in..." : "Sign in"}
                  </Button>
                  <p className="text-center text-sm text-muted-foreground">
                    No account?{" "}
                    <Link href="/register" className="text-primary font-medium hover:underline">
                      Register
                    </Link>
                  </p>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
