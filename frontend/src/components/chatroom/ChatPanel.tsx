import { useState, useRef, useEffect } from "react";
import { Mic, MicOff, Send, Pause, Play, ClipboardCheck, Loader2 } from "lucide-react";
import { Room, RoomEvent, Track, DataPacket_Kind } from "livekit-client";
import api from "@/lib/api";

interface ChatMessage {
  role: "teacher" | "student";
  content: string;
}

// emotion log key → StudentEmotion（curious 對應到 thinking 圖片）
const EMOTION_LOG_MAP: Record<string, string> = {
  happy: "happy",
  sad: "sad",
  angry: "angry",
  surprised: "surprised",
  anxious: "anxious",
  frustrated: "frustrated",
  confident: "confident",
  curious: "thinking",
  neutral: "neutral",
};

interface ChatPanelProps {
  isPaused: boolean;
  onTogglePause: () => void;
  onEnd: () => void;
  onEmotionChange?: (emotion: string) => void;
  livekitToken: string | null;
  studentName?: string;
  sessionUuid?: string | null;
}

const LIVEKIT_URL = import.meta.env.VITE_LIVEKIT_URL ?? "ws://localhost:7880";

export default function ChatPanel({ isPaused, onTogglePause, onEnd, onEmotionChange, livekitToken, studentName = "學生", sessionUuid }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [streamingContent, setStreamingContent] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const roomRef = useRef<Room | null>(null);
  const audioElementsRef = useRef<HTMLAudioElement[]>([]);

  // Connect to LiveKit
  useEffect(() => {
    if (!livekitToken) return;

    const room = new Room();
    roomRef.current = room;

    // Handle remote audio tracks (student voice)
    room.on(RoomEvent.TrackSubscribed, (track, _publication, _participant) => {
      if (track.kind === Track.Kind.Audio) {
        const el = track.attach() as HTMLAudioElement;
        el.autoplay = true;
        document.body.appendChild(el);
        audioElementsRef.current.push(el);
      }
    });

    // Handle data messages from agent (transcripts)
    room.on(RoomEvent.DataReceived, (payload: Uint8Array, _participant, _kind) => {
      try {
        const msg = JSON.parse(new TextDecoder().decode(payload));
        if (msg.type === "agent_transcript_delta" && msg.delta) {
          setIsThinking(false);
          setStreamingContent((prev) => (prev ?? "") + msg.delta);
        } else if (msg.type === "agent_response" && msg.text) {
          // Finalize: append final message then clear streaming bubble
          setMessages((prev) => [...prev, { role: "student", content: msg.text }]);
          setStreamingContent(null);
          // Fetch latest emotion log to drive character illustration
          if (sessionUuid && onEmotionChange) {
            api.get(`/session/${sessionUuid}/emotion/latest`)
              .then((res) => {
                const mapped = EMOTION_LOG_MAP[res.data.emotion] ?? "neutral";
                onEmotionChange(mapped);
              })
              .catch(() => onEmotionChange("neutral"));
          } else if (onEmotionChange) {
            onEmotionChange("neutral");
          }
        } else if (msg.type === "user_transcription" && msg.text) {
          setMessages((prev) => [...prev, { role: "teacher", content: msg.text }]);
          setIsThinking(true);
        }
      } catch {
        // ignore malformed messages
      }
    });

    // Scan existing tracks (agent might already be in room)
    room.on(RoomEvent.ParticipantConnected, (participant) => {
      participant.trackPublications.forEach((pub) => {
        if (pub.track && pub.track.kind === Track.Kind.Audio) {
          const el = pub.track.attach() as HTMLAudioElement;
          el.autoplay = true;
          document.body.appendChild(el);
          audioElementsRef.current.push(el);
        }
      });
    });

    room.connect(LIVEKIT_URL, livekitToken, {
      autoSubscribe: true,
    }).then(() => {
      // Unlock audio context on connect
      room.startAudio();
    }).catch((err) => {
      console.error("[ChatPanel] LiveKit connect failed:", err);
    });

    return () => {
      room.disconnect();
      audioElementsRef.current.forEach((el) => {
        el.pause();
        el.remove();
      });
      audioElementsRef.current = [];
    };
  }, [livekitToken]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || isThinking || isPaused) return;

    setMessages((prev) => [...prev, { role: "teacher", content: text }]);
    setInputText("");
    setIsThinking(true);

    if (roomRef.current) {
      try {
        const payload = new TextEncoder().encode(
          JSON.stringify({ type: "teacher_text_input", text })
        );
        await roomRef.current.localParticipant.publishData(payload, { reliable: true });
      } catch (err) {
        console.error("[ChatPanel] Failed to send text:", err);
        setIsThinking(false);
      }
    } else {
      // No LiveKit connection — simulate response after delay
      setTimeout(() => {
        setIsThinking(false);
        setMessages((prev) => [
          ...prev,
          { role: "student", content: "（尚未連線，請確認後端服務是否啟動）" },
        ]);
      }, 2000);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const toggleRecording = async () => {
    if (!roomRef.current) return;
    if (isRecording) {
      // Stop publishing mic
      await roomRef.current.localParticipant.setMicrophoneEnabled(false);
      setIsRecording(false);
    } else {
      // Start publishing mic
      try {
        await roomRef.current.localParticipant.setMicrophoneEnabled(true);
        setIsRecording(true);
      } catch (err) {
        console.error("[ChatPanel] Mic enable failed:", err);
      }
    }
  };

  return (
    <div className="absolute bottom-0 left-0 right-0 flex flex-col z-30">
      {/* Chat messages - scrollable full history */}
      <div className="px-8 py-4">
        <div className="max-w-4xl mx-auto flex flex-col gap-2">
          <div className="max-h-[18vh] overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/30 [&::-webkit-scrollbar-thumb]:rounded-full">
            <div className="flex flex-col gap-4">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "teacher" ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-2 duration-300`}
            >
              {msg.role === "student" && (
                <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 mr-2.5 self-end shadow-sm border-2 border-white/60 bg-white/90">
                  <img
                    src={`/avatars/${studentName}.png`}
                    alt={studentName}
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                </div>
              )}
              <div className={`max-w-[65%] shadow-xl ${
                msg.role === "teacher"
                  ? "bg-primary/85 backdrop-blur-sm text-white px-4 py-2.5 rounded-2xl rounded-tr-sm text-[14px] font-medium leading-relaxed"
                  : ""
              }`}>
                {msg.role === "student" ? (
                  <div className="bg-[#3D3831]/80 backdrop-blur-md rounded-2xl rounded-bl-sm px-4 py-3 border border-white/10">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[11px] font-bold text-primary tracking-wide">{studentName}</span>
                      <div className="flex-1 h-px bg-white/10" />
                    </div>
                    <p className="text-[14px] font-medium leading-relaxed text-white/90">{msg.content}</p>
                  </div>
                ) : (
                  <p className="text-[14px]">{msg.content}</p>
                )}
              </div>
            </div>
          ))}
          {streamingContent !== null && (
            <div className="flex justify-start animate-in fade-in duration-200">
              <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 mr-2.5 self-end shadow-sm border-2 border-white/60 bg-white/90">
                <img
                  src={`/avatars/${studentName}.png`}
                  alt={studentName}
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              </div>
              <div className="max-w-[65%] shadow-xl">
                <div className="bg-[#3D3831]/80 backdrop-blur-md rounded-2xl rounded-bl-sm px-4 py-3 border border-white/10">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[11px] font-bold text-primary tracking-wide">{studentName}</span>
                    <div className="flex-1 h-px bg-white/10" />
                  </div>
                  <p className="text-[14px] font-medium leading-relaxed text-white/90">
                    {streamingContent}<span className="inline-block w-0.5 h-4 bg-white/50 ml-0.5 animate-pulse align-middle" />
                  </p>
                </div>
              </div>
            </div>
          )}
          {isThinking && streamingContent === null && (
            <div className="flex justify-start animate-in fade-in duration-300">
              <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 mr-2.5 self-end shadow-sm border-2 border-white/60 bg-white/90">
                <img
                  src={`/avatars/${studentName}.png`}
                  alt={studentName}
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              </div>
              <div className="shadow-xl">
                <div className="bg-[#3D3831]/80 backdrop-blur-md rounded-2xl rounded-bl-sm px-4 py-3 border border-white/10">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[11px] font-bold text-primary tracking-wide">{studentName}</span>
                    <div className="flex-1 h-px bg-white/10" />
                  </div>
                  <div className="flex gap-1.5 py-0.5">
                    <div className="w-2 h-2 bg-white/50 rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <div className="w-2 h-2 bg-white/50 rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <div className="w-2 h-2 bg-white/50 rounded-full animate-bounce" />
                  </div>
                </div>
              </div>
            </div>
          )}
              <div ref={bottomRef} />
            </div>
          </div>
        </div>
      </div>

      {/* Input bar */}
      <div className="px-8 py-5">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          {/* Text input - takes most space */}
          <div className="flex-1 flex items-center h-12 px-5 bg-white/80 backdrop-blur-md border border-white/50 rounded-full shadow-lg focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/30 transition-all">
            <input
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isRecording ? "正在聆聽您的聲音..." : "輸入文字回應..."}
              className="flex-1 text-[14px] bg-transparent outline-none placeholder:text-[#A09C94] text-[#3D3831] font-medium"
              disabled={isPaused || isRecording}
            />
          </div>

          {/* Right side controls */}
          <div className="flex items-center gap-2">
            {/* Mic button */}
            <button
              onClick={toggleRecording}
              disabled={isPaused}
              className={`relative w-12 h-12 rounded-full flex items-center justify-center shrink-0 shadow-lg transition-all active:scale-95 disabled:opacity-50 ${
                isRecording
                  ? "bg-destructive text-white"
                  : "bg-[#3D3831]/60 backdrop-blur-sm text-white hover:bg-[#3D3831]/80 hover:scale-105"
              }`}
            >
              {isRecording ? (
                <>
                  <span className="absolute inset-0 rounded-full bg-destructive animate-ping opacity-30" />
                  <span className="absolute w-16 h-16 rounded-full border-2 border-destructive animate-pulse opacity-20" />
                  <Mic className="w-5 h-5 relative z-10" />
                </>
              ) : (
                <MicOff className="w-5 h-5" />
              )}
            </button>

            {/* Send button */}
            <button
              onClick={handleSend}
              disabled={!inputText.trim() || isPaused}
              className="w-12 h-12 rounded-full flex items-center justify-center bg-white/80 backdrop-blur-sm border border-white/50 text-[#3D3831] hover:text-primary hover:scale-105 transition-all shadow-lg disabled:opacity-40 active:scale-95"
            >
              <Send className="w-5 h-5" />
            </button>

            {/* Pause button */}
            <button
              onClick={onTogglePause}
              className="w-12 h-12 rounded-full flex items-center justify-center bg-white/80 backdrop-blur-sm border border-white/50 text-[#706C61] hover:text-primary transition-all shadow-lg hover:scale-105 active:scale-95"
              title={isPaused ? "繼續練習" : "暫停練習"}
            >
              {isPaused ? <Play className="w-5 h-5 fill-current" /> : <Pause className="w-5 h-5" />}
            </button>

            {/* End button */}
            <button
              onClick={onEnd}
              className="h-12 px-5 rounded-full flex items-center gap-2 bg-white/80 backdrop-blur-sm border border-white/50 text-[#706C61] hover:text-destructive transition-all shadow-lg hover:scale-105 active:scale-95 shrink-0"
            >
              <ClipboardCheck className="w-5 h-5" />
              <span className="text-[13px] font-heading font-semibold">結束並分析</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
