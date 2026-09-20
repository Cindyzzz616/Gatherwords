import { ref, uploadBytes } from "firebase/storage";
import { File } from "expo-file-system";
import { storage } from "./firebaseConfig";
import type { LanguageCode } from "./languages";

const MIME_TYPES = {
  m4a: "audio/m4a",
  "3gp": "audio/3gpp",
  webm: "audio/webm",
} as const;

function recordingFormat(uri: string) {
  const extension = uri.match(/\.(m4a|3gp|webm)(?:\?|$)/i)?.[1]?.toLowerCase() as keyof typeof MIME_TYPES | undefined;
  return {
    extension: extension ?? "m4a",
    contentType: extension ? MIME_TYPES[extension] : MIME_TYPES.m4a,
  };
}

export async function uploadCompressedRecording(userId: string, uri: string, language: LanguageCode) {
  const audio = new File(uri);
  const { extension, contentType } = recordingFormat(uri);
  const path = `users/${userId}/recordings/${Date.now()}.${extension}`;

  await uploadBytes(ref(storage, path), audio, {
    contentType,
    customMetadata: { language, recordingQuality: "low" },
  });
  return path;
}
