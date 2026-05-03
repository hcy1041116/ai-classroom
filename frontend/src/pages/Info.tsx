import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "@/hooks/use-toast";
import AppLayout from "@/components/AppLayout";
import { Activity, Pencil, Save, X, User as UserIcon, Calendar, Shield, School, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/lib/auth";
import api from "@/lib/api";

export default function Info() {
  const { user: storeUser, setUser } = useAuthStore();

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    first_name: storeUser?.first_name ?? "",
    last_name: storeUser?.last_name ?? "",
    school: storeUser?.school ?? "",
    experience_years: storeUser?.experience_years ?? "",
  });
  const [totalSessions, setTotalSessions] = useState<number | null>(null);

  useEffect(() => {
    api.get("/session/count")
      .then((res) => setTotalSessions(typeof res.data.count === "number" ? res.data.count : 0))
      .catch(() => setTotalSessions(0));
  }, []);

  const displayName = storeUser
    ? `${storeUser.last_name ?? ""}${storeUser.first_name ?? storeUser.username}`
    : "使用者";
  const initial = displayName.charAt(0).toUpperCase();

  const handleSave = async () => {
    if (!storeUser) return;
    try {
      const res = await api.put("/auth/me", {
        first_name: editForm.first_name || null,
        last_name: editForm.last_name || null,
        school: editForm.school || null,
        experience_years: editForm.experience_years || null,
      });
      setUser({ ...storeUser, ...res.data });
      setIsEditing(false);
      toast({ title: "儲存成功", description: "您的個人資料已更新" });
    } catch {
      toast({ title: "儲存失敗", description: "請稍後再試", variant: "destructive" });
    }
  };

  const handleCancel = () => {
    setEditForm({
      first_name: storeUser?.first_name ?? "",
      last_name: storeUser?.last_name ?? "",
      school: storeUser?.school ?? "",
      experience_years: storeUser?.experience_years ?? "",
    });
    setIsEditing(false);
  };

  return (
    <AppLayout>
      <div className="p-8 md:p-12 max-w-5xl mx-auto flex flex-col gap-10 min-h-full animate-in fade-in duration-500">
        {/* Header */}
        <div className="flex items-center justify-between pl-12 lg:pl-0">
          <div className="flex flex-col gap-1">
            <span className="font-heading text-[10px] font-bold tracking-[0.2em] text-primary uppercase">Personal Space</span>
            <h1 className="font-heading text-3xl font-bold text-[#3D3831] tracking-tight">個人帳號管理</h1>
          </div>
          <Badge className="bg-[#3D3831] text-white px-3 py-1 font-heading text-[10px] tracking-widest uppercase rounded-full">
            Pro Member
          </Badge>
        </div>

        <div className="grid md:grid-cols-3 gap-8 items-stretch">
          {/* Sidebar Stats + Security */}
          <div className="flex flex-col gap-6 h-full">
            {/* Stats Card */}
            <div className="bg-[#3D3831] rounded-2xl shadow-xl p-8 flex flex-col items-center text-center gap-4 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-full chalk-dots opacity-10 pointer-events-none" />
              <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center text-primary mb-2 relative z-10">
                <Activity className="w-8 h-8" />
              </div>
              <div className="relative z-10">
                <p className="text-xs text-white/50 font-bold uppercase tracking-widest mb-1">Total Sessions</p>
                <p className="font-heading text-6xl font-bold text-white tracking-tighter">
                  {totalSessions === null ? "–" : totalSessions}
                </p>
              </div>
              <div className="w-full h-px bg-white/10 my-2 relative z-10" />
              <div className="flex flex-col gap-1 relative z-10">
                <p className="text-xs text-secondary font-bold uppercase tracking-wider">Skill Level: Expert</p>
                <p className="text-[11px] text-white/40 font-medium">超過 85% 使用者</p>
              </div>
            </div>

            {/* Security Card */}
            <div className="bg-white border border-[#E5E2D9] rounded-2xl p-6 shadow-sm flex flex-col items-center justify-center text-center gap-3 flex-1 group cursor-pointer hover:border-primary/30 transition-all">
               <div className="w-12 h-12 bg-[#FAF9F6] rounded-xl flex items-center justify-center">
                  <Shield className="w-6 h-6 text-[#A09C94] group-hover:text-primary transition-colors" />
               </div>
               <div>
                  <h3 className="font-heading text-[13px] font-bold text-[#3D3831]">帳號安全設定</h3>
                  <p className="text-[11px] text-[#706C61] font-medium mt-0.5">修改密碼與驗證身分</p>
               </div>
            </div>
          </div>

          {/* Main Profile Form */}
          <div className="md:col-span-2">
            <div className="bg-white border border-[#E5E2D9] rounded-2xl shadow-sm overflow-hidden">
              {/* Profile Top Banner */}
              <div className="h-24 bg-[#FAF9F6] border-b border-[#E5E2D9] relative">
                 <div className="absolute -bottom-12 left-8">
                    <div className="relative group">
                       <Avatar className="h-24 w-24 border-4 border-white shadow-xl bg-white">
                         <AvatarImage src={undefined} />
                         <AvatarFallback className="bg-primary text-white text-2xl font-heading font-bold">
                           {initial}
                         </AvatarFallback>
                       </Avatar>
                       <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                          <UserIcon className="w-6 h-6 text-white" />
                       </div>
                    </div>
                 </div>
                 <div className="absolute bottom-4 right-8">
                    {!isEditing ? (
                      <button
                        onClick={() => setIsEditing(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-[#E5E2D9] rounded-lg text-xs font-bold text-[#3D3831] hover:border-primary hover:text-primary transition-all shadow-sm"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        編輯基本資料
                      </button>
                    ) : (
                      <div className="flex gap-2">
                        <button onClick={handleCancel} className="flex items-center gap-2 px-4 py-2 bg-white border border-[#E5E2D9] rounded-lg text-xs font-bold text-[#706C61] hover:bg-muted/30 transition-all">
                          <X className="w-3.5 h-3.5" />
                          取消
                        </button>
                        <button onClick={handleSave} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-xs font-bold shadow-lg shadow-primary/20 hover:bg-[#C8694F] transition-all">
                          <Save className="w-3.5 h-3.5" />
                          儲存變更
                        </button>
                      </div>
                    )}
                 </div>
              </div>

              {/* Form Content */}
              <div className="pt-16 pb-10 px-10">
                <div className="mb-8">
                   <h2 className="font-heading text-xl font-bold text-[#3D3831]">{displayName}</h2>
                   <p className="text-sm text-[#706C61] font-medium flex items-center gap-2 mt-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {storeUser?.email}
                   </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                  {/* Field Last Name */}
                  <div className="flex flex-col gap-2">
                    <Label className="font-heading text-[10px] font-bold text-[#A09C94] uppercase tracking-[0.15em]">姓氏</Label>
                    {isEditing ? (
                      <Input value={editForm.last_name} onChange={e => setEditForm({...editForm, last_name: e.target.value})} className="bg-[#FAF9F6] border-[#E5E2D9] rounded-xl font-medium" />
                    ) : (
                      <div className="h-10 flex items-center px-4 bg-[#FAF9F6] rounded-lg border border-transparent font-bold text-[#3D3831]">{storeUser?.last_name || "–"}</div>
                    )}
                  </div>

                  {/* Field First Name */}
                  <div className="flex flex-col gap-2">
                    <Label className="font-heading text-[10px] font-bold text-[#A09C94] uppercase tracking-[0.15em]">名字</Label>
                    {isEditing ? (
                      <Input value={editForm.first_name} onChange={e => setEditForm({...editForm, first_name: e.target.value})} className="bg-[#FAF9F6] border-[#E5E2D9] rounded-xl font-medium" />
                    ) : (
                      <div className="h-10 flex items-center px-4 bg-[#FAF9F6] rounded-lg border border-transparent font-bold text-[#3D3831]">{storeUser?.first_name || "–"}</div>
                    )}
                  </div>

                  {/* Field Username */}
                  <div className="flex flex-col gap-2">
                    <Label className="font-heading text-[10px] font-bold text-[#A09C94] uppercase tracking-[0.15em]">用戶名稱</Label>
                    <div className="h-10 flex items-center px-4 bg-[#FAF9F6] rounded-lg border border-transparent font-bold text-[#3D3831]">
                      {storeUser?.username || "–"}
                    </div>
                  </div>

                  {/* Field Email */}
                  <div className="flex flex-col gap-2">
                    <Label className="font-heading text-[10px] font-bold text-[#A09C94] uppercase tracking-[0.15em]">電子郵件</Label>
                    <div className="h-10 flex items-center px-4 bg-[#FAF9F6] rounded-lg border border-transparent font-bold text-[#3D3831]">{storeUser?.email || "–"}</div>
                  </div>

                  {/* Field School */}
                  <div className="flex flex-col gap-2">
                    <Label className="font-heading text-[10px] font-bold text-[#A09C94] uppercase tracking-[0.15em] flex items-center gap-1">
                      <School className="w-3 h-3" />服務單位
                    </Label>
                    {isEditing ? (
                      <Input
                        value={editForm.school}
                        onChange={e => setEditForm({...editForm, school: e.target.value})}
                        placeholder="例：台北市立明德國中"
                        className="bg-[#FAF9F6] border-[#E5E2D9] rounded-xl font-medium"
                      />
                    ) : (
                      <div className="h-10 flex items-center px-4 bg-[#FAF9F6] rounded-lg border border-transparent font-bold text-[#3D3831]">{storeUser?.school || "–"}</div>
                    )}
                  </div>

                  {/* Field Experience Years */}
                  <div className="flex flex-col gap-2">
                    <Label className="font-heading text-[10px] font-bold text-[#A09C94] uppercase tracking-[0.15em] flex items-center gap-1">
                      <Clock className="w-3 h-3" />教學年資
                    </Label>
                    {isEditing ? (
                      <Input
                        value={editForm.experience_years}
                        onChange={e => setEditForm({...editForm, experience_years: e.target.value})}
                        placeholder="例：5 年"
                        className="bg-[#FAF9F6] border-[#E5E2D9] rounded-xl font-medium"
                      />
                    ) : (
                      <div className="h-10 flex items-center px-4 bg-[#FAF9F6] rounded-lg border border-transparent font-bold text-[#3D3831]">{storeUser?.experience_years || "–"}</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
