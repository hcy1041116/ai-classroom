import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface Scenario {
  id: number;
  title: string;
  tag: string;
  emoji: string;
  description: string;
}

interface ScenarioDetailProps {
  scenario: Scenario;
  onClose: () => void;
  onStart: (scenario: Scenario) => void;
}

export default function ScenarioDetail({ scenario, onClose, onStart }: ScenarioDetailProps) {
  return (
    <div
      className="absolute inset-0 z-20 flex items-center justify-center bg-background/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl mx-4 bg-card border border-border rounded-xl shadow-2xl p-8 animate-in zoom-in-95 fade-in duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 rounded-sm opacity-70 hover:opacity-100 transition-opacity"
        >
          <X className="h-5 w-5 text-foreground" />
        </button>

        <div className="text-center space-y-4">
          <span className="text-5xl">{scenario.emoji}</span>
          <h3 className="text-2xl font-bold text-foreground">{scenario.title}</h3>
          <span className="inline-block text-sm px-3 py-1 rounded-full border border-primary/50 bg-primary/10 text-foreground">
            {scenario.tag}
          </span>
          <p className="text-foreground leading-relaxed text-base mt-4">
            {scenario.description}
          </p>
        </div>

        <div className="flex justify-center mt-8">
          <Button size="lg" onClick={() => onStart(scenario)}>
            開始對話
          </Button>
        </div>
      </div>
    </div>
  );
}
