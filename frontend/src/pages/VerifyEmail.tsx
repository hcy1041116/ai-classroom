

// 點擊驗證信的連結後會開啟的頁面

import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import api from "@/lib/api";

export default function VerifyEmail() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
    const [message, setMessage] = useState("");

    useEffect(() => {
        const token = searchParams.get("token");
        if (!token) {
            setStatus("error");
            setMessage("缺少驗證碼");
            return;
        }

        api.get(`/auth/verify-email?token=${token}`)
            .then(() => {
                setStatus("success");
                setMessage("信箱驗證成功！此頁面即將關閉...");
                setTimeout(() => {
                    window.close();
                    // 如果瀏覽器不允許關閉，fallback 顯示提示
                    setMessage("驗證成功！請關閉此分頁，回到原本的頁面。");
                }, 2000);
            })
            .catch((err) => {
                setStatus("error");
                setMessage(err.response?.data?.detail || "驗證連結無效或已過期");
            });
    }, [searchParams, navigate]);

    return (
        <div className="fixed inset-0 bg-[#FAF9F6] flex items-center justify-center">
            <div className="text-center space-y-4 p-8">
                {status === "loading" && (
                    <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" />
                )}
                {status === "success" && (
                    <>
                        <CheckCircle2 className="w-14 h-14 text-green-500 mx-auto" />
                        <p className="text-lg font-semibold text-green-700">{message}</p>
                    </>
                )}
                {status === "error" && (
                    <>
                        <XCircle className="w-14 h-14 text-red-500 mx-auto" />
                        <p className="text-lg font-semibold text-red-700">{message}</p>
                        <button
                            onClick={() => navigate("/login")}
                            className="text-primary underline mt-2"
                        >
                            返回登入
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}