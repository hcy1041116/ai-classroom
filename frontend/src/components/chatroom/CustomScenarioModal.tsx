import { useState } from "react";
import { Loader2, Sparkles, AlertCircle, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import api from "@/lib/api";
import type { Scenario } from "@/lib/collectionData";

interface Props {
  open: boolean;
  onClose: () => void;
  /** 生成成功後回傳新情境供直接選取 */
  onCreated: (scenario: Scenario) => void;
  /** 傳入代表編輯模式 */
  editScenario?: Scenario | null;
  onDeleted?: (id: number) => void;
}

const MAX_TITLE = 100;
const MAX_DESC = 500;
const MIN_DESC = 50;

export default function CustomScenarioModal({
  open,
  onClose,
  onCreated,
  editScenario = null,
  onDeleted,
}: Props) {
  const isEdit = !!editScenario;
  const [title, setTitle] = useState(editScenario?.title ?? "");
  const [description, setDescription] = useState(editScenario?.description ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  // reset state when dialog opens/closes
  const handleOpenChange = (v: boolean) => {
    if (!v) {
      setTitle(editScenario?.title ?? "");
      setDescription(editScenario?.description ?? "");
      setError(null);
      setDeleteConfirm(false);
      onClose();
    }
  };

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim()) {
      setError("請填寫標題和情境描述");
      return;
    }
    if (title.trim().length < 2) {
      setError("標題至少 2 個字");
      return;
    }
    if (description.trim().length < MIN_DESC) {
      setError(`情境描述至少 ${MIN_DESC} 個字元，描述越詳細學生的反應越真實`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = { title: title.trim(), description: description.trim() };
      const res = isEdit
        ? await api.put(`/scenarios/${editScenario!.id}`, payload)
        : await api.post("/scenarios", payload);

      const s = res.data;
      onCreated({
        id: s.id,
        title: s.title,
        tag: s.sel_category,
        emoji: s.emoji,
        description: s.description,
        short_desc: s.short_desc,
        tags: s.tags ?? [],
        practice_count: s.practice_count ?? 0,
        estimated_minutes: s.estimated_minutes ?? 10,
        is_custom: true,
      } as Scenario);
      handleOpenChange(false);
    } catch (e: any) {
      const msg = e?.response?.data?.detail ?? "生成失敗，請稍後再試";
      setError(typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) {
      setDeleteConfirm(true);
      return;
    }
    setLoading(true);
    try {
      await api.delete(`/scenarios/${editScenario!.id}`);
      onDeleted?.(editScenario!.id);
      handleOpenChange(false);
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? "刪除失敗");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <Sparkles className="w-5 h-5 text-primary" />
            {isEdit ? "編輯自訂情境" : "建立自訂情境"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 pt-1">
          {/* Title */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sc-title" className="text-sm font-semibold">
              情境標題
            </Label>
            <Input
              id="sc-title"
              placeholder="例：學生在課堂上突然情緒崩潰"
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, MAX_TITLE))}
              disabled={loading}
            />
            <span className="text-xs text-muted-foreground text-right">
              {title.length}/{MAX_TITLE}
            </span>
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sc-desc" className="text-sm font-semibold">
              情境描述
              <span className="ml-2 font-normal text-muted-foreground text-xs">
                （描述真實遇到的班級事件即可，AI 會自動生成互動內容）
              </span>
            </Label>
            <Textarea
              id="sc-desc"
              placeholder="例：上數學課時，一位平時成績不錯的學生突然趴在桌上不願抬頭，旁邊同學悄悄告訴我他剛才哭了..."
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, MAX_DESC))}
              disabled={loading}
              className="resize-none"
            />
            <span className={`text-xs text-right ${description.trim().length < MIN_DESC ? "text-orange-400" : "text-muted-foreground"}`}>
              {description.trim().length < MIN_DESC
                ? `${description.length}/${MIN_DESC} 字元（至少需 ${MIN_DESC} 字元）`
                : `${description.length}/${MAX_DESC}`}
            </span>
          </div>

          {/* Error */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Info */}
          {!isEdit && (
            <p className="text-xs text-muted-foreground bg-muted rounded-lg px-3 py-2">
              AI 將根據你的描述自動生成學生視角的互動提示與情緒狀態，約需 5-10 秒。
            </p>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-1">
            {isEdit ? (
              <Button
                variant={deleteConfirm ? "destructive" : "ghost"}
                size="sm"
                onClick={handleDelete}
                disabled={loading}
                className="gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {deleteConfirm ? "確認刪除？" : "刪除情境"}
              </Button>
            ) : (
              <span />
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={loading}>
                取消
              </Button>
              <Button onClick={handleSubmit} disabled={loading} className="gap-2 min-w-[100px]">
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    生成中...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    {isEdit ? "儲存" : "AI 生成"}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
