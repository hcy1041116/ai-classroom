import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import Sidebar from "./Sidebar";

interface AppLayoutProps {
  children: React.ReactNode;
  sessionInfo?: {
    scenarioTitle: string;
    formattedTime: string;
    isPaused: boolean;
    onTogglePause: () => void;
    onEnd: () => void;
  };
}

export default function AppLayout({ children, sessionInfo }: AppLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#FAF9F6]">
      {/* Desktop sidebar */}
      <aside className="hidden lg:block shrink-0 h-full border-r border-black/5">
        <Sidebar sessionInfo={sessionInfo} />
      </aside>

      {/* Mobile drawer */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <div className="lg:hidden fixed top-6 left-6 z-40">
          <SheetTrigger asChild>
            <button className="w-11 h-11 flex items-center justify-center rounded-xl bg-[#1E1D1B] text-white shadow-lg hover:bg-[#3D3831] transition-all">
              <Menu className="w-5 h-5" />
            </button>
          </SheetTrigger>
        </div>
        <SheetContent side="left" className="p-0 w-[260px] bg-[#1E1D1B] border-none">
          <Sidebar onNavigate={() => setMobileOpen(false)} sessionInfo={sessionInfo} />
        </SheetContent>
      </Sheet>

      {/* Main content area */}
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto relative scroll-smooth bg-[#FAF9F6]">
        <div className="absolute inset-0 chalk-dots pointer-events-none opacity-[0.03]" />
        <div className="relative flex-1 flex flex-col min-h-full">
          {children}
        </div>
      </main>
    </div>
  );
}
