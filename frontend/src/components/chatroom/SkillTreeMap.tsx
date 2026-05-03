import { useState, useMemo } from "react";
import { Sparkles, LayoutGrid, List, Search, Clock, Users, Plus, Pencil } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { CompetencyGroup, Scenario } from "@/lib/collectionData";
import CustomScenarioModal from "./CustomScenarioModal";

interface SkillTreeMapProps {
  groups: CompetencyGroup[];
  onSelectScenario: (id: number) => void;
  onOpenSoulCards: () => void;
  customScenarios: Scenario[];
  onCustomScenariosChange: (updated: Scenario[]) => void;
}

const COMPETENCY_COLORS = [
  "hsl(12, 69%, 63%)",
  "hsl(150, 25%, 55%)",
  "hsl(43, 74%, 70%)",
  "hsl(200, 40%, 65%)",
  "hsl(340, 40%, 65%)",
];
const CUSTOM_COLOR = "hsl(262, 52%, 62%)";

type ViewMode = "grid" | "list";

export default function SkillTreeMap({
  groups,
  onSelectScenario,
  onOpenSoulCards,
  customScenarios,
  onCustomScenariosChange,
}: SkillTreeMapProps) {
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingScenario, setEditingScenario] = useState<Scenario | null>(null);

  const allSystemScenarios = useMemo(() => groups.flatMap((g) => g.scenarios), [groups]);

  const filteredScenarios = useMemo(() => {
    let list: Scenario[];
    if (activeFilter === "__custom__") {
      list = customScenarios;
    } else if (activeFilter) {
      list = groups.find((g) => g.id === activeFilter)?.scenarios ?? [];
    } else {
      list = [...allSystemScenarios, ...customScenarios];
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q) ||
          s.tag.toLowerCase().includes(q)
      );
    }
    return list;
  }, [activeFilter, searchQuery, groups, allSystemScenarios, customScenarios]);

  const getGroupColor = (scenario: Scenario) => {
    if (scenario.is_custom) return CUSTOM_COLOR;
    const idx = groups.findIndex((g) => g.scenarios.some((s) => s.id === scenario.id));
    return idx >= 0 ? COMPETENCY_COLORS[idx % COMPETENCY_COLORS.length] : COMPETENCY_COLORS[0];
  };

  const handleCreated = (scenario: Scenario) => {
    const exists = customScenarios.some((s) => s.id === scenario.id);
    if (exists) {
      onCustomScenariosChange(customScenarios.map((s) => (s.id === scenario.id ? scenario : s)));
    } else {
      onCustomScenariosChange([...customScenarios, scenario]);
    }
    onSelectScenario(scenario.id);
  };

  const handleDeleted = (id: number) => {
    onCustomScenariosChange(customScenarios.filter((s) => s.id !== id));
  };

  const openEdit = (e: React.MouseEvent, scenario: Scenario) => {
    e.stopPropagation();
    setEditingScenario(scenario);
  };

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden">
      {/* Toolbar */}
      <div className="shrink-0 px-6 pt-5 pb-3 flex flex-col gap-3">
        {/* Row 1: Search + view toggle + buttons */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="搜尋情境名稱、描述..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-sm rounded-xl border-border/60"
            />
          </div>

          {/* View mode toggle */}
          <div className="flex items-center gap-0.5 bg-muted rounded-xl p-1">
            <button
              onClick={() => setViewMode("grid")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === "grid"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-background/60"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">卡片</span>
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === "list"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-background/60"
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">列表</span>
            </button>
          </div>

          {/* Create custom scenario button */}
          <button
            onClick={() => setCreateModalOpen(true)}
            className="shrink-0 h-9 flex items-center gap-2 px-4 rounded-xl bg-[hsl(262,52%,62%)] text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 group"
          >
            <Plus className="w-4 h-4" />
            <span className="text-xs font-bold tracking-wide hidden sm:inline">自訂情境</span>
          </button>

          {/* Soul Cards button */}
          <button
            onClick={onOpenSoulCards}
            className="shrink-0 h-9 flex items-center gap-2 px-4 rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 group"
          >
            <span className="text-lg">🃏</span>
            <span className="text-xs font-bold tracking-wide hidden sm:inline">隨機情境卡</span>
            <Sparkles className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 transition-opacity" />
          </button>
        </div>

        {/* Row 2: Category filters + count */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setActiveFilter(null)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-200 ${
              !activeFilter
                ? "bg-foreground text-background shadow-md"
                : "border border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            全部
          </button>
          {groups.map((group, idx) => (
            <button
              key={group.id}
              onClick={() => setActiveFilter(activeFilter === group.id ? null : group.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-200 flex items-center gap-1.5 ${
                activeFilter === group.id
                  ? "text-card shadow-md"
                  : "border border-border text-muted-foreground hover:bg-muted"
              }`}
              style={
                activeFilter === group.id
                  ? { backgroundColor: COMPETENCY_COLORS[idx % COMPETENCY_COLORS.length] }
                  : undefined
              }
            >
              <span className="text-sm">{group.icon}</span>
              {group.label}
            </button>
          ))}
          {customScenarios.length > 0 && (
            <button
              onClick={() => setActiveFilter(activeFilter === "__custom__" ? null : "__custom__")}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-200 flex items-center gap-1.5 ${
                activeFilter === "__custom__"
                  ? "text-white shadow-md"
                  : "border border-border text-muted-foreground hover:bg-muted"
              }`}
              style={activeFilter === "__custom__" ? { backgroundColor: CUSTOM_COLOR } : undefined}
            >
              ✏️ 我的情境
            </button>
          )}
          <span className="text-[11px] text-muted-foreground ml-auto">
            共 {filteredScenarios.length} 個情境
          </span>
        </div>

        {activeFilter && activeFilter !== "__custom__" && (
          <p className="text-xs text-muted-foreground font-medium animate-in fade-in duration-300">
            {groups.find((g) => g.id === activeFilter)?.description}
          </p>
        )}
      </div>

      {/* Content area */}
      <ScrollArea className="flex-1 px-6 pb-6">
        {viewMode === "grid" ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 pt-1">
            {filteredScenarios.map((scenario, idx) => {
              const groupColor = getGroupColor(scenario);
              return (
                <button
                  key={scenario.id}
                  onClick={() => onSelectScenario(scenario.id)}
                  className="group relative rounded-2xl border-2 border-border/40 bg-card shadow-sm hover:shadow-xl hover:border-primary/40 transition-all duration-300 hover:-translate-y-1 flex flex-col items-center p-5 text-center gap-3 cursor-pointer"
                  style={{ animation: `cardFadeIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) ${idx * 0.05}s both` }}
                >
                  <div
                    className="absolute top-0 left-4 right-4 h-1 rounded-b-full opacity-60 group-hover:opacity-100 transition-opacity"
                    style={{ backgroundColor: groupColor }}
                  />
                  {scenario.is_custom && (
                    <button
                      onClick={(e) => openEdit(e, scenario)}
                      className="absolute top-2 right-2 w-6 h-6 rounded-full bg-muted flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-border"
                      title="編輯情境"
                    >
                      <Pencil className="w-3 h-3 text-muted-foreground" />
                    </button>
                  )}
                  <span className="text-4xl mt-2 group-hover:scale-110 transition-transform duration-300">
                    {scenario.emoji}
                  </span>
                  <h4 className="font-heading text-sm font-bold text-foreground leading-tight line-clamp-2">
                    {scenario.title}
                  </h4>
                  <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
                    {scenario.description}
                  </p>
                  <div className="flex items-center gap-1.5 flex-wrap justify-center">
                    <span
                      className="text-[10px] px-2.5 py-1 rounded-full font-medium"
                      style={{ backgroundColor: `${groupColor}15`, color: groupColor }}
                    >
                      {scenario.tag}
                    </span>
                    {scenario.is_custom && (
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-purple-300 text-purple-500">
                        自訂
                      </Badge>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col gap-3 pt-1">
            {filteredScenarios.map((scenario, idx) => {
              const groupColor = getGroupColor(scenario);
              return (
                <button
                  key={scenario.id}
                  onClick={() => onSelectScenario(scenario.id)}
                  className="group w-full text-left rounded-2xl border-2 border-border/40 bg-card shadow-sm hover:shadow-lg hover:border-primary/30 transition-all duration-300 p-4 flex items-start gap-4 cursor-pointer"
                  style={{ animation: `listFadeIn 0.35s ease-out ${idx * 0.04}s both` }}
                >
                  <div
                    className="shrink-0 w-12 h-12 rounded-xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform duration-300"
                    style={{ backgroundColor: `${groupColor}15` }}
                  >
                    {scenario.emoji}
                  </div>

                  <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                      <h4 className="font-heading text-sm font-bold text-foreground truncate">
                        {scenario.title}
                      </h4>
                      {scenario.is_custom && (
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-purple-300 text-purple-500 shrink-0">
                          自訂
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                      {scenario.description}
                    </p>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                        style={{ backgroundColor: `${groupColor}15`, color: groupColor }}
                      >
                        {scenario.tag}
                      </span>
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        約 {scenario.estimated_minutes ?? 10} 分鐘
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Users className="w-3 h-3" />
                        {scenario.practice_count ?? 0} 人練習
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-1">
                    {scenario.is_custom && (
                      <button
                        onClick={(e) => openEdit(e, scenario)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors"
                        title="編輯情境"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <svg className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-1 transition-all" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m9 18 6-6-6-6" />
                    </svg>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {filteredScenarios.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
            <Search className="w-8 h-8 opacity-40" />
            <p className="text-sm font-medium">找不到符合條件的情境</p>
            {activeFilter === "__custom__" ? (
              <button
                onClick={() => setCreateModalOpen(true)}
                className="mt-2 text-xs text-purple-500 hover:underline font-medium"
              >
                + 建立第一個自訂情境
              </button>
            ) : (
              <p className="text-xs">請調整搜尋或篩選條件</p>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Modals */}
      <CustomScenarioModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreated={handleCreated}
      />
      <CustomScenarioModal
        open={!!editingScenario}
        onClose={() => setEditingScenario(null)}
        onCreated={handleCreated}
        editScenario={editingScenario}
        onDeleted={handleDeleted}
      />

      <style>{`
        @keyframes cardFadeIn {
          from { opacity: 0; transform: translateY(16px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes listFadeIn {
          from { opacity: 0; transform: translateX(-12px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
