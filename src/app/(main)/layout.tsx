import { Sidebar } from "@/components/sidebar";
import { MobileNav } from "@/components/mobile-nav";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen theme-bg-subtle">
      <Sidebar />
      <MobileNav />
      <main className="pl-12 md:pl-64 pb-8">
        <div className="max-w-5xl mx-auto px-4 py-4 md:px-8 md:py-6">{children}</div>
      </main>
    </div>
  );
}
