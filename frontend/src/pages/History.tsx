import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { Search, Calendar, ChevronDown, ChevronRight, Filter, Loader2, X } from "lucide-react";
import api from "@/lib/api";
import { useAuthStore } from "@/lib/auth";

interface HistoryItem {
  session_uuid: string;
  title: string;
  started_at: string;
  ended_at: string | null;
  scenario_title: string | null;
  rounds: number;
  duration: number | null;
}

function formatDuration(seconds: number | null): string {
  if (seconds === null) return "–";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function formatDate(isoStr: string): { date: string; weekday: string } {
  const d = new Date(isoStr);
  const month = (d.getMonth() + 1).toString().padStart(2, "0");
  const day = d.getDate().toString().padStart(2, "0");
  const weekdays = ["週日", "週一", "週二", "週三", "週四", "週五", "週六"];
  return { date: `${month}/${day}`, weekday: weekdays[d.getDay()] };
}

const SCENARIO_EMOJI: Record<string, string> = {
  "自我覺察": "📝",
  "社會覺察": "👥",
  "自我管理": "😤",
  "人際技巧": "🤝",
  "負責決策": "💭",
};

export default function History() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { setSessionUuid } = useAuthStore();
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(searchParams.get("scenario") ?? "");

  useEffect(() => {
    api.get("/history")
      .then((res) => setItems(res.data))
      .catch((err) => console.error("[History] load failed:", err))
      .finally(() => setLoading(false));
  }, []);

  const filtered = items.filter(
    (item) =>
      (item.scenario_title ?? item.title).includes(searchQuery) ||
      item.started_at.includes(searchQuery)
  );

  const handleItemClick = (item: HistoryItem) => {
    setSessionUuid(item.session_uuid);
    navigate("/feedback");
  };

  return (
    <AppLayout>
      <div className="p-8 md:p-12 max-w-5xl mx-auto flex flex-col gap-10 min-h-full animate-in fade-in duration-500">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pl-12 lg:pl-0">
          <div className="flex flex-col gap-1">
            <span className="font-heading text-[10px] font-bold tracking-[0.2em] text-primary uppercase">Activity Tracker</span>
            <h1 className="font-heading text-3xl font-bold text-[#3D3831] tracking-tight">練習歷史紀錄</h1>
          </div>
          <div className="flex items-center gap-3 h-12 px-4 border border-[#E5E2D9] bg-white rounded-xl shadow-sm w-full md:w-[320px] focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all group">
            <Search className="w-4 h-4 text-[#A09C94] group-focus-within:text-primary transition-colors" />
            <input
              type="text"
              placeholder="搜尋情境、日期或關鍵字..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (e.target.value) {
                  setSearchParams({ scenario: e.target.value });
                } else {
                  setSearchParams({});
                }
              }}
              className="flex-1 text-sm bg-transparent outline-none placeholder:text-[#A09C94] text-[#3D3831] font-medium"
            />
            {searchQuery && (
              <button
                onClick={() => { setSearchQuery(""); setSearchParams({}); }}
                className="w-5 h-5 rounded-full bg-[#A09C94]/20 hover:bg-[#A09C94]/40 flex items-center justify-center transition-colors"
              >
                <X className="w-3 h-3 text-[#706C61]" />
              </button>
            )}
          </div>
        </div>

        {/* Filter row */}
        <div className="flex flex-wrap items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-[#E5E2D9] rounded-lg text-[13px] font-bold text-[#706C61] hover:border-primary hover:text-primary transition-all shadow-sm group">
            <Calendar className="w-4 h-4 text-[#A09C94] group-hover:text-primary" />
            最近 30 天
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-[#E5E2D9] rounded-lg text-[13px] font-bold text-[#706C61] hover:border-primary hover:text-primary transition-all shadow-sm group">
            <Filter className="w-4 h-4 text-[#A09C94] group-hover:text-primary" />
            所有情緒類型
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          {searchParams.get("scenario") && (
            <button
              onClick={() => { setSearchQuery(""); setSearchParams({}); }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-lg text-[12px] font-bold text-primary hover:bg-primary/20 transition-all"
            >
              <X className="w-3 h-3" />
              清除篩選：{searchParams.get("scenario")}
            </button>
          )}
          <div className="flex-1 min-w-[20px]" />
          <span className="text-[12px] font-bold text-[#A09C94] uppercase tracking-wider">
            Found {filtered.length} Sessions
          </span>
        </div>

        {/* History list */}
        <div className="flex flex-col gap-4">
          {loading ? (
            <div className="py-24 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-[#A09C94] animate-spin" />
            </div>
          ) : filtered.map((item) => {
            const { date, weekday } = formatDate(item.started_at);
            const title = item.scenario_title ?? item.title;
            const emoji = SCENARIO_EMOJI["自我覺察"];
            return (
              <button
                key={item.session_uuid}
                onClick={() => handleItemClick(item)}
                className="flex items-center gap-6 px-8 py-5 bg-white border border-[#E5E2D9] rounded-2xl shadow-sm hover:shadow-xl hover:border-primary/30 hover:-translate-y-0.5 transition-all text-left w-full group"
              >
                {/* Date */}
                <div className="w-16 shrink-0 flex flex-col items-center py-1 border-r border-[#E5E2D9] pr-6">
                  <span className="font-heading text-base font-bold text-[#3D3831]">{date}</span>
                  <span className="text-[11px] font-bold text-[#A09C94] uppercase">{weekday}</span>
                </div>

                {/* Emoji */}
                <div className="w-14 h-14 bg-[#FAF9F6] rounded-xl flex items-center justify-center text-3xl group-hover:scale-110 transition-transform shadow-inner">
                  {emoji}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-heading text-lg font-bold text-[#3D3831] truncate group-hover:text-primary transition-colors">
                    {title}
                  </h3>
                  <p className="text-[13px] text-[#706C61] font-medium mt-1">
                    練習時長 <span className="text-[#3D3831]">{formatDuration(item.duration)}</span> · 回合數 <span className="text-[#3D3831]">{item.rounds}</span>
                  </p>
                </div>

                {/* Arrow */}
                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-transparent group-hover:bg-primary/10 transition-colors">
                  <ChevronRight className="w-5 h-5 text-[#A09C94] group-hover:text-primary transition-colors" />
                </div>
              </button>
            );
          })}

          {!loading && filtered.length === 0 && (
            <div className="py-24 text-center bg-white rounded-2xl border border-dashed border-[#E5E2D9] flex flex-col items-center gap-4">
              <div className="w-16 h-16 bg-[#FAF9F6] rounded-full flex items-center justify-center">
                <Search className="h-8 w-8 text-[#A09C94] opacity-40" />
              </div>
              <div className="flex flex-col gap-1">
                <p className="font-heading text-lg font-bold text-[#3D3831]">找不到相關紀錄</p>
                <p className="text-sm text-[#706C61] font-medium">換個關鍵字搜尋看看吧！</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
