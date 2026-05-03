"""
Agent Layer - Student Voice Pipeline
整合 OpenAI Realtime API 與 LiveKit，提供即時語音互動。
職責：學生語音回應 + 逐輪 semantic_analysis 情緒記錄。
"""
import asyncio
import os
import json
import base64
import websockets
from typing import Optional, Callable
from datetime import datetime
from dotenv import load_dotenv

from livekit import rtc
from livekit.agents import JobContext, JobRequest, WorkerOptions, cli

from agents.prompts import build_student_prompt, TOOLS_SCHEMA, build_semantic_analysis_prompt
from database import async_session_maker
from models import EmotionLog, Session, Scenario, StudentPersonality, Transcript, GradeLevel
from langchain_openai import ChatOpenAI
from sqlalchemy import select

load_dotenv()

local_analyzer_llm = ChatOpenAI(model="gpt-3.5-turbo", temperature=0.3)

REALTIME_MODEL = "gpt-4o-realtime-preview-2024-12-17"
SAMPLE_RATE = 24000
CHANNELS = 1


class OpenAIRealtimeClient:
    """管理與 OpenAI Realtime API 的 WebSocket 連線"""

    def __init__(self, api_key: str, pipeline_instance):
        self.url = f"wss://api.openai.com/v1/realtime?model={REALTIME_MODEL}"
        self.api_key = api_key
        self.pipeline = pipeline_instance
        self.ws: Optional[websockets.WebSocketClientProtocol] = None

        self.on_audio_delta: Optional[Callable[[bytes], None]] = None
        self.on_user_transcription: Optional[Callable[[str], None]] = None
        self.on_agent_response: Optional[Callable[[str], None]] = None
        self.on_agent_transcript_delta: Optional[Callable[[str], None]] = None

    async def connect(self, system_prompt: str):
        if not self.api_key:
            print("[OpenAI] ❌ 錯誤：找不到 API Key，請檢查 .env 檔案中的 OPENAI_API_KEY")
            return

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "OpenAI-Beta": "realtime=v1",
        }

        try:
            print(f"[OpenAI] 正在嘗試連線至: {self.url}")
            # 設定連線超時，避免無限等待
            self.ws = await asyncio.wait_for(
                websockets.connect(self.url, additional_headers=headers), 
                timeout=10.0
            )
            print("[OpenAI] ✅ WebSocket 握手成功！連線已建立。")

            # 初始 Session 更新
            await self.send_event({
                "type": "session.update",
                "session": {
                    "modalities": ["text", "audio"],
                    "voice": "alloy",
                    "instructions": system_prompt,
                    "tools": TOOLS_SCHEMA,
                    "tool_choice": "auto",
                    "turn_detection": {"type": "server_vad"},
                    "input_audio_transcription": {"model": "whisper-1"},
                },
            })
            print("[OpenAI] ✅ 初始 Session 指令已送出")

        except websockets.exceptions.InvalidStatusCode as e:
            print(f"[OpenAI] ❌ 連線被拒絕！HTTP 狀態碼: {e.status_code}")
            if e.status_code == 401:
                print("   👉 提示：API Key 可能無效。")
            elif e.status_code == 403:
                print("   👉 提示：您的 OpenAI 帳號可能沒有 Realtime API 的使用權限（通常需 Tier 5）。")
            elif e.status_code == 429:
                print("   👉 提示：額度不足或觸發頻率限制。")
            self.ws = None
            raise
        except asyncio.TimeoutError:
            print("[OpenAI] ❌ 連線超時，請檢查網路環境或代理伺服器設定。")
            self.ws = None
            raise
        except Exception as e:
            print(f"[OpenAI] ❌ 連線發生未預期錯誤: {type(e).__name__}: {e}")
            self.ws = None
            raise

    async def send_event(self, event: dict):
        if not self.ws:
            print("[OpenAI] ⚠️ 警告：嘗試在未連線狀態下發送事件。")
            return
        
        try:
            await self.ws.send(json.dumps(event))
        except Exception as e:
            # 這裡就是抓取你之前噴出 error 的地方
            state = getattr(self.ws, 'state', 'Unknown')
            print(f"[OpenAI] ❌ 發送事件失敗！WS 狀態: {state}, 錯誤: {e}")
            raise

    async def send_audio_append(self, pcm_b64: str):
        await self.send_event({
            "type": "input_audio_buffer.append",
            "audio": pcm_b64,
        })

    async def loop(self):
        if not self.ws:
            return
        try:
            async for message in self.ws:
                data = json.loads(message)
                event_type = data.get("type")

                if event_type != "response.audio.delta":
                    print(f"[OpenAI Event] {event_type}")

                if event_type == "response.audio.delta":
                    delta_b64 = data.get("delta")
                    if delta_b64 and self.on_audio_delta:
                        await self.on_audio_delta(base64.b64decode(delta_b64))

                elif event_type == "conversation.item.input_audio_transcription.completed":
                    transcript = data.get("transcript")
                    print(f"[OpenAI] Transcription completed, transcript={repr(transcript)}")
                    if transcript and self.on_user_transcription:
                        await self.on_user_transcription(transcript)

                elif event_type == "conversation.item.input_audio_transcription.failed":
                    print(f"[OpenAI] ⚠️ 語音轉文字失敗: {data}")

                elif event_type == "error":
                    print(f"[OpenAI] ⚠️ 收到 API 錯誤事件: {data}")

                elif event_type == "response.function_call_arguments.done":
                    call_id = data.get("call_id")
                    function_name = data.get("name")
                    arguments = json.loads(data.get("arguments", "{}"))

                    result = ""
                    if function_name == "semantic_analysis":
                        try:
                            result = await self.pipeline.exec_semantic_analysis(
                                arguments.get("teacher_input", "")
                            )
                        except Exception as sa_err:
                            print(f"[OpenAI] ⚠️ semantic_analysis error: {sa_err}, using fallback emotions")
                            result = json.dumps(self.pipeline.last_emotion_scores or {})

                    await self.send_event({
                        "type": "conversation.item.create",
                        "item": {
                            "type": "function_call_output",
                            "call_id": call_id,
                            "output": result,
                        },
                    })
                    await self.send_event({"type": "response.create"})

                elif event_type == "response.audio_transcript.delta":
                    delta = data.get("delta", "")
                    if delta and self.on_agent_transcript_delta:
                        await self.on_agent_transcript_delta(delta)

                elif event_type == "response.output_item.done":
                    item = data.get("item", {})
                    for c in item.get("content", []):
                        if c.get("type") == "audio" and "transcript" in c:
                            if self.on_agent_response:
                                await self.on_agent_response(c["transcript"])

        except websockets.exceptions.ConnectionClosed as e:
            print(f"[OpenAI] ℹ️ 連線已正常或非預期關閉: {e.code} {e.reason}")
        except Exception as e:
            print(f"[OpenAI] ❌ 迴圈發生錯誤: {e}")


