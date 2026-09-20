import type { LanguageCode } from "./languages";

type TranslationResponse = {
  data?: {
    translations?: Array<{ translatedText?: string }>;
  };
  error?: { message?: string };
};

function decodeHtmlEntities(text: string) {
  return text
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

export async function translateText(
  text: string,
  source: LanguageCode,
  target: LanguageCode,
  signal?: AbortSignal,
) {
  if (source === target) return text;

  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_CLOUD_API_KEY;
  if (!apiKey) {
    throw new Error("Add EXPO_PUBLIC_GOOGLE_CLOUD_API_KEY to .env and restart Expo.");
  }

  const response = await fetch(
    `https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ q: text, source, target, format: "text" }),
      signal,
    },
  );
  const result = await response.json() as TranslationResponse;
  const translation = result.data?.translations?.[0]?.translatedText;

  if (!response.ok || !translation) {
    throw new Error(result.error?.message ?? "Google Cloud Translation failed.");
  }

  return decodeHtmlEntities(translation);
}
