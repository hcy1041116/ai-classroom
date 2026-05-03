import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Eye, EyeOff, Mail, Lock, Loader2, AlertCircle } from "lucide-react";
import api from "@/lib/api";
import { useAuthStore } from "@/lib/auth";

export default function Login() {
  const navigate = useNavigate();
  const setUser = useAuthStore((s) => s.setUser);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shouldShake, setShouldShake] = useState(false);
  const [showResendVerification, setShowResendVerification] = useState(false);

  // Registration dialog state
  const [registerOpen, setRegisterOpen] = useState(false);
  const [regUsername, setRegUsername] = useState("");
  const [regLastName, setRegLastName] = useState("");
  const [regFirstName, setRegFirstName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");
  const [regErrors, setRegErrors] = useState<Record<string, string>>({});
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  // 註冊成功後的「等待驗證」狀態
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState("");
  const [showResendInDialog, setShowResendInDialog] = useState(false);
  const [isResending, setIsResending] = useState(false);

  // Forgot password dialog state
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");

  const isFilled = email.trim() !== "" && password.trim() !== "";

  // =========================================================================
  // Google OAuth 錯誤處理（從 URL query params 讀取）
  // =========================================================================
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const err = params.get("error");
    const msgs: Record<string, string> = {
      oauth_failed: "Google 登入失敗，請稍後再試",
      invalid_state: "登入請求已過期，請重新嘗試",
      email_not_verified: "請先在 Google 驗證您的 email",
      access_denied: "您已取消 Google 登入",
      account_disabled: "您的帳號已被停用",
    };
    if (err && msgs[err]) {
      toast({ title: "登入失敗", description: msgs[err], variant: "destructive" });
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  // =========================================================================
  // 等待驗證：使用者從驗證信分頁切回來時，自動嘗試登入
  // =========================================================================
  useEffect(() => {
    if (!pendingVerificationEmail) return;

    const tryAutoLogin = async () => {
      try {
        await api.post("/auth/login", {
          account: regEmail,
          password: regPassword,
        });
        const meRes = await api.get("/auth/me");
        setUser(meRes.data);
        setRegisterOpen(false);
        setPendingVerificationEmail("");
        navigate("/home");
      } catch {
        // 還沒驗證，什麼都不做，使用者繼續等
      }
    };

    const handleFocus = () => {
      tryAutoLogin();
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [pendingVerificationEmail, regEmail, regPassword, navigate, setUser]);

  // =========================================================================
  // Login
  // =========================================================================
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFilled || isValidating) return;

    setIsValidating(true);
    setError(null);

    try {
      await api.post("/auth/login", { account: email, password });
      const meRes = await api.get("/auth/me");
      setUser(meRes.data);
      navigate("/home");
    } catch (err: any) {
      const detail = err?.response?.data?.detail ?? "帳號或密碼錯誤，請重新輸入。";
      if (err?.response?.status === 403 && detail.includes("驗證")) {
        setError("請先至信箱驗證您的電子郵件。若未收到驗證信，請重新註冊或聯繫管理員。");
      } else {
        setError(detail);
      }
      setShouldShake(true);
      setTimeout(() => setShouldShake(false), 500);
    } finally {
      setIsValidating(false);
    }
  };

  // =========================================================================
  // Google Login
  // =========================================================================
  const handleGoogleLogin = () => {
    window.location.href = "/auth/google/login";
  };

  // =========================================================================
  // Register
  // =========================================================================
  const validatePassword = (pwd: string): boolean => {
    return /[a-zA-Z]/.test(pwd) && pwd.length >= 10;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};
    if (!regUsername.trim()) errors.username = "請輸入用戶名";
    if (!regLastName.trim()) errors.lastName = "請輸入姓";
    if (!regFirstName.trim()) errors.firstName = "請輸入名";
    if (!regEmail.trim()) errors.email = "請輸入電子信箱";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(regEmail)) errors.email = "信箱格式不正確";
    if (!validatePassword(regPassword)) errors.password = "密碼須至少10個字元且包含英文字母";
    if (regPassword !== regConfirmPassword) errors.confirmPassword = "密碼不一致";
    setRegErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setIsRegistering(true);
    try {
      await api.post("/auth/register", {
        username: regUsername,
        email: regEmail,
        password: regPassword,
        first_name: regFirstName,
        last_name: regLastName,
      });
      // 切換到「等待驗證」畫面，不關閉 Dialog
      setPendingVerificationEmail(regEmail);
      setShowResendInDialog(false);
      // 15 秒後顯示重寄按鈕
      setTimeout(() => setShowResendInDialog(true), 15000);
    } catch (err: any) {
      const msg = err.response?.data?.detail ?? "註冊失敗，請稍後再試";
      toast({ title: "錯誤", description: msg, variant: "destructive" });
    } finally {
      setIsRegistering(false);
    }
  };

  // =========================================================================
  // Resend Verification
  // =========================================================================
  const handleResendVerification = async (targetEmail: string) => {
    setIsResending(true);
    try {
      await api.post("/auth/resend-verification", { email: targetEmail });
      toast({ title: "已重新寄送", description: "驗證信已寄出，請檢查信箱（含垃圾郵件匣）" });
    } catch {
      toast({ title: "寄送失敗", description: "請稍後再試", variant: "destructive" });
    } finally {
      setIsResending(false);
    }
  };

  // =========================================================================
  // Forgot Password
  // =========================================================================
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(forgotEmail)) {
      toast({ title: "錯誤", description: "請輸入有效的電子信箱", variant: "destructive" });
      return;
    }
    await api.post("/auth/forgot-password", { email: forgotEmail });
    toast({ title: "已發送", description: "密碼重設信件已發送至您的信箱" });
    setForgotOpen(false);
    setForgotEmail("");
  };

  // =========================================================================
  // Render
  // =========================================================================
  return (
    <div className="fixed inset-0 w-full h-full bg-[#FAF9F6] flex items-center justify-center p-4 overflow-y-auto">
      {/* Background Chalk Decoration */}
      <div className="absolute inset-0 chalk-dots opacity-[0.08] pointer-events-none" />

      <div
        className={`w-full max-w-[440px] bg-white border border-[#E5E2D9] p-10 flex flex-col gap-6 shadow-xl rounded-2xl transition-all duration-300 relative z-10 ${shouldShake ? "animate-shake" : ""
          }`}
      >
        {/* Brand area */}
        <div className="flex flex-col items-center gap-3">
          <img src="/img/logo/SELf_corner_Logo_transparent.png" alt="SELf-corner" className="w-40 h-40 object-contain" />
          <p className="text-[13px] text-[#706C61] italic text-center font-medium">
            每個老師，都需要一個能安心犯錯的角落。
          </p>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-[#B54A4A14] border-l-4 border-[#B54A4A] text-[#B54A4A] text-sm animate-in fade-in slide-in-from-top-1 rounded-r-md">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <p className="font-bold">{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin} className={`flex flex-col gap-4 transition-opacity duration-300 ${isValidating ? "opacity-60" : "opacity-100"}`}>
          {/* Email input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-[#A09C94] uppercase tracking-widest pl-1">Email Address</label>
            <div className="flex items-center gap-2.5 h-12 px-4 border border-[#E5E2D9] bg-[#FAF9F6]/50 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary focus-within:bg-white transition-all rounded-xl group">
              <Mail className="w-[18px] h-[18px] text-[#A09C94] shrink-0 group-focus-within:text-primary transition-colors" />
              <input
                type="email"
                placeholder="teacher@school.edu.tw"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isValidating}
                className="flex-1 text-sm bg-transparent outline-none placeholder:text-[#A09C94]/60 text-[#3D3831] font-medium"
              />
            </div>
          </div>

          {/* Password input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-[#A09C94] uppercase tracking-widest pl-1">Password</label>
            <div className="flex items-center gap-2.5 h-12 px-4 border border-[#E5E2D9] bg-[#FAF9F6]/50 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary focus-within:bg-white transition-all rounded-xl group">
              <Lock className="w-[18px] h-[18px] text-[#A09C94] shrink-0 group-focus-within:text-primary transition-colors" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isValidating}
                className="flex-1 text-sm bg-transparent outline-none placeholder:text-[#A09C94]/60 text-[#3D3831] font-medium"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isValidating}
                className="text-[#A09C94] hover:text-[#3D3831] transition-colors shrink-0"
              >
                {showPassword ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
              </button>
            </div>
          </div>

          {/* Forgot password */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setForgotOpen(true)}
              disabled={isValidating}
              className="text-[12px] text-primary font-bold hover:underline transition-all"
            >
              忘記密碼？
            </button>
            <button
              type="button"
              onClick={() => {
                if (!email.trim()) {
                  toast({ title: "提示", description: "請先在上方輸入您的 Email", variant: "destructive" });
                  return;
                }
                handleResendVerification(email);
              }}
              disabled={isValidating}
              className="text-[12px] text-[#706C61] font-bold hover:text-primary hover:underline transition-all"
            >
              沒收到驗證信？
            </button>
          </div>

          {/* Login button */}
          <button
            type="submit"
            className={`w-full h-12 mt-2 font-heading text-[13px] font-bold tracking-[0.1em] transition-all flex items-center justify-center gap-2 rounded-xl shadow-lg ${isFilled
              ? "bg-primary text-white hover:bg-[#C8694F] shadow-primary/20"
              : "bg-[#D4C4B8] text-white/60 cursor-not-allowed"
              } ${isValidating ? "cursor-wait" : ""}`}
            disabled={!isFilled || isValidating}
          >
            {isValidating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                正在驗證身份...
              </>
            ) : (
              "登入系統 LOGIN"
            )}
          </button>

          {/* Google Login button */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isValidating}
            className="w-full h-12 border border-[#E5E2D9] bg-white hover:bg-[#FAF9F6] text-[#3D3831] font-heading text-[13px] font-bold tracking-[0.05em] transition-all flex items-center justify-center gap-3 rounded-xl"
          >
            <svg viewBox="0 0 24 24" width="18" height="18">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            使用 Google 登入
          </button>

          {/* Signup link */}
          <div className="flex items-center justify-center gap-2 mt-4 text-[13px]">
            <span className="text-[#706C61] font-medium">還沒有帳號嗎？</span>
            <button
              type="button"
              onClick={() => setRegisterOpen(true)}
              disabled={isValidating}
              className="text-primary font-bold hover:underline transition-all"
            >
              立即註冊
            </button>
          </div>
        </form>
      </div>

      {/* Registration Dialog */}
      <Dialog open={registerOpen} onOpenChange={(open) => {
        setRegisterOpen(open);
        if (!open) {
          // 關閉 Dialog 時重設所有狀態
          setPendingVerificationEmail("");
          setShowResendInDialog(false);
          setRegUsername(""); setRegLastName(""); setRegFirstName("");
          setRegEmail(""); setRegPassword(""); setRegConfirmPassword("");
          setRegErrors({});
        }
      }}>
        <DialogContent className="sm:max-w-md border-none p-0 overflow-hidden rounded-2xl shadow-2xl">
          <div className="bg-[#3D3831] p-6 text-white flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg">
              <Lock className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-heading text-xl font-bold">
                {pendingVerificationEmail ? "驗證您的信箱" : "建立教師帳號"}
              </h2>
              <p className="text-xs text-white/60 font-medium">
                {pendingVerificationEmail ? "Check your inbox" : "Create your safe practice space"}
              </p>
            </div>
          </div>
          {pendingVerificationEmail ? (
            /* ── 等待驗證畫面 ── */
            <div className="p-8 flex flex-col items-center text-center gap-5">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <Mail className="w-8 h-8 text-primary" />
              </div>
              <div className="space-y-2">
                <p className="font-heading text-lg font-bold text-[#3D3831]">驗證信已寄出！</p>
                <p className="text-sm text-[#706C61] leading-relaxed">
                  我們已將驗證連結寄至<br />
                  <span className="font-bold text-[#3D3831]">{pendingVerificationEmail}</span><br />
                  請前往信箱點擊連結完成驗證，<br />
                  完成後返回此頁面即可自動登入。
                </p>
                <p className="text-xs text-[#A09C94]">
                  找不到信？請檢查垃圾郵件匣
                </p>
              </div>
              {showResendInDialog ? (
                <button
                  type="button"
                  onClick={() => handleResendVerification(pendingVerificationEmail)}
                  disabled={isResending}
                  className="text-[13px] text-primary font-bold hover:underline transition-all flex items-center gap-2"
                >
                  {isResending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  沒收到？重新寄送驗證信
                </button>
              ) : (
                <div className="flex items-center gap-2 text-xs text-[#A09C94]">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  等待驗證中...
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  setRegisterOpen(false);
                  setPendingVerificationEmail("");
                }}
                className="text-[12px] text-[#706C61] hover:text-[#3D3831] font-medium transition-all mt-2"
              >
                返回登入頁面
              </button>
            </div>
          ) : (

            <form onSubmit={handleRegister} className="p-8 space-y-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-[#A09C94] uppercase tracking-wider">用戶名稱</Label>
                <Input placeholder="teacher_wang" value={regUsername} onChange={(e) => setRegUsername(e.target.value)} className="bg-[#FAF9F6] border-[#E5E2D9] rounded-xl" />
                {regErrors.username && <p className="text-xs text-destructive">{regErrors.username}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold text-[#A09C94] uppercase tracking-wider">姓氏</Label>
                  <Input placeholder="王" value={regLastName} onChange={(e) => setRegLastName(e.target.value)} className="bg-[#FAF9F6] border-[#E5E2D9] rounded-xl" />
                  {regErrors.lastName && <p className="text-xs text-destructive">{regErrors.lastName}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold text-[#A09C94] uppercase tracking-wider">名字</Label>
                  <Input placeholder="大明" value={regFirstName} onChange={(e) => setRegFirstName(e.target.value)} className="bg-[#FAF9F6] border-[#E5E2D9] rounded-xl" />
                  {regErrors.firstName && <p className="text-xs text-destructive">{regErrors.firstName}</p>}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-[#A09C94] uppercase tracking-wider">電子信箱</Label>
                <Input type="email" placeholder="teacher@school.edu.tw" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} className="bg-[#FAF9F6] border-[#E5E2D9] rounded-xl" />
                {regErrors.email && <p className="text-xs text-destructive">{regErrors.email}</p>}
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-[#A09C94] uppercase tracking-wider">設定密碼</Label>
                <div className="relative">
                  <Input
                    type={showRegPassword ? "text" : "password"}
                    placeholder="至少 10 個字元，含英文字母"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    className="bg-[#FAF9F6] border-[#E5E2D9] rounded-xl"
                  />
                  <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A09C94]" onClick={() => setShowRegPassword(!showRegPassword)}>
                    {showRegPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {regErrors.password && <p className="text-xs text-destructive">{regErrors.password}</p>}
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-[#A09C94] uppercase tracking-wider">確認密碼</Label>
                <div className="relative">
                  <Input
                    type={showRegConfirmPassword ? "text" : "password"}
                    placeholder="再輸入一次密碼"
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    className="bg-[#FAF9F6] border-[#E5E2D9] rounded-xl"
                  />
                  <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A09C94]" onClick={() => setShowRegConfirmPassword(!showRegConfirmPassword)}>
                    {showRegConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {regErrors.confirmPassword && <p className="text-xs text-destructive">{regErrors.confirmPassword}</p>}
              </div>
              <DialogFooter className="pt-4">
                <Button type="submit" disabled={isRegistering} className="w-full h-12 bg-primary text-white font-heading font-bold rounded-xl shadow-lg shadow-primary/20 hover:bg-[#C8694F]">
                  {isRegistering ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  註冊並開始練習
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Forgot Password Dialog */}
      <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
        <DialogContent className="sm:max-w-md border-none p-0 overflow-hidden rounded-2xl shadow-2xl">
          <div className="bg-[#3D3831] p-6 text-white">
            <h2 className="font-heading text-xl font-bold">重設密碼</h2>
          </div>
          <form onSubmit={handleForgotPassword} className="p-8 space-y-4">
            <p className="text-sm text-[#706C61] leading-relaxed font-medium">
              請輸入您的電子信箱，我們將發送密碼重設連結給您。
            </p>
            <Input
              type="email"
              placeholder="您的電子信箱"
              value={forgotEmail}
              onChange={(e) => setForgotEmail(e.target.value)}
              className="bg-[#FAF9F6] border-[#E5E2D9] rounded-xl h-12"
            />
            <DialogFooter className="pt-2">
              <Button type="submit" className="w-full h-12 bg-[#3D3831] text-white font-heading font-bold rounded-xl">發送驗證信件</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
