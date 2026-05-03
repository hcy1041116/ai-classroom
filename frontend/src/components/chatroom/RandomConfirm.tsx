import { Button } from "@/components/ui/button";
import { X, Dices } from "lucide-react";

interface RandomConfirmProps {
  onClose: () => void;
  onStart: (scenario?: any) => void;
}

export default function RandomConfirm({ onClose, onStart }: RandomConfirmProps) {
  return (
    <div
      className="absolute inset-0 z-20 flex items-center justify-center bg-background/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative bg-card border border-border rounded-xl shadow-2xl p-8 animate-in zoom-in-95 fade-in duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 rounded-sm opacity-70 hover:opacity-100 transition-opacity"
        >
          <X className="h-5 w-5 text-foreground" />
        </button>

        <div className="text-center space-y-4">
          <Dices className="h-12 w-12 text-primary mx-auto" />
          <h3 className="text-xl font-bold text-foreground">隨機情境</h3>
          <p className="text-muted-foreground">系統將為您隨機選擇一個練習情境</p>
        </div>

        <div className="flex justify-center mt-6">
          <Button size="lg" onClick={() => onStart()}>
            開始對話
          </Button>
        </div>
      </div>
    </div>
  );
}
