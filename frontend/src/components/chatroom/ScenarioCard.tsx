import { Card, CardContent } from "@/components/ui/card";

interface Scenario {
  id: number;
  title: string;
  tag: string;
  emoji: string;
  description: string;
}

interface ScenarioCardProps {
  scenario: Scenario;
  onClick: (id: number) => void;
}

export default function ScenarioCard({ scenario, onClick }: ScenarioCardProps) {
  return (
    <Card
      onClick={() => onClick(scenario.id)}
      className="cursor-pointer transition-all duration-200 hover:scale-[1.03] hover:shadow-lg border-2 border-border/60 bg-card/80 backdrop-blur-md hover:border-primary/40"
    >
      <CardContent className="p-4 text-center space-y-2">
        <span className="text-3xl">{scenario.emoji}</span>
        <p className="font-medium text-sm leading-tight text-foreground">
          {scenario.title}
        </p>
        <span className="inline-block text-xs px-2 py-0.5 rounded-full border border-border bg-muted text-muted-foreground">
          {scenario.tag}
        </span>
      </CardContent>
    </Card>
  );
}