class StudentVoicePipeline:
    """學生語音互動管線（LiveKit ↔ OpenAI Realtime API）"""

    def __init__(self, ctx: JobContext):
        self.ctx = ctx
        self.room = ctx.room
        self.api_key = os.getenv("OPENAI_API_KEY")
        self.client = OpenAIRealtimeClient(self.api_key, self)

        self.source = rtc.AudioSource(SAMPLE_RATE, CHANNELS)
        self.track = rtc.LocalAudioTrack.create_audio_track("student_voice", self.source)

        self.turn_count = 0
        self.db_session_id: Optional[int] = None
        self.last_emotion_scores: dict = {}
        self.scenario_title: str = ""
        self.scenario_description: str = ""
        self.personality_type: str = ""
        self.domain_weights: dict = {}

    async def _resolve_session_id(self) -> Optional[int]:
        room_name = self.room.name
        async with async_session_maker() as db:
            result = await db.execute(
                select(Session).where(Session.livekit_room_name == room_name)
            )
            session = result.scalar_one_or_none()
            return session.id if session else None

    async def _load_dynamic_prompt(self) -> str:
        room_name = self.room.name
        print(f"[Pipeline] Loading prompt for room: {room_name!r}")

        for attempt in range(3):
            try:
                async with async_session_maker() as db:
                    result = await db.execute(
                        select(Session).where(Session.livekit_room_name == room_name)
                    )
                    session = result.scalar_one_or_none()

                    if not session:
                        if attempt < 2:
                            print(f"[Pipeline] Session not found, retrying in 1s... (attempt {attempt+1})")
                            await asyncio.sleep(1)
                            continue
                        print(f"[Pipeline] WARNING: Session not found for room: {room_name!r}")
                        break

                    self.db_session_id = session.id

                    scenario = None
                    if session.scenario_id:
                        r = await db.execute(select(Scenario).where(Scenario.id == session.scenario_id))
                        scenario = r.scalar_one_or_none()

                    personality = None
                    if session.personality_id:
                        r = await db.execute(select(StudentPersonality).where(StudentPersonality.id == session.personality_id))
                        personality = r.scalar_one_or_none()

                    if scenario and personality:
                        self.scenario_title = scenario.title
                        self.scenario_description = scenario.description or scenario.title
                        self.personality_type = personality.personality_type or ""
                        self.domain_weights = personality.domain_weights or {}
                        self.last_emotion_scores = scenario.initial_emotions or {
                            "HAPPY": 0.10, "SAD": 0.20, "ANGRY": 0.05, "SURPRISED": 0.05,
                            "ANXIOUS": 0.30, "FRUSTRATED": 0.15, "CONFIDENT": 0.10,
                            "CURIOUS": 0.15, "NEUTRAL": 0.40,
                        }
                        grade = None
                        if session.session_metadata:
                            grade_id = session.session_metadata.get("grade_id")
                            if grade_id:
                                r = await db.execute(select(GradeLevel).where(GradeLevel.id == grade_id))
                                grade = r.scalar_one_or_none()
                        return build_student_prompt(scenario, personality, grade=grade)

                    break

            except Exception as e:
                print(f"[Pipeline] DB error: {e}")
                break

        return "請務必使用繁體中文（台灣用語）。你是一位國中一年級的學生，與老師進行 SEL 對話練習。"

    async def start(self):
        # 1. 先連接 LiveKit 房間
        await self.ctx.connect()
        options = rtc.TrackPublishOptions(source=rtc.TrackSource.SOURCE_MICROPHONE)
        await self.room.local_participant.publish_track(self.track, options)

        # 2. 載入 Prompt 並連接 OpenAI
        system_prompt = await self._load_dynamic_prompt()
        
        try:
            await self.client.connect(system_prompt)
        except Exception:
            print("[Pipeline] ❌ 關鍵錯誤：無法初始化 OpenAI 連線，中斷任務。")
            return

        self.client.on_audio_delta = self.handle_audio_delta
        self.client.on_agent_response = self.handle_agent_text_response
        self.client.on_user_transcription = self.handle_user_transcription
        self.client.on_agent_transcript_delta = self.handle_agent_transcript_delta

        # 3. 啟動非同步監聽迴圈
        audio_task = asyncio.create_task(self.client.loop())

        # 4. 註冊事件監聽
        @self.room.on("track_subscribed")
        def on_track_subscribed(track, publication, participant):
            if track.kind == rtc.TrackKind.KIND_AUDIO:
                asyncio.create_task(self.handle_track_audio(track))

        @self.room.on("data_received")
        def on_data_received(data_packet: rtc.DataPacket):
            try:
                message = json.loads(bytes(data_packet.data).decode("utf-8"))
                if message.get("type") == "teacher_text_input":
                    text = message.get("text", "").strip()
                    if text:
                        asyncio.create_task(self.handle_teacher_text_input(text))
            except Exception:
                pass

        # 主動掃描音軌
        for participant in self.room.remote_participants.values():
            for publication in participant.track_publications.values():
                if publication.kind == rtc.TrackKind.KIND_AUDIO:
                    if not publication.subscribed:
                        publication.set_subscribed(True)
                    if publication.track:
                        asyncio.create_task(self.handle_track_audio(publication.track))

        shutdown_future = asyncio.Future()

        def _on_shutdown(reason):
            if not shutdown_future.done():
                shutdown_future.set_result(reason)

        self.ctx.add_shutdown_callback(_on_shutdown)
        
        await shutdown_future

        audio_task.cancel()
        if self.client.ws:
            await self.client.ws.close()

    # ... (其餘 handle_xxx 函式保持不變)
    async def handle_audio_delta(self, pcm_data: bytes):
        samples_count = len(pcm_data) // 2
        frame = rtc.AudioFrame(data=pcm_data, sample_rate=SAMPLE_RATE, num_channels=CHANNELS, samples_per_channel=samples_count)
        await self.source.capture_frame(frame)

    async def handle_agent_transcript_delta(self, delta: str):
        payload = json.dumps({"type": "agent_transcript_delta", "delta": delta}).encode("utf-8")
        await self.room.local_participant.publish_data(payload, reliable=True)

    async def handle_agent_text_response(self, text: str):
        if self.db_session_id:
            async with async_session_maker() as db:
                db.add(Transcript(session_id=self.db_session_id, speaker="student", text=text, source="realtime"))
                await db.commit()
        payload = json.dumps({"type": "agent_response", "text": text}).encode("utf-8")
        await self.room.local_participant.publish_data(payload, reliable=True)

    async def handle_user_transcription(self, text: str):
        if self.db_session_id:
            async with async_session_maker() as db:
                db.add(Transcript(session_id=self.db_session_id, speaker="teacher", text=text, source="realtime"))
                await db.commit()
        payload = json.dumps({"type": "user_transcription", "text": text}).encode("utf-8")
        await self.room.local_participant.publish_data(payload, reliable=True)

    async def handle_teacher_text_input(self, text: str):
        if self.db_session_id:
            async with async_session_maker() as db:
                db.add(Transcript(session_id=self.db_session_id, speaker="teacher", text=text, source="text"))
                await db.commit()
        await self.client.send_event({
            "type": "conversation.item.create",
            "item": {"type": "message", "role": "user", "content": [{"type": "input_text", "text": text}]},
        })
        await self.client.send_event({"type": "response.create"})

    async def handle_track_audio(self, track: rtc.RemoteAudioTrack):
        audio_stream = rtc.AudioStream(track, sample_rate=SAMPLE_RATE)
        async for frame in audio_stream:
            if not self.client.ws: break
            pcm_b64 = base64.b64encode(frame.frame.data).decode("utf-8")
            await self.client.send_audio_append(pcm_b64)

    async def exec_semantic_analysis(self, teacher_input: str) -> str:
        # (保持原有的情緒分析邏輯...)
        self.turn_count += 1
        prompt = build_semantic_analysis_prompt(
            teacher_input,
            self.last_emotion_scores,
            self.scenario_description,
            self.personality_type,
            self.domain_weights,
        )
        response = await local_analyzer_llm.ainvoke(prompt)
        emotion_json_str = response.content
        try:
            emotion_scores = json.loads(emotion_json_str)
            self.last_emotion_scores = emotion_scores
            if self.db_session_id:
                async with async_session_maker() as db:
                    db.add(EmotionLog(session_id=self.db_session_id, turn_number=self.turn_count, teacher_input=teacher_input, 
                                      timestamp=datetime.utcnow(), **{k.lower(): v for k, v in emotion_scores.items()}))
                    await db.commit()
        except: pass
        return emotion_json_str

# =============================================================================
# LiveKit Worker Entry Points
# =============================================================================

async def entrypoint(ctx: JobContext):
    pipeline = StudentVoicePipeline(ctx)
    await pipeline.start()

async def request_fnc(ctx: JobRequest):
    await ctx.accept()

if __name__ == "__main__":
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint, request_fnc=request_fnc))