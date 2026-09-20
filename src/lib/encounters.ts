import { addDoc, collection } from "firebase/firestore";
import { db } from "./firebaseConfig";
import type { LanguageCode } from "./languages";

export async function addUserEncounter(
  userId: string,
  language: LanguageCode,
  text: string,
) {
  const trimmedText = text.trim();
  if (!trimmedText) return;

  await addDoc(collection(db, "users", userId, "encounters"), {
    language,
    source: "add",
    text: trimmedText,
  });
}
