import { useNavigate, useLocation } from "react-router-dom";
import {
  House,
  MessageCircle,
  Clock3,
  User,
  LogOut,
  ChevronRight,
  Pause,
  ClipboardCheck,
} from "lucide-react";
import { useAuthStore } from "@/lib/auth";
import api from "@/lib/api";

const navItems = [
  { label: "首頁 Home", icon: House, path: "/home" },
  { label: "對話練習", icon: MessageCircle, path: "/chatroom" },
  { label: "歷史紀錄", icon: Clock3, path: "/history" },
  { label: "個人帳號", icon: User, path: "/info" },
];

// Session nav items shown during active practice
const sessionNavItems = [
  { label: "對話", icon: MessageCircle, id: "chat" },
];

interface SidebarProps {
  onNavigate?: () => void;
  sessionInfo?: {
    scenarioTitle: string;
    formattedTime: string;
    isPaused: boolean;
    onTogglePause: () => void;
    onEnd: () => void;
  };
}

export default function Sidebar({ onNavigate, sessionInfo }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, clearUser } = useAuthStore();

  const displayName = user
    ? `${user.last_name ?? ""}${user.first_name ?? user.username}`
    : "使用者";
  const initial = displayName.charAt(0).toUpperCase();
  const email = user?.email ?? "";

  const handleNav = (path: string) => {
    navigate(path);
    onNavigate?.();
  };

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // ignore errors
    }
    clearUser();
    navigate("/login");
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="flex flex-col h-full w-[260px] bg-[#1E1D1B] text-[#FAF9F6] py-8 px-0 border-r border-white/5">
      {/* Brand area */}
      <div className="flex items-center gap-3 px-6 mb-12">
        <img src="/img/logo/SELf_corner_Logo_transparent.png" alt="SELf-corner" className="w-50 h-50 rounded-sm shadow-sm object-contain" />
      </div>

      {/* Session Info - shown during active practice */}
      {sessionInfo && (
        <div className="px-6 mb-8">
          <span className="font-heading text-[10px] font-bold tracking-[0.2em] text-primary uppercase">
            CURRENT SESSION
          </span>
          <h3 className="font-heading text-sm font-bold text-[#FAF9F6] mt-2 leading-snug">
            {sessionInfo.scenarioTitle}
          </h3>
          <span className="font-heading text-3xl font-bold text-[#FAF9F6] mt-3 block tabular-nums tracking-wider">
            {sessionInfo.formattedTime}
          </span>
        </div>
      )}

      {/* Nav section */}
      {sessionInfo ? (
        <>
          <div className="px-6 mb-4">
            <span className="font-heading text-[10px] font-bold tracking-[0.2em] text-[#706C61]">
              SESSION
            </span>
          </div>
          <nav className="flex flex-col gap-1.5 px-3">
            {sessionNavItems.map((item) => {
              const active = item.id === "chat";
              return (
                <button
                  key={item.id}
                  className={`flex items-center gap-3 px-4 py-3 text-[13px] font-heading font-semibold transition-all rounded-sm group relative ${active
                    ? "bg-primary/15 text-primary"
                    : "text-[#A09C94] hover:text-[#FAF9F6] hover:bg-white/5"
                    }`}
                >
                  {active && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full" />
                  )}
                  <item.icon className={`w-5 h-5 shrink-0 transition-colors ${active ? "text-primary" : "group-hover:text-[#FAF9F6]"}`} />
                  <span className="flex-1 text-left">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </>
      ) : (
        <>
          <div className="px-6 mb-4">
            <span className="font-heading text-[10px] font-bold tracking-[0.2em] text-[#706C61]">
              MAIN NAVIGATION
            </span>
          </div>
          <nav className="flex flex-col gap-1.5 px-3">
            {navItems.map((item) => {
              const active = isActive(item.path);
              return (
                <button
                  key={item.path}
                  onClick={() => handleNav(item.path)}
                  className={`flex items-center gap-3 px-4 py-3 text-[13px] font-heading font-semibold transition-all rounded-sm group relative ${active
                    ? "bg-primary/15 text-primary"
                    : "text-[#A09C94] hover:text-[#FAF9F6] hover:bg-white/5"
                    }`}
                >
                  {active && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full" />
                  )}
                  <item.icon className={`w-5 h-5 shrink-0 transition-colors ${active ? "text-primary" : "group-hover:text-[#FAF9F6]"}`} />
                  <span className="flex-1 text-left">{item.label}</span>
                  {active && <ChevronRight className="w-4 h-4 text-primary/50" />}
                </button>
              );
            })}
          </nav>
        </>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Session controls or Logout */}
      {sessionInfo ? (
        <div className="px-3 mb-6 flex flex-col gap-1.5">
          <button
            onClick={sessionInfo.onTogglePause}
            className="flex items-center gap-3 w-full px-4 py-3 text-[13px] font-heading font-semibold text-[#A09C94] hover:text-[#FAF9F6] hover:bg-white/5 transition-all rounded-sm group"
          >
            <Pause className="w-5 h-5 shrink-0 group-hover:text-[#FAF9F6] transition-colors" />
            <span>{sessionInfo.isPaused ? "繼續練習" : "暫停練習"}</span>
          </button>
          <button
            onClick={sessionInfo.onEnd}
            className="flex items-center gap-3 w-full px-4 py-3 text-[13px] font-heading font-semibold text-primary hover:text-primary hover:bg-primary/10 transition-all rounded-sm group"
          >
            <ClipboardCheck className="w-5 h-5 shrink-0 text-primary transition-colors" />
            <span>結束對話並分析</span>
          </button>
        </div>
      ) : (
        <div className="px-3 mb-6">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-3 text-[13px] font-heading font-semibold text-[#A09C94] hover:text-[#FAF9F6] hover:bg-white/5 transition-all rounded-sm group"
          >
            <LogOut className="w-5 h-5 shrink-0 group-hover:text-destructive transition-colors" />
            <span>登出系統</span>
          </button>
        </div>
      )}

      {/* User profile info */}
      <div className="px-6 pt-6 border-t border-white/5">
        <div className="flex items-center gap-3 group cursor-pointer" onClick={() => handleNav("/info")}>
          <div className="w-10 h-10 rounded-full bg-[#3D3831] border border-white/10 flex items-center justify-center shrink-0 transition-transform group-hover:scale-105">
            <span className="font-heading text-sm font-bold text-primary">
              {initial}
            </span>
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-heading text-[13px] font-bold truncate group-hover:text-primary transition-colors">
              {displayName}
            </span>
            <span className="text-[11px] text-[#706C61] truncate">
              {email || "教育訓練模式"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
