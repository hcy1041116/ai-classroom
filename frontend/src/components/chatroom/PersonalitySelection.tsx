import { Button } from "@/components/ui/button";
import { X, ChevronLeft } from "lucide-react";

interface Personality {
  id: number;
  name: string;
  personality_type: string;
}

interface PersonalitySelectionProps {
  personalities: Personality[];
  onClose: () => void;
  onBack: () => void;
  onNext: (personalityId: number) => void;
}

export default function PersonalitySelection({ 
  personalities, 
  onClose, 
  onBack, 
  onNext 
}: PersonalitySelectionProps) {
  return (
    <div
      className="absolute inset-0 z-30 flex items-center justify-center bg-background/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl mx-4 bg-card border border-border rounded-xl shadow-2xl p-8 animate-in zoom-in-95 fade-in duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onBack}
          className="absolute top-4 left-4 rounded-sm opacity-70 hover:opacity-100 transition-opacity flex items-center gap-1 text-sm font-medium"
        >
          <ChevronLeft className="h-5 w-5" />
          上一步
        </button>

        <button
          onClick={onClose}
          className="absolute top-4 right-4 rounded-sm opacity-70 hover:opacity-100 transition-opacity"
        >
          <X className="h-5 w-5 text-foreground" />
        </button>

        <div className="text-center space-y-4 mb-8">
          <h3 className="text-2xl font-bold text-foreground">選擇學生特質</h3>
          <p className="text-muted-foreground text-sm">
            挑選一個特定的性格類型，這將影響 AI 學生的對話反應。
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {personalities.map((p) => (
            <button
              key={p.id}
              onClick={() => onNext(p.id)}
              className="flex flex-col items-center justify-center p-4 rounded-xl border border-border bg-white hover:border-primary hover:bg-primary/5 hover:shadow-md transition-all group"
            >
              <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors text-center break-words">
                {p.personality_type}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
