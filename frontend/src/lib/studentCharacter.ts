/**
 * Utility for student character images.
 * Avatar thumbnails → /avatars/{name}.png   (static, no emotion switching)
 * Full-body illustrations → /img/students/{name}_{emotionChinese}.png  (emotion switching)
 */

const EMOTION_TO_CHINESE: Record<string, string> = {
  neutral: "中性",
  angry: "憤怒",
  sad: "悲傷",
  thinking: "好奇",
  frustrated: "挫折",
  anxious: "焦慮",
  confident: "自信",
  happy: "開心",
  surprised: "驚訝",
};

export type StudentEmotion = keyof typeof EMOTION_TO_CHINESE;

/** Returns the full-body illustration path for a given character name + emotion. */
export function getStudentImagePath(characterName: string, emotion: string): string {
  const emotionChinese = EMOTION_TO_CHINESE[emotion] ?? "中性";
  return `/img/students/${characterName}_${emotionChinese}.png`;
}

/** Returns the static avatar thumbnail path (no emotion variant). */
export function getAvatarPath(characterName: string): string {
  return `/avatars/${characterName}.png`;
}

/** Preload all emotion images for a character to prevent flicker on first switch. */
export function preloadCharacterImages(characterName: string): void {
  Object.values(EMOTION_TO_CHINESE).forEach((emotionCn) => {
    const img = new Image();
    img.src = `/img/students/${characterName}_${emotionCn}.png`;
  });
}
