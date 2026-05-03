import { useState } from "react";
import { ArrowRight, Sparkles, GraduationCap } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

export interface PersonalityItem {
  id: number;
  name: string;
  personality_tags: string;
  personality_type?: string;
  short_desc?: string;
}

export interface GradeLevelItem {
  id: string;
  label: string;
  desc: string;
  behavior_desc: string;
  sort_order: number;
}

export interface StudentProfile {
  personality: string; // personality_tags value, e.g. "防衛刺蝟型"
  grade: string;
}

interface StudentProfileSelectProps {
  onConfirm: (profile: StudentProfile) => void;
  onBack: () => void;
  allowedPersonalityTags?: string[];
  personalities?: PersonalityItem[];
  gradeLevels?: GradeLevelItem[];
}

export default function StudentProfileSelect({
  onConfirm,
  onBack,
  allowedPersonalityTags,
  personalities = [],
  gradeLevels = [],
}: StudentProfileSelectProps) {
  const [selectedPersonality, setSelectedPersonality] = useState<string | null>(null);
  const [selectedGrade, setSelectedGrade] = useState<string | null>(null);

  const canConfirm = selectedPersonality && selectedGrade;

  const visibleTraits = allowedPersonalityTags?.length
    ? personalities.filter((p) => allowedPersonalityTags.includes(p.personality_tags))
    : personalities;

  return (
    <ScrollArea className="h-full">
      <div className="px-6 py-6 md:px-10 animate-in fade-in slide-in-from-right-4 duration-400">
        <div className="max-w-5xl mx-auto flex flex-col gap-5">
          {/* Header */}
          <div className="flex flex-col gap-0.5">
            <span className="font-heading text-[10px] font-bold tracking-[0.2em] text-primary uppercase">
              Student Profile
            </span>
            <h3 className="font-heading text-xl font-bold text-[#3D3831]">虛擬學生設定</h3>
            <p className="text-xs text-[#706C61] mt-0.5">選擇學生的個性特質與年級，打造更貼近真實的對話情境</p>
          </div>

          {/* Personality Traits */}
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <h4 className="font-heading text-sm font-bold text-[#3D3831] tracking-wide">個性特質</h4>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5">
              {visibleTraits.map((trait) => (
                <button
                  key={trait.id}
                  onClick={() => setSelectedPersonality(trait.personality_tags)}
                  className={`group relative flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all duration-200 text-center hover:shadow-md hover:-translate-y-0.5 ${
                    selectedPersonality === trait.personality_tags
                      ? "border-primary bg-primary/5 shadow-md ring-1 ring-primary/20"
                      : "border-[#E5E2D9] bg-white hover:border-[#3D3831]/20"
                  }`}
                >
                  <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-[#E5E2D9] bg-[#FAF9F6] shrink-0">
                    <img
                      src={`/avatars/${trait.name}.png`}
                      alt={trait.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span className={`text-[12px] font-bold leading-tight ${selectedPersonality === trait.personality_tags ? "text-primary" : "text-[#3D3831]"}`}>
                    {trait.name}
                  </span>
                  <span className={`text-[11px] font-semibold leading-tight ${selectedPersonality === trait.personality_tags ? "text-primary/80" : "text-[#706C61]"}`}>
                    {trait.personality_tags}
                  </span>
                  <span className="text-[10px] text-[#A09C94] leading-snug hidden md:block line-clamp-2">
                    {trait.short_desc}
                  </span>
                  {selectedPersonality === trait.personality_tags && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center shadow-sm animate-in zoom-in duration-200">
                      <span className="text-white text-[8px] font-bold">✓</span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Grade Level */}
          <div className="flex flex-col md:flex-row md:items-end gap-5">
            <div className="flex flex-col gap-2.5 flex-1">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-primary" />
                <h4 className="font-heading text-sm font-bold text-[#3D3831] tracking-wide">年級</h4>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                {gradeLevels.map((grade) => (
                  <button
                    key={grade.id}
                    onClick={() => setSelectedGrade(grade.id)}
                    className={`group flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${
                      selectedGrade === grade.id
                        ? "border-primary bg-primary/5 shadow-md ring-1 ring-primary/20"
                        : "border-[#E5E2D9] bg-white hover:border-[#3D3831]/20"
                    }`}
                  >
                    <span className={`text-xs font-bold ${selectedGrade === grade.id ? "text-primary" : "text-[#3D3831]"}`}>
                      {grade.label}
                    </span>
                    <span className="text-[10px] text-[#A09C94]">{grade.desc}</span>
                    <span className="text-[10px] text-[#A09C94] leading-snug hidden md:block line-clamp-2 text-center">
                      {grade.behavior_desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-1 pb-2">
            <button
              onClick={onBack}
              className="px-4 py-2 text-sm font-bold text-[#706C61] hover:text-[#3D3831] transition-colors"
            >
              ← 返回情境
            </button>
            <button
              disabled={!canConfirm}
              onClick={() => canConfirm && onConfirm({ personality: selectedPersonality!, grade: selectedGrade! })}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-heading text-sm font-bold shadow-lg transition-all duration-200 ${
                canConfirm
                  ? "bg-primary text-white hover:bg-[#C8694F] scale-100 hover:scale-[1.02]"
                  : "bg-[#E5E2D9] text-[#A09C94] cursor-not-allowed shadow-none"
              }`}
            >
              下一步
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}
