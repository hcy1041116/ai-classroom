import { useState, useCallback, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";
import { sfxDeal, sfxFlip, sfxReveal, sfxClick } from "@/lib/soulCardSfx";
import type { Scenario } from "@/lib/collectionData";

/* ── Types ── */
interface SoulCardsProps {
  scenarios: Scenario[];
  open: boolean;
  onClose: () => void;
  onStart: (scenario: Scenario) => void;
}

/* ── Constants ── */
const CARD_BACK_COLORS = [
  "from-[hsl(12,69%,63%)] to-[hsl(12,69%,50%)]",
  "from-[hsl(150,25%,55%)] to-[hsl(150,25%,42%)]",
  "from-[hsl(43,74%,75%)] to-[hsl(43,74%,60%)]",
  "from-[hsl(200,40%,65%)] to-[hsl(200,40%,50%)]",
  "from-[hsl(340,40%,65%)] to-[hsl(340,40%,50%)]",
];

const CARD_COUNT = 5;
const DEAL_STAGGER = 200; // ms between each card deal
const DEAL_TOTAL = CARD_COUNT * DEAL_STAGGER + 400; // total dealing phase
const REVEAL_DURATION = 1200;

type GameState = "idle" | "dealing" | "picking" | "revealing" | "revealed";

function vibrate(pattern: number | number[]) {
  if (navigator.vibrate) navigator.vibrate(pattern);
}

/* ── Fan layout math ── */
function getFanTransform(idx: number, total: number) {
  const center = (total - 1) / 2;
  const offset = idx - center;
  const rotation = offset * 10; // degrees between cards
  const yOffset = Math.abs(offset) * 12; // arc curve
  const xOffset = offset * 70; // horizontal spread
  return { rotation, yOffset, xOffset };
}

/* ══════════════════════════════════════════
   Card Back Component
   ══════════════════════════════════════════ */
function CardBack({ colorClass }: { colorClass: string }) {
  return (
    <div
      className={`absolute inset-0 rounded-2xl border-2 border-border/30 shadow-xl bg-gradient-to-br ${colorClass} flex items-center justify-center overflow-hidden`}
      style={{ backfaceVisibility: "hidden" }}
    >
      {/* Ornamental double border */}
      <div className="absolute inset-2 rounded-xl border border-border/20" />
      <div className="absolute inset-4 rounded-lg border border-border/10" />
      {/* Central emblem */}
      <div className="text-center z-10">
        <span className="text-4xl opacity-40 drop-shadow-lg">🌿</span>
        <div
          className="mt-1 text-[9px] font-bold tracking-[0.3em] uppercase opacity-50"
          style={{ color: "hsl(var(--primary-foreground))" }}
        >
          SELf
        </div>
      </div>
      {/* Corner ornaments */}
      {["-top-0.5 -left-0.5", "-top-0.5 -right-0.5", "-bottom-0.5 -left-0.5", "-bottom-0.5 -right-0.5"].map((pos, i) => (
        <div
          key={i}
          className={`absolute ${pos} w-6 h-6 border-primary-foreground/20`}
          style={{
            borderTopWidth: i < 2 ? 2 : 0,
            borderBottomWidth: i >= 2 ? 2 : 0,
            borderLeftWidth: i % 2 === 0 ? 2 : 0,
            borderRightWidth: i % 2 === 1 ? 2 : 0,
            borderRadius: "4px",
            margin: "8px",
          }}
        />
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════
   Card Front Component
   ══════════════════════════════════════════ */
function CardFront({ scenario }: { scenario: Scenario }) {
  return (
    <div
      className="absolute inset-0 rounded-2xl border-2 border-primary/30 bg-card shadow-xl flex flex-col items-center justify-center p-5 text-center gap-2"
      style={{
        backfaceVisibility: "hidden",
        transform: "rotateY(180deg)",
      }}
    >
      <span className="text-5xl">{scenario.emoji}</span>
      <h4 className="font-heading text-base font-bold text-foreground leading-tight mt-1">
        {scenario.title}
      </h4>
      <span className="text-[10px] px-2 py-0.5 rounded-full border border-primary/40 bg-primary/10 text-foreground">
        {scenario.tag}
      </span>
      {scenario.guideSentence && (
        <p className="text-[11px] text-muted-foreground italic leading-snug mt-2">
          「{scenario.guideSentence}」
        </p>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════
   Reveal Particles
   ══════════════════════════════════════════ */
function RevealParticles() {
  return (
    <>
      {/* Golden orbs */}
      {Array.from({ length: 16 }).map((_, i) => {
        const angle = (i / 16) * 360 + (i % 2 === 0 ? 8 : 0);
        const distance = 120 + Math.sin(i * 1.7) * 40;
        const size = 5 + Math.sin(i * 2.3) * 3;
        const delay = 0.05 + i * 0.04;
        const hues = ["43,85%,72%", "35,90%,65%", "50,80%,78%", "28,75%,60%"];
        const hue = hues[i % 4];
        return (
          <div
            key={`gold-${i}`}
            className="absolute left-1/2 top-1/2 rounded-full pointer-events-none"
            style={{
              width: size, height: size,
              backgroundColor: `hsl(${hue})`,
              boxShadow: `0 0 ${size * 2}px hsl(${hue}/0.8), 0 0 ${size * 4}px hsl(${hue}/0.3)`,
              animation: `particleBurst ${1.2 + Math.sin(i) * 0.3}s cubic-bezier(0.16,1,0.3,1) ${delay}s forwards`,
              "--burst-angle": `${angle}deg`,
              "--burst-distance": `${distance}px`,
            } as React.CSSProperties}
          />
        );
      })}
      {/* Tiny sparkles */}
      {Array.from({ length: 20 }).map((_, i) => {
        const angle = (i / 20) * 360 + 15;
        const distance = 50 + Math.cos(i * 3.1) * 30;
        const size = 2 + Math.random() * 2;
        const colors = ["43,74%,75%", "12,69%,63%", "30,80%,68%", "55,70%,70%"];
        return (
          <div
            key={`spark-${i}`}
            className="absolute left-1/2 top-1/2 rounded-full pointer-events-none"
            style={{
              width: size, height: size,
              backgroundColor: `hsl(${colors[i % 4]})`,
              boxShadow: `0 0 ${size * 3}px hsl(${colors[i % 4]}/0.6)`,
              animation: `particleBurst ${0.8 + Math.sin(i * 2) * 0.2}s ease-out ${i * 0.025}s forwards`,
              "--burst-angle": `${angle}deg`,
              "--burst-distance": `${distance}px`,
            } as React.CSSProperties}
          />
        );
      })}
      {/* Floating shimmer */}
      {Array.from({ length: 6 }).map((_, i) => {
        const x = -60 + Math.sin(i * 1.8) * 120;
        const y = -80 + Math.cos(i * 2.2) * 100;
        return (
          <div
            key={`shimmer-${i}`}
            className="absolute left-1/2 top-1/2 rounded-full pointer-events-none"
            style={{
              width: 3, height: 3,
              backgroundColor: "hsl(43,85%,78%)",
              boxShadow: "0 0 8px hsl(43,85%,78%/0.6)",
              transform: `translate(${x}px, ${y}px)`,
              animation: `shimmerFloat 2.5s ease-in-out ${i * 0.4}s infinite alternate`,
            }}
          />
        );
      })}
    </>
  );
}

/* ══════════════════════════════════════════
   Main SoulCards Component
   ══════════════════════════════════════════ */
export default function SoulCards({ scenarios, open, onClose, onStart }: SoulCardsProps) {
  const [gameState, setGameState] = useState<GameState>("idle");
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [dealtCount, setDealtCount] = useState(0);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const drawnScenarios = useMemo(() => {
    const shuffled = [...scenarios].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(CARD_COUNT, shuffled.length));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenarios, open]);

  const cardCount = drawnScenarios.length;

  // Auto-start dealing when opened
  useEffect(() => {
    if (open && gameState === "idle") {
      const t = setTimeout(() => startDeal(), 400);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Deal cards one by one
  useEffect(() => {
    if (gameState !== "dealing") return;
    if (dealtCount >= cardCount) {
      const t = setTimeout(() => setGameState("picking"), 300);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => {
      sfxDeal();
      vibrate(8);
      setDealtCount((c) => c + 1);
    }, DEAL_STAGGER);
    return () => clearTimeout(t);
  }, [gameState, dealtCount, cardCount]);

  const startDeal = useCallback(() => {
    setGameState("dealing");
    setSelectedIdx(null);
    setDealtCount(0);
    setHoveredIdx(null);
  }, []);

  const handlePickCard = useCallback((idx: number) => {
    if (gameState !== "picking") return;
    setSelectedIdx(idx);
    setGameState("revealing");
    vibrate([20, 40, 20]);
    sfxFlip();

    setTimeout(() => {
      setGameState("revealed");
      vibrate([15, 30, 15, 30, 15]);
      sfxReveal();
    }, REVEAL_DURATION);
  }, [gameState]);

  const handleRedraw = useCallback(() => {
    sfxClick();
    setGameState("idle");
    setSelectedIdx(null);
    setDealtCount(0);
    setTimeout(() => startDeal(), 200);
  }, [startDeal]);

  const handleClose = useCallback(() => {
    setGameState("idle");
    setSelectedIdx(null);
    setDealtCount(0);
    onClose();
  }, [onClose]);

  if (!open) return null;

  const selectedScenario = selectedIdx !== null ? drawnScenarios[selectedIdx] : null;

  const titleText = {
    idle: "🃏 隨機牌卡",
    dealing: "🃏 發牌中...",
    picking: "✨ 選擇你的情境卡...",
    revealing: "✨ 揭曉中...",
    revealed: "🌟 情境卡已揭曉",
  }[gameState];

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{
        background: "radial-gradient(circle at 50% 40%, hsl(var(--foreground)/0.5) 0%, hsl(var(--foreground)/0.92) 100%)",
        backdropFilter: "blur(20px)",
        animation: "soulOverlayIn 0.4s ease-out forwards",
      }}
      onClick={gameState === "revealed" ? handleClose : undefined}
    >
      {/* Title */}
      <div
        className="absolute top-10 flex flex-col items-center gap-2"
        style={{
          opacity: gameState === "dealing" || gameState === "picking" ? 1 : 0.7,
          transition: "opacity 0.5s",
        }}
      >
        <span
          className="font-heading text-lg font-bold tracking-wide"
          style={{
            color: "hsl(var(--primary-foreground))",
            textShadow: "0 2px 16px hsl(var(--primary)/0.6)",
          }}
        >
          {titleText}
        </span>
        {gameState === "dealing" && (
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-1.5 h-1.5 rounded-full"
                style={{
                  backgroundColor: "hsl(var(--primary))",
                  animation: `dotPulse 0.6s ease-in-out ${i * 0.15}s infinite alternate`,
                }}
              />
            ))}
          </div>
        )}
        {gameState === "picking" && (
          <span
            className="text-xs font-medium"
            style={{ color: "hsl(var(--primary-foreground)/0.6)" }}
          >
            點擊一張牌卡來揭曉你的情境
          </span>
        )}
      </div>

      {/* Cards Area */}
      <div
        className="relative"
        style={{ width: 500, height: 420 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Reveal VFX layers */}
        {(gameState === "revealing" || gameState === "revealed") && (
          <>
            <div
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none"
              style={{
                width: gameState === "revealed" ? 600 : 20,
                height: gameState === "revealed" ? 600 : 20,
                background: "radial-gradient(circle, hsl(43 74% 75%/0.4) 0%, hsl(12 69% 63%/0.15) 40%, transparent 70%)",
                transition: "all 1.4s cubic-bezier(0.16,1,0.3,1)",
              }}
            />
            <div
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none"
              style={{
                width: 200, height: 200,
                background: "radial-gradient(circle, hsl(43 90% 88%/0.6) 0%, transparent 60%)",
                opacity: gameState === "revealing" ? 1 : 0,
                transition: "all 0.8s ease-out",
              }}
            />
          </>
        )}

        {/* Particles on reveal */}
        {gameState === "revealed" && <RevealParticles />}

        {/* Card stack */}
        {drawnScenarios.map((scenario, idx) => {
          const isSelected = selectedIdx === idx;
          const isDealt = idx < dealtCount;
          const colorIdx = idx % CARD_BACK_COLORS.length;
          const fan = getFanTransform(idx, cardCount);
          const isHovered = hoveredIdx === idx;

          let cardStyle: React.CSSProperties = {};
          let innerFlip = false;

          if (gameState === "idle" || gameState === "dealing") {
            if (isDealt) {
              cardStyle = {
                transform: `translate(${fan.xOffset}px, ${fan.yOffset}px) rotate(${fan.rotation}deg)`,
                zIndex: idx + 1,
                opacity: 1,
                transition: "all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)",
              };
            } else {
              cardStyle = {
                transform: "translate(0, -300px) rotate(0deg) scale(0.6)",
                zIndex: 0,
                opacity: 0,
                transition: "none",
              };
            }
          } else if (gameState === "picking") {
            const hoverLift = isHovered ? -16 : 0;
            const hoverScale = isHovered ? 1.08 : 1;
            cardStyle = {
              transform: `translate(${fan.xOffset}px, ${fan.yOffset + hoverLift}px) rotate(${fan.rotation}deg) scale(${hoverScale})`,
              zIndex: isHovered ? 20 : idx + 1,
              opacity: 1,
              cursor: "pointer",
              transition: "all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
              filter: isHovered ? "brightness(1.15)" : "none",
            };
          } else if (gameState === "revealing" || gameState === "revealed") {
            if (isSelected) {
              cardStyle = {
                transform: `translate(0, ${gameState === "revealed" ? -40 : -30}px) rotate(0deg) scale(${gameState === "revealed" ? 1.15 : 1.3})`,
                zIndex: 30,
                opacity: 1,
                transition: "all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)",
              };
              innerFlip = true;
            } else {
              cardStyle = {
                transform: `translate(${fan.xOffset}px, ${200 + Math.abs(fan.xOffset) * 0.5}px) rotate(${fan.rotation * 1.5}deg) scale(0.7)`,
                zIndex: 1,
                opacity: 0,
                transition: "all 0.6s ease-out",
                pointerEvents: "none",
              };
            }
          }

          return (
            <div
              key={scenario.id}
              className="absolute left-1/2 top-1/2"
              style={{
                width: 160,
                height: 230,
                marginLeft: -80,
                marginTop: -115,
                perspective: "1000px",
                ...cardStyle,
              }}
              onClick={() => handlePickCard(idx)}
              onMouseEnter={() => gameState === "picking" && setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              {/* Hover glow ring */}
              {gameState === "picking" && isHovered && (
                <div
                  className="absolute -inset-2 rounded-3xl pointer-events-none"
                  style={{
                    boxShadow: "0 0 20px hsl(43,74%,75%/0.5), 0 0 40px hsl(43,74%,75%/0.2)",
                    transition: "all 0.3s",
                  }}
                />
              )}
              <div
                className="relative w-full h-full"
                style={{
                  transformStyle: "preserve-3d",
                  transform: innerFlip ? "rotateY(180deg)" : "rotateY(0deg)",
                  transition: "transform 1s cubic-bezier(0.4, 0, 0.2, 1)",
                }}
              >
                <CardBack colorClass={CARD_BACK_COLORS[colorIdx]} />
                <CardFront scenario={scenario} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Action buttons */}
      {gameState === "revealed" && selectedScenario && (
        <div
          className="absolute bottom-16 flex items-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500"
          onClick={(e) => e.stopPropagation()}
        >
          <Button variant="glass" size="lg" onClick={handleRedraw} className="gap-2">
            <RotateCcw className="w-4 h-4" />
            重新抽取
          </Button>
          <Button
            size="lg"
            onClick={() => {
              onStart(selectedScenario);
              handleClose();
            }}
          >
            開始練習
          </Button>
        </div>
      )}

      {/* Hints */}
      {gameState === "idle" && (
        <div className="absolute bottom-8 text-xs text-muted-foreground/60 font-medium">
          準備發牌中...
        </div>
      )}
      {gameState === "revealed" && (
        <div className="absolute bottom-8 text-xs text-muted-foreground/60 font-medium">
          點擊空白處關閉
        </div>
      )}

      <style>{`
        @keyframes soulOverlayIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes dotPulse {
          from { opacity: 0.3; transform: scale(0.8); }
          to { opacity: 1; transform: scale(1.3); }
        }
        @keyframes particleBurst {
          0% {
            opacity: 0;
            transform: translate(-50%, -50%) rotate(var(--burst-angle)) translateY(0) scale(0);
          }
          15% {
            opacity: 1;
            transform: translate(-50%, -50%) rotate(var(--burst-angle)) translateY(calc(var(--burst-distance) * -0.3)) scale(1.4);
          }
          60% {
            opacity: 0.8;
            transform: translate(-50%, -50%) rotate(var(--burst-angle)) translateY(calc(var(--burst-distance) * -0.85)) scale(1);
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -50%) rotate(var(--burst-angle)) translateY(calc(var(--burst-distance) * -1.1)) scale(0.3);
          }
        }
        @keyframes shimmerFloat {
          0% { opacity: 0.4; transform: translate(var(--tx, 0), var(--ty, 0)) scale(0.8); }
          100% { opacity: 0.9; transform: translate(var(--tx, 0), var(--ty, 0)) scale(1.3) translateY(-8px); }
        }
      `}</style>
    </div>,
    document.body
  );
}
