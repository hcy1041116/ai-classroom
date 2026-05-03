import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import {
  Search,
  Bell,
  Heart,
  Activity,
  Users,
  MessageCircle,
  ShieldCheck,
  Play,
  BookOpen,
  ArrowRight
} from "lucide-react";
import { useAuthStore } from "@/lib/auth";

export default function Home() {
  const navigate = useNavigate();
  const storeUser = useAuthStore((s) => s.user);
  const displayName = storeUser
    ? `${storeUser.last_name ?? ""}${storeUser.first_name ?? storeUser.username}老師`
    : "老師";
  const user = { name: displayName };

  return (
    <AppLayout>
      <div className="flex flex-col min-h-full max-w-[1280px] mx-auto">
        {/* Welcome header */}
        <div className="px-6 md:px-12 pt-12 pb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            {/* Left */}
            <div className="animate-in fade-in slide-in-from-left-4 duration-500">
              <h1 className="font-heading text-3xl md:text-4xl font-bold text-[#3D3831] tracking-tight">
                早安，{user.name} 👋
              </h1>
              <p className="text-[15px] text-[#706C61] mt-2 font-medium">
                準備好開始今天的對話練習了嗎？
              </p>
            </div>
            {/* Right */}
            <div className="flex items-center gap-4 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="flex items-center gap-3 h-11 px-4 border border-[#E5E2D9] bg-white rounded-lg shadow-sm focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all group">
                <Search className="w-4 h-4 text-[#A09C94] group-focus-within:text-primary transition-colors" />
                <input
                  type="text"
                  placeholder="搜尋情境或資源..."
                  className="text-sm bg-transparent outline-none placeholder:text-[#A09C94] text-[#3D3831] w-48"
                />
              </div>
              <button className="relative w-11 h-11 border border-[#E5E2D9] bg-white flex items-center justify-center rounded-lg shadow-sm hover:bg-[#FAF9F6] transition-all hover:scale-105 active:scale-95 group">
                <Bell className="w-5 h-5 text-[#3D3831] group-hover:text-primary transition-colors" />
                <div className="absolute top-2.5 right-2.5 w-2 h-2 bg-primary rounded-full ring-2 ring-white" />
              </button>
            </div>
          </div>
        </div>

        {/* Hero section */}
        <div className="px-6 md:px-12 pb-12">
          <div className="bg-[#3D3831] rounded-2xl p-10 md:p-16 shadow-lg relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full -mr-32 -mt-32 blur-3xl" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-secondary/10 rounded-full -ml-24 -mb-24 blur-2xl" />

            <div className="relative z-10 flex flex-col gap-8">
              <div className="flex flex-col gap-4">
                <span className="font-heading text-[11px] font-bold tracking-[0.2em] text-primary uppercase">
                  PLATFORM VISION
                </span>
                <h2 className="font-heading text-3xl md:text-5xl font-bold text-[#FAF9F6] leading-[1.15] tracking-tight max-w-[800px]">
                  在安心的空間裡，練習溫柔而堅定的對話
                </h2>
                <p className="text-[17px] text-[#A09C94] leading-relaxed max-w-[700px] font-medium">
                  透過 Satir 薩提爾溝通模式與 SEL 社會情緒學習理論，我們為教師打造一個無壓力的 AI 對話練習場。在這裡，每一次的嘗試都是成長的養分。
                </p>
              </div>

              <div className="flex flex-wrap gap-x-16 gap-y-6 pt-4">
                <div className="flex flex-col gap-2">
                  <span className="font-heading text-4xl font-bold text-primary">500+</span>
                  <span className="font-heading text-xs font-bold tracking-[0.15em] text-[#706C61] uppercase">練習情境</span>
                </div>
                <div className="flex flex-col gap-2">
                  <span className="font-heading text-4xl font-bold text-secondary">2,400+</span>
                  <span className="font-heading text-xs font-bold tracking-[0.15em] text-[#706C61] uppercase">教師使用者</span>
                </div>
                <div className="flex flex-col gap-2">
                  <span className="font-heading text-4xl font-bold text-accent">96%</span>
                  <span className="font-heading text-xs font-bold tracking-[0.15em] text-[#706C61] uppercase">正向回饋率</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Core Concepts */}
        <div className="px-6 md:px-12 pb-16">
          <div className="flex flex-col gap-8">
            <div className="flex items-end justify-between">
              <div>
                <span className="font-heading text-[11px] font-bold tracking-[0.2em] text-primary uppercase">
                  CORE CONCEPTS
                </span>
                <h3 className="font-heading text-2xl font-bold text-[#3D3831] mt-2 tracking-tight">理論基礎與核心架構</h3>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Satir Model */}
              <div className="bg-white border border-[#E5E2D9] rounded-2xl p-8 shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-300 group">
                <div className="flex items-center gap-4 mb-5">
                  <div className="w-12 h-12 bg-secondary/15 flex items-center justify-center rounded-xl group-hover:bg-secondary/25 transition-colors">
                    <Activity className="w-6 h-6 text-secondary" />
                  </div>
                  <h4 className="font-heading text-xl font-bold text-[#3D3831]">薩提爾冰山理論</h4>
                </div>
                <p className="text-[15px] text-[#706C61] leading-relaxed font-medium">
                  我們不只看見行為，更看見感受。透過系統的回饋，學習覺察學生行為背後的感受、觀點與渴望，並練習一致性的溝通姿態。
                </p>
                <button className="mt-6 flex items-center gap-2 text-sm font-bold text-secondary hover:underline group/btn">
                  了解更多
                  <ArrowRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-1" />
                </button>
              </div>

              {/* SEL */}
              <div className="bg-white border border-[#E5E2D9] rounded-2xl p-8 shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-300 group">
                <div className="flex items-center gap-4 mb-5">
                  <div className="w-12 h-12 bg-primary/15 flex items-center justify-center rounded-xl group-hover:bg-primary/25 transition-colors">
                    <Heart className="w-6 h-6 text-primary" />
                  </div>
                  <h4 className="font-heading text-xl font-bold text-[#3D3831]">社會情緒學習 (SEL)</h4>
                </div>
                <p className="text-[15px] text-[#706C61] leading-relaxed font-medium">
                  基於 CASEL 架構，我們陪伴你引導學生發展五大核心能力：自我覺察、自我管理、社會覺察、人際技巧與負責任的決策。
                </p>
                <button className="mt-6 flex items-center gap-2 text-sm font-bold text-primary hover:underline group/btn">
                  查看架構
                  <ArrowRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-1" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Start CTA */}
        <div className="px-6 md:px-12 pb-20">
          <div className="bg-white border border-[#E5E2D9] rounded-2xl p-10 md:p-14 shadow-sm relative overflow-hidden">
            <div className="absolute inset-0 chalk-lines opacity-10 pointer-events-none" />

            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-12">
              <div className="flex flex-col gap-6 md:max-w-[60%] text-center md:text-left">
                <h3 className="font-heading text-3xl md:text-4xl font-bold text-[#3D3831] leading-tight tracking-tight">
                  準備好提升您的輔導技巧了嗎？
                </h3>
                <p className="text-[17px] text-[#706C61] font-medium">
                  點擊下方按鈕，立即進入虛擬教室與 AI 學生進行對話練習，並獲得即時的專業回饋。
                </p>
                <div className="flex flex-wrap justify-center md:justify-start gap-4 pt-2">
                  <button
                    onClick={() => navigate("/chatroom")}
                    className="h-14 px-8 bg-primary text-white font-heading font-bold rounded-lg shadow-lg hover:bg-[#C8694F] hover:shadow-primary/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-3"
                  >
                    <Play className="w-5 h-5 fill-current" />
                    進入練習空間
                  </button>
                  <button className="h-14 px-8 border-2 border-[#3D3831] text-[#3D3831] font-heading font-bold rounded-lg hover:bg-[#3D3831] hover:text-white transition-all flex items-center gap-3 group">
                    <BookOpen className="w-5 h-5 transition-transform group-hover:scale-110" />
                    瀏覽學習資源
                  </button>
                </div>
              </div>

              <div className="hidden md:flex flex-col gap-6 w-full md:w-[320px]">
                <div className="flex items-center gap-4 p-4 bg-[#FAF9F6] rounded-xl border border-[#E5E2D9]">
                  <div className="w-10 h-10 bg-accent/20 rounded-full flex items-center justify-center shrink-0">
                    <Users className="w-5 h-5 text-accent-foreground" />
                  </div>
                  <span className="text-sm font-bold text-[#3D3831]">1. 選擇情境</span>
                </div>
                <div className="flex items-center gap-4 p-4 bg-[#FAF9F6] rounded-xl border border-[#E5E2D9]">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                    <MessageCircle className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-sm font-bold text-[#3D3831]">2. 模擬互動</span>
                </div>
                <div className="flex items-center gap-4 p-4 bg-[#FAF9F6] rounded-xl border border-[#E5E2D9]">
                  <div className="w-10 h-10 bg-secondary/10 rounded-full flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-5 h-5 text-secondary" />
                  </div>
                  <span className="text-sm font-bold text-[#3D3831]">3. 專業回饋</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-auto px-6 md:px-12 py-10 bg-[#3D3831] text-white/60">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 max-w-[1280px] mx-auto">
            <div className="flex items-center gap-3">
              <img src="/img/logo/SELf_corner_Logo_transparent.png" alt="SELf-corner" className="w-10 h-10 rounded-sm object-contain" />
            </div>
            <div className="flex gap-8 text-[11px] font-bold uppercase tracking-widest">
              <span className="hover:text-primary cursor-pointer transition-colors">使用教學</span>
              <span className="hover:text-primary cursor-pointer transition-colors">隱私政策</span>
              <span className="text-primary hover:underline cursor-pointer">意見回饋</span>
            </div>
            <span className="text-[11px] font-medium tracking-wide">© 2026 SELf-corner. 您的心理與教學避風港。</span>
          </div>
        </footer>
      </div>
    </AppLayout>
  );
}
