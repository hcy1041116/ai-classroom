import { Button } from "@/components/ui/button";
import { X, ChevronLeft } from "lucide-react";

const AGE_GROUPS = [
  "國小低年級",
  "中年級",
  "高年級",
  "國中"
];

interface AgeGroupSelectionProps {
  onClose: () => void;
  onBack: () => void;
  onStart: (ageGroup: string) => void;
}

export default function AgeGroupSelection({ 
  onClose, 
  onBack, 
  onStart 
}: AgeGroupSelectionProps) {
  return (
    <div
      className="absolute inset-0 z-40 flex items-center justify-center bg-background/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl mx-4 bg-card border border-border rounded-xl shadow-2xl p-8 animate-in zoom-in-95 fade-in duration-300"
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
          <h3 className="text-2xl font-bold text-foreground">選擇學生學齡</h3>
          <p className="text-muted-foreground text-sm">
            學齡將影響學生的口吻與表達能力。
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {AGE_GROUPS.map((group) => (
            <button
              key={group}
              onClick={() => onStart(group)}
              className="flex items-center justify-center p-6 rounded-xl border border-border bg-white hover:border-primary hover:bg-primary/5 hover:shadow-md transition-all group"
            >
              <span className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                {group}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
