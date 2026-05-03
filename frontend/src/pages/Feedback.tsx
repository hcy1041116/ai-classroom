import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Radar as RechartRadar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  Tooltip,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts";
import { RefreshCw, Share2, Activity, PlusCircle, Loader2 } from "lucide-react";
import FeedbackTabs from "@/components/feedback/FeedbackTabs";
import AppLayout from "@/components/AppLayout";
import { Badge } from "@/components/ui/badge";
import api from "@/lib/api";
import { useAuthStore } from "@/lib/auth";

interface TranscriptEntry {
  speaker: string;
  text: string;
  timestamp: string;
}

interface EmotionLogEntry {
  turn_number: number;
  happy: number;
  sad: number;
  angry: number;
  surprised: number;
  anxious: number;
  frustrated: number;
  confident: number;
  curious: number;
  neutral: number;
}

interface FeedbackReport {
  session_uuid: string;
  scenario_title: string | null;
  sel_scores: Record<string, number>;
  highlights: string;
  blind_spots: string;
  action_tips: string | null;
  selected_kist_cards?: string[] | null;
  transcript: TranscriptEntry[];
  emotion_logs: EmotionLogEntry[];
  generated_at: string | null;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

// Emotion line colors for the 9 emotions
const EMOTION_COLORS: Record<string, string> = {
  happy: "#F59E0B",
  sad: "#6366F1",
  angry: "#EF4444",
  surprised: "#8B5CF6",
  anxious: "#F97316",
  frustrated: "#DC2626",
  confident: "#10B981",
  curious: "#3B82F6",
  neutral: "#9CA3AF",
};

const EMOTION_LABELS: Record<string, string> = {
  happy: "開心",
  sad: "悲傷",
  angry: "憤怒",
  surprised: "驚訝",
  anxious: "焦慮",
  frustrated: "挫折",
  confident: "自信",
  curious: "好奇",
  neutral: "中性",
};

const SEL_LABELS: Record<string, string> = {
  self_awareness: "自我覺察",
  self_management: "自我管理",
  social_awareness: "社會覺察",
  relationship_skills: "人際技巧",
  responsible_decision: "負責決策",
};

export default function Feedback() {
  const navigate = useNavigate();
  const location = useLocation();
  const { sessionUuid } = useAuthStore();

  const [report, setReport] = useState<FeedbackReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userInput, setUserInput] = useState("");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    setReport(null);
    setError(null);
    setLoading(true);
    setChatHistory([
      {
        role: "assistant",
        content: "老師辛苦了！這是一場不容易的對話。關於剛剛的分析報告，或是針對學生的情況，您有任何想進一步討論的嗎？",
      },
    ]);
    if (!sessionUuid) {
      setError("找不到練習 Session，請先進行一次練習");
      setLoading(false);
      return;
    }
    api.get(`/report/${sessionUuid}/feedback`)
      .then((res) => {
        setReport(res.data);
      })
      .catch((err) => {
        setError(err.response?.data?.detail ?? "載入報告失敗，請稍後再試");
      })
      .finally(() => setLoading(false));
  }, [sessionUuid]);

  const handleRetry = () => {
    const scenarioId = location.state?.currentScenarioId;
    navigate("/chatroom", { state: { retryScenarioId: scenarioId } });
  };

  const handleSendCoach = async () => {
    if (!userInput.trim() || isSending || !sessionUuid) return;
    const message = userInput.trim();
    setUserInput("");
    setIsSending(true);
    const newHistory: ChatMessage[] = [...chatHistory, { role: "user", content: message }];
    setChatHistory(newHistory);
    try {
      const res = await api.post(`/report/${sessionUuid}/chat`, {
        message,
        history: chatHistory,
      });
      setChatHistory([...newHistory, { role: "assistant", content: res.data.reply }]);
    } catch {
      setChatHistory([...newHistory, { role: "assistant", content: "（回應失敗，請稍後再試）" }]);
    } finally {
      setIsSending(false);
    }
  };

  // Build radar data from sel_scores
  const radarData = report
    ? Object.entries(report.sel_scores).map(([key, value]) => ({
      subject: SEL_LABELS[key] ?? key,
      value: typeof value === "number" ? value * 10 : value,
    }))
    : [];

  // Build emotion flow data from emotion_logs
  const emotionChartData = (report?.emotion_logs ?? []).map((log) => ({
    turn: `T${log.turn_number}`,
    happy: Math.round(log.happy * 100),
    sad: Math.round(log.sad * 100),
    angry: Math.round(log.angry * 100),
    surprised: Math.round(log.surprised * 100),
    anxious: Math.round(log.anxious * 100),
    frustrated: Math.round(log.frustrated * 100),
    confident: Math.round(log.confident * 100),
    curious: Math.round(log.curious * 100),
    neutral: Math.round(log.neutral * 100),
  }));

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center h-full gap-4">
          <p className="text-[#706C61] font-medium">{error}</p>
          <button
            onClick={() => navigate("/chatroom")}
            className="h-11 px-6 bg-primary text-white rounded-xl font-heading font-bold"
          >
            開始練習
          </button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-8 md:p-12 max-w-7xl mx-auto flex flex-col gap-10 min-h-full animate-in fade-in duration-500">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 pl-12 lg:pl-0">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Badge className="bg-[#81B29A15] text-[#81B29A] border-[#81B29A30] font-heading font-bold text-[10px] tracking-widest uppercase">Session Completed</Badge>
              <span className="text-[11px] font-bold text-[#A09C94] uppercase tracking-wider">
                {report?.generated_at ? new Date(report.generated_at).toLocaleString("zh-TW") : ""}
              </span>
            </div>
            <h1 className="font-heading text-3xl font-bold text-[#3D3831] tracking-tight mt-2">教練回饋與深度分析</h1>
            {report?.scenario_title && (
              <p className="text-[15px] text-[#706C61] font-medium">情境：{report.scenario_title}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleRetry}
              className="h-11 px-6 border-2 border-[#E5E2D9] rounded-xl font-heading text-sm font-bold text-[#3D3831] hover:bg-white hover:border-[#3D3831] transition-all flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              重試一次
            </button>
            <button
              onClick={() => navigate("/chatroom")}
              className="h-11 px-6 border-2 border-primary/30 rounded-xl font-heading text-sm font-bold text-primary hover:bg-primary/5 transition-all flex items-center gap-2"
            >
              <PlusCircle className="w-4 h-4" />
              練新情境
            </button>
            <button className="h-11 px-6 bg-primary text-white rounded-xl font-heading text-sm font-bold shadow-lg shadow-primary/20 hover:bg-[#C8694F] transition-all flex items-center gap-2">
              <Share2 className="w-4 h-4" />
              分享練習
            </button>
          </div>
        </div>

        {/* Main Dashboard */}
        <div className="flex flex-col lg:flex-row gap-8 flex-1">
          {/* Left: Metrics & Charts */}
          <div className="lg:w-[440px] shrink-0 flex flex-col gap-8">
            {/* Radar Card */}
            <div className="bg-white border border-[#E5E2D9] rounded-2xl shadow-sm p-8 flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <h2 className="font-heading text-lg font-bold text-[#3D3831]">SEL 指標分佈</h2>
              </div>
              <div className="h-[300px] bg-[#FAF9F6] rounded-xl flex items-center justify-center overflow-hidden border border-[#E5E2D9]/50">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData} margin={{ top: 30, right: 40, bottom: 30, left: 40 }}>
                    <PolarGrid stroke="#E5E2D9" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: "#706C61", fontSize: 11, fontWeight: 600 }} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }} />
                    <RechartRadar name="本次表現" dataKey="value" stroke="#E07A5F" strokeWidth={3} fill="#E07A5F" fillOpacity={0.2} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Emotion Flow Card */}
            <div className="bg-white border border-[#E5E2D9] rounded-2xl shadow-sm p-8 flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-primary" />
                  <h2 className="font-heading text-lg font-bold text-[#3D3831]">學生情緒流動</h2>
                </div>
              </div>
              {emotionChartData.length > 0 ? (
                <div className="h-[280px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={emotionChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E2D9" />
                      <XAxis
                        dataKey="turn"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#A09C94', fontSize: 10, fontWeight: 600 }}
                      />
                      <YAxis
                        domain={[0, 100]}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#706C61', fontSize: 10, fontWeight: 600 }}
                        tickFormatter={(v) => `${v}%`}
                      />
                      <Tooltip
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', fontSize: 12 }}
                        formatter={(value: number, name: string) => [`${value}%`, EMOTION_LABELS[name] ?? name]}
                      />
                      <Legend
                        formatter={(value) => EMOTION_LABELS[value] ?? value}
                        wrapperStyle={{ fontSize: 10, paddingTop: 8 }}
                      />
                      {Object.keys(EMOTION_COLORS).map((key) => (
                        <Line
                          key={key}
                          type="monotone"
                          dataKey={key}
                          stroke={EMOTION_COLORS[key]}
                          strokeWidth={2}
                          dot={false}
                          activeDot={{ r: 4 }}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-[#A09C94] text-sm font-medium">
                  本次練習未記錄情緒資料
                </div>
              )}
            </div>

          </div>

          {/* Right: Tabs (Expert Suggestions + Transcript) */}
          <div className="flex-1 flex flex-col min-w-0">
            <FeedbackTabs
              highlights={report?.highlights ?? ""}
              blindSpots={report?.blind_spots ?? ""}
              actionTips={report?.action_tips ?? ""}
              transcript={report?.transcript ?? []}
              userInput={userInput}
              onUserInputChange={setUserInput}
              chatHistory={chatHistory}
              onSendCoach={handleSendCoach}
              isSending={isSending}
            />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
