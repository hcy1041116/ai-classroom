export interface Scenario {
  id: number;
  title: string;
  tag: string;
  emoji: string;
  description: string;
  short_desc?: string;
  tags?: string[];
  practice_count?: number;
  estimated_minutes?: number;
  guideSentence?: string;
  is_custom?: boolean;
}

export interface CompetencyGroup {
  id: string;
  label: string;
  icon: string;
  color: string;
  description: string;
  scenarios: Scenario[];
}

// Competency group metadata (icons, colors, descriptions)
export const COMPETENCY_META: Omit<CompetencyGroup, "scenarios">[] = [
  { id: "自我覺察", label: "自我覺察", icon: "🪞", color: "hsl(12, 69%, 63%)", description: "幫助學生認識自己的情緒、想法與行為模式。" },
  { id: "自我管理", label: "自我管理", icon: "🧘", color: "hsl(200, 40%, 65%)", description: "學習調節情緒、設定目標與自我激勵的能力。" },
  { id: "社會覺察", label: "社會覺察", icon: "🌍", color: "hsl(150, 25%, 55%)", description: "培養同理心與對他人感受的敏感度。" },
  { id: "關係技能", label: "人際技巧", icon: "🤝", color: "hsl(43, 74%, 70%)", description: "學習有效溝通與建立正向關係的方法。" },
  { id: "負責任的決策", label: "負責決策", icon: "⚖️", color: "hsl(340, 40%, 65%)", description: "培養做出負責任且具建設性決定的能力。" },
];

// Build CompetencyGroup[] from an API-fetched scenarios array
export function buildCompetencyGroups(scenarios: Scenario[]): CompetencyGroup[] {
  return COMPETENCY_META.map((meta) => ({
    ...meta,
    scenarios: scenarios.filter((s) => s.tag === meta.id),
  })).filter((g) => g.scenarios.length > 0);
}
