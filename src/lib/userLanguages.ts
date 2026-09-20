import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./firebaseConfig";
import { parseLanguageCodes, type LanguageCode, type LanguageField, type UserLanguages } from "./languages";

function userDocument(userId: string) {
  if (!userId || userId.includes("/")) throw new Error("A valid user ID is required.");
  return doc(db, "users", userId);
}

export async function loadUserLanguages(userId: string): Promise<UserLanguages> {
  const snapshot = await getDoc(userDocument(userId));
  const data = snapshot.data();
  return {
    nativeLanguage: parseLanguageCodes(data?.nativeLanguage),
    targetLanguage: parseLanguageCodes(data?.targetLanguage),
  };
}

export async function saveUserLanguages(
  userId: string,
  field: LanguageField,
  languages: LanguageCode[],
) {
  await setDoc(userDocument(userId), {
    [field]: languages,
  }, { merge: true });
}
