"""
Utilities - Conversation Logger
對話逐字稿匯出工具
"""
from datetime import datetime
from typing import List
from pathlib import Path


class ConversationLogger:
    def __init__(self, export_dir: str = "./exports"):
        self.export_dir = Path(export_dir)
        self.export_dir.mkdir(exist_ok=True, parents=True)

    def export_session_transcript(
        self,
        session_uuid: str,
        transcripts: List[dict],
        format: str = "markdown",
    ) -> str:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        if format == "markdown":
            filename = f"{session_uuid}_{timestamp}.md"
            content = self._generate_markdown(session_uuid, transcripts)
        else:
            filename = f"{session_uuid}_{timestamp}.txt"
            content = self._generate_text(session_uuid, transcripts)

        filepath = self.export_dir / filename
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)
        return str(filepath)

    def _generate_markdown(self, session_uuid: str, transcripts: List[dict]) -> str:
        lines = [
            f"# 對話記錄 - {session_uuid}",
            f"",
            f"**匯出時間**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
            f"**總對話數**: {len(transcripts)} 則",
            "",
            "---",
            "",
        ]
        for i, t in enumerate(transcripts, 1):
            speaker = "👩‍🏫 **老師**" if t["speaker"] == "teacher" else "🧑‍🎓 **學生**"
            lines += [
                f"### #{i} {speaker}",
                f"**時間**: {t.get('timestamp', '')}",
                "",
                t.get("text", ""),
                "",
                "---",
                "",
            ]
        return "\n".join(lines)

    def _generate_text(self, session_uuid: str, transcripts: List[dict]) -> str:
        lines = [
            f"對話記錄 - {session_uuid}",
            "=" * 60,
            f"匯出時間: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
            "",
        ]
        for i, t in enumerate(transcripts, 1):
            speaker = "[老師]" if t["speaker"] == "teacher" else "[學生]"
            lines += [
                f"#{i} {speaker} ({t.get('timestamp', '')})",
                t.get("text", ""),
                "",
                "-" * 60,
                "",
            ]
        return "\n".join(lines)
