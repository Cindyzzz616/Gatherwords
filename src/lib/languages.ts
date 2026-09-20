export const LANGUAGES = [
  { label: "English", code: "en" },
  { label: "French", code: "fr" },
  { label: "Spanish", code: "es" },
  { label: "Mandarin", code: "zh" },
  { label: "Punjabi", code: "pa" },
  { label: "Hindi", code: "hi" },
  { label: "Arabic", code: "ar" },
] as const;

export type LanguageCode = (typeof LANGUAGES)[number]["code"];
export type LanguageField = "nativeLanguage" | "targetLanguage";
export type UserLanguages = Record<LanguageField, LanguageCode[]>;

export function parseLanguageCode(value: unknown): LanguageCode | null {
  return LANGUAGES.find((language) => language.code === value)?.code ?? null;
}

export function parseLanguageCodes(value: unknown): LanguageCode[] {
  const values = Array.isArray(value) ? value : value == null ? [] : [value];
  return [...new Set(values.map(parseLanguageCode).filter((code): code is LanguageCode => code !== null))];
}
