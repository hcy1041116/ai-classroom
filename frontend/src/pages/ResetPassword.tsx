

// 點擊重設密碼信的連結後會開啟的頁面

import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, Eye, EyeOff, CheckCircle2, XCircle } from "lucide-react";
import api from "@/lib/api";

export default function ResetPassword() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get("token");

    const [tokenStatus, setTokenStatus] = useState<"checking" | "valid" | "invalid">("checking");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
    const [message, setMessage] = useState("");

    // 載入時先驗證 token 是否有效
    useEffect(() => {
        if (!token) {
            setTokenStatus("invalid");
            return;
        }
        api.get(`/auth/validate-reset-token?token=${token}`)
            .then(() => setTokenStatus("valid"))
            .catch(() => setTokenStatus("invalid"));
    }, [token]);

    const handleSubmit = async () => {
        // 前端驗證（與註冊規則一致）
        if (password.length < 10 || !/[a-zA-Z]/.test(password)) {
            setStatus("error");
            setMessage("密碼須至少 10 個字元且包含英文字母");
            return;
        }
        if (password !== confirmPassword) {
            setStatus("error");
            setMessage("兩次密碼不一致");
            return;
        }

        setStatus("loading");
        try {
            await api.post("/auth/reset-password", {
                token,
                new_password: password,
            });
            setStatus("success");
            setMessage("密碼重設成功！3 秒後跳轉至登入頁面...");
            setTimeout(() => navigate("/login"), 3000);
        } catch (err: any) {
            setStatus("error");
            setMessage(err.response?.data?.detail || "重設失敗，連結可能已過期");
        }
    };

    // Token 驗證中
    if (tokenStatus === "checking") {
        return (
            <div className="fixed inset-0 bg-[#FAF9F6] flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    // Token 無效
    if (tokenStatus === "invalid") {
        return (
            <div className="fixed inset-0 bg-[#FAF9F6] flex items-center justify-center">
                <div className="text-center space-y-4">
                    <XCircle className="w-14 h-14 text-red-500 mx-auto" />
                    <p className="text-red-600 text-lg font-semibold">重設連結無效或已過期</p>
                    <button
                        onClick={() => navigate("/login")}
                        className="text-primary underline"
                    >
                        返回登入頁面
                    </button>
                </div>
            </div>
        );
    }

    // 重設表單
    return (
        <div className="fixed inset-0 bg-[#FAF9F6] flex items-center justify-center p-4">
            <div className="w-full max-w-[440px] bg-white border border-[#E5E2D9] p-10 flex flex-col gap-6 shadow-xl rounded-2xl">
                <div className="text-center">
                    <h2 className="font-heading text-xl font-bold text-[#3D3831]">設定新密碼</h2>
                    <p className="text-sm text-[#706C61] mt-2">請輸入您的新密碼</p>
                </div>

                {status === "success" ? (
                    <div className="text-center space-y-4 py-4">
                        <CheckCircle2 className="w-14 h-14 text-green-500 mx-auto" />
                        <p className="text-lg font-semibold text-green-700">{message}</p>
                    </div>
                ) : (
                    <>
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-bold text-[#A09C94] uppercase tracking-wider">
                                新密碼
                            </Label>
                            <div className="relative">
                                <Input
                                    type={showPassword ? "text" : "password"}
                                    placeholder="至少 10 個字元，含英文字母"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="bg-[#FAF9F6] border-[#E5E2D9] rounded-xl"
                                />
                                <button
                                    type="button"
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A09C94]"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-bold text-[#A09C94] uppercase tracking-wider">
                                確認新密碼
                            </Label>
                            <div className="relative">
                                <Input
                                    type={showConfirm ? "text" : "password"}
                                    placeholder="再輸入一次新密碼"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="bg-[#FAF9F6] border-[#E5E2D9] rounded-xl"
                                />
                                <button
                                    type="button"
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A09C94]"
                                    onClick={() => setShowConfirm(!showConfirm)}
                                >
                                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>

                        {message && status === "error" && (
                            <p className="text-sm text-red-600">{message}</p>
                        )}

                        <Button
                            onClick={handleSubmit}
                            disabled={status === "loading"}
                            className="w-full h-12 bg-primary text-white font-heading font-bold rounded-xl shadow-lg shadow-primary/20 hover:bg-[#C8694F]"
                        >
                            {status === "loading" ? (
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            ) : null}
                            重設密碼
                        </Button>
                    </>
                )}
            </div>
        </div>
    );
}