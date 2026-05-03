import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { CheckSquare, Search, Target, Lightbulb, MessageCircle, Sparkles, ArrowRight, Loader2 } from "lucide-react";

interface TranscriptEntry {
  speaker: string;
  text: string;
  timestamp: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface FeedbackTabsProps {
  highlights: string;
  blindSpots: string;
  actionTips: string;
  transcript: TranscriptEntry[];
  userInput: string;
  onUserInputChange: (v: string) => void;
  chatHistory: ChatMessage[];
  onSendCoach: () => void;
  isSending: boolean;
}

export default function FeedbackTabs({
  highlights,
  blindSpots,
  actionTips,
  transcript,
  userInput,
  onUserInputChange,
  chatHistory,
  onSendCoach,
  isSending,
}: FeedbackTabsProps) {
  return (
    <Tabs defaultValue="expert" className="flex flex-col flex-1 min-h-0">
      <div className="px-0 pt-0 pb-0 border-b border-[#E5E2D9] bg-[#FAF9F6]/30 shrink-0">
        <TabsList className="bg-transparent p-0 h-auto gap-0 rounded-none">
          <TabsTrigger
            value="expert"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-5 pb-3 pt-1 font-heading font-bold text-sm text-muted-foreground data-[state=active]:text-foreground flex items-center gap-2"
          >
            <Lightbulb className="w-4 h-4" />
            教練建議
          </TabsTrigger>
          <TabsTrigger
            value="transcript"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-5 pb-3 pt-1 font-heading font-bold text-sm text-muted-foreground data-[state=active]:text-foreground flex items-center gap-2"
          >
            <MessageCircle className="w-4 h-4" />
            對話逐字稿
          </TabsTrigger>
        </TabsList>
      </div>

      {/* Tab 1: Expert Suggestions + AI Coach */}
      <TabsContent value="expert" className="flex flex-col gap-6 flex-1 min-h-0 mt-4">
        {/* Feedback text */}
        <div className="bg-white border border-[#E5E2D9] rounded-2xl shadow-sm p-8 flex flex-col gap-6">
          <ScrollArea className="h-[260px] pr-4">
            <div className="space-y-6">
              {/* 對話亮點 */}
              <div className="space-y-3">
                <h3 className="flex items-center gap-2 font-heading text-base font-bold text-secondary">
                  <CheckSquare className="w-4 h-4" /> 對話亮點
                </h3>
                <p className="text-sm text-[#706C61] leading-relaxed whitespace-pre-line">{highlights}</p>
              </div>

              {/* 盲點發現 */}
              <div className="space-y-3">
                <h3 className="flex items-center gap-2 font-heading text-base font-bold text-primary">
                  <Search className="w-4 h-4" /> 盲點發現
                </h3>
                <p className="text-sm text-[#706C61] leading-relaxed whitespace-pre-line">{blindSpots}</p>
              </div>

              {/* 行動建議 */}
              {actionTips && (
                <div className="space-y-3">
                  <h3 className="flex items-center gap-2 font-heading text-base font-bold" style={{ color: "#81B29A" }}>
                    <Target className="w-4 h-4" /> 行動建議
                  </h3>
                  <p className="text-sm text-[#706C61] leading-relaxed whitespace-pre-line">{actionTips}</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* AI Coach */}
        <div className="bg-[#3D3831] rounded-2xl shadow-xl p-8 flex flex-col gap-6 relative overflow-hidden flex-1">
          <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/10 rounded-full blur-3xl -mr-16 -mt-16" />
          <div className="flex items-center gap-3 relative z-10">
            <div className="w-10 h-10 bg-secondary rounded-xl flex items-center justify-center shadow-lg">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <h2 className="font-heading text-lg font-bold text-white tracking-wide">與 AI 教練對話</h2>
          </div>

          <div className="max-h-[240px] overflow-y-auto relative z-10">
            <div className="flex flex-col gap-4">
              {chatHistory.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[90%] px-5 py-4 text-sm leading-relaxed rounded-[18px] font-medium ${msg.role === "user"
                    ? "bg-primary/80 text-white rounded-tr-none"
                    : "bg-white/10 border border-white/10 text-white/90 rounded-tl-none"
                    }`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {isSending && (
                <div className="flex justify-start">
                  <div className="bg-white/10 border border-white/10 px-5 py-3 rounded-[18px] rounded-tl-none">
                    <div className="flex gap-1.5">
                      <div className="w-2 h-2 bg-white/50 rounded-full animate-bounce [animation-delay:-0.3s]" />
                      <div className="w-2 h-2 bg-white/50 rounded-full animate-bounce [animation-delay:-0.15s]" />
                      <div className="w-2 h-2 bg-white/50 rounded-full animate-bounce" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="relative z-10 flex flex-col gap-3">
            <Textarea
              placeholder="詢問教練建議：例如『如何更好地處理學生的抵觸情緒？』"
              value={userInput}
              onChange={(e) => onUserInputChange(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSendCoach(); } }}
              className="min-h-[100px] resize-none text-[15px] border-white/10 bg-white/5 text-white placeholder:text-white/30 rounded-xl focus:ring-secondary/50 focus:border-secondary transition-all"
            />
            <button
              onClick={onSendCoach}
              disabled={isSending || !userInput.trim()}
              className="h-12 w-full bg-secondary text-white font-heading font-bold text-sm tracking-widest rounded-xl hover:bg-[#6FA088] hover:shadow-lg hover:shadow-secondary/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
              發送諮詢訊息
            </button>
          </div>
        </div>
      </TabsContent>

      {/* Tab 2: Transcript */}
      <TabsContent value="transcript" className="mt-4">
        <div className="bg-white border border-[#E5E2D9] rounded-2xl shadow-sm flex flex-col overflow-hidden">
          <div className="flex items-center px-8 py-5 border-b border-[#E5E2D9] bg-[#FAF9F6]/50 shrink-0">
            <div className="flex items-center gap-3">
              <MessageCircle className="w-5 h-5 text-primary" />
              <h2 className="font-heading text-lg font-bold text-[#3D3831]">對話逐字稿回顧</h2>
            </div>
          </div>
          <div className="max-h-[820px] overflow-y-auto px-8 py-8">
            <div className="space-y-6">
              {transcript.map((entry, index) => (
                <div
                  key={index}
                  className={`flex flex-col ${entry.speaker === "teacher" ? "items-end" : "items-start"} animate-in fade-in slide-in-from-bottom-2 duration-500`}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div
                    className={`max-w-[80%] px-5 py-4 shadow-sm border ${entry.speaker === "teacher"
                      ? "bg-primary text-white border-primary/10 rounded-[20px] rounded-tr-none"
                      : "bg-white border-[#E5E2D9] text-[#3D3831] rounded-[20px] rounded-tl-none font-medium"
                      }`}
                  >
                    <span className="text-[9px] font-bold uppercase tracking-[0.2em] mb-2 block opacity-60">
                      {entry.speaker === "teacher" ? "Teacher" : "Student"}
                    </span>
                    <p className="text-[15px] leading-relaxed">{entry.text}</p>
                  </div>
                </div>
              ))}
              {transcript.length === 0 && (
                <div className="py-16 text-center text-[#A09C94] font-medium">
                  暫無對話紀錄
                </div>
              )}
            </div>
          </div>
        </div>
      </TabsContent>
    </Tabs>
  );
}
