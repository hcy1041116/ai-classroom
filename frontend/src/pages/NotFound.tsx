import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { ArrowLeft, MessageCircle, Home } from "lucide-react";

export default function NotFound() {
  const location = useLocation();
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
    
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate("/home");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [location.pathname, navigate]);

  return (
    <div className="fixed inset-0 w-full h-full bg-gradient-to-br from-[#FAF9F6] to-[#F0EDE6] flex items-center justify-center p-6 overflow-hidden">
      {/* Background Decorations */}
      <div className="absolute inset-0 chalk-lines opacity-[0.15] pointer-events-none" />
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/5 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/5 rounded-full blur-3xl animate-pulse [animation-delay:1s]" />

      <div className="relative z-10 flex flex-col items-center text-center max-w-lg animate-in fade-in zoom-in-95 duration-700">
        {/* Large 404 Text */}
        <div className="relative mb-8">
           <h1 className="font-heading text-[120px] md:text-[160px] font-bold text-[#E5E2D9] leading-none tracking-tighter select-none">
             404
           </h1>
           <div className="absolute inset-0 flex items-center justify-center pt-4">
              <div className="relative group">
                 <span className="text-7xl md:text-8xl group-hover:scale-110 transition-transform duration-500 inline-block drop-shadow-2xl">🧑‍🎓</span>
                 <div className="absolute -top-8 -right-8 flex flex-col gap-1">
                    <span className="text-2xl font-bold text-primary animate-bounce">?</span>
                    <span className="text-xl font-bold text-primary animate-bounce [animation-delay:0.2s]">?</span>
                    <span className="text-lg font-bold text-primary animate-bounce [animation-delay:0.4s]">?</span>
                 </div>
              </div>
           </div>
        </div>

        {/* Content */}
        <div className="space-y-4 mb-10">
          <h2 className="font-heading text-2xl md:text-3xl font-bold text-[#3D3831] tracking-tight">
            哎呀，這個教室沒有人呢
          </h2>
          <p className="text-[16px] md:text-[17px] text-[#706C61] font-medium leading-relaxed">
            看來您走錯了路。不過沒關係，即使在迷路的時候，<br className="hidden md:block" />
            我們也能在下一個轉角遇見新的學習。
          </p>
        </div>

        {/* Countdown & Progress */}
        <div className="w-full max-w-[280px] space-y-3 mb-10">
           <div className="flex justify-between items-end px-1">
              <span className="text-[11px] font-bold text-[#A09C94] uppercase tracking-widest">Automatic Return</span>
              <span className="font-heading text-sm font-bold text-primary">{countdown}s</span>
           </div>
           <div className="h-1.5 w-full bg-[#E5E2D9] rounded-full overflow-hidden shadow-inner">
              <div 
                className="h-full bg-primary transition-all duration-1000 ease-linear shadow-[0_0_8px_rgba(224,122,95,0.4)]"
                style={{ width: `${(countdown / 5) * 100}%` }}
              />
           </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
          <button
            onClick={() => navigate("/home")}
            className="h-14 px-8 bg-primary text-white font-heading font-bold rounded-xl shadow-lg shadow-primary/20 hover:bg-[#C8694F] hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3"
          >
            <Home className="w-5 h-5" />
            帶我回首頁
          </button>
          <button
            onClick={() => navigate("/chatroom")}
            className="h-14 px-8 bg-white border-2 border-[#3D3831] text-[#3D3831] font-heading font-bold rounded-xl hover:bg-[#3D3831] hover:text-white hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3 group"
          >
            <MessageCircle className="w-5 h-5 group-hover:fill-current" />
            去對話練習看看
          </button>
        </div>

        {/* Footer Note */}
        <p className="mt-12 text-[12px] text-[#A09C94] font-medium tracking-wide">
          Lost Path: <span className="italic">{location.pathname}</span>
        </p>
      </div>
    </div>
  );
}
