import { collection, getDocs } from "firebase/firestore";
import { db } from "./firebaseConfig";
import { ensureUser } from "./ensureUser";

export type ActivityKind = "mcq" | "flashcard" | "fillintheblank";
export type PracticeActivity = {
  kind: ActivityKind;
  encounterId: string;
  prompt: string;
  answer: string;
  explanation: string;
  choices: string[];
};

export async function loadPracticeEncounters() {
  const user = await ensureUser();
  const snapshot = await getDocs(collection(db, "users", user.uid, "encounters"));
  return snapshot.docs.filter((doc) => typeof doc.data().text === "string" && doc.data().text.trim()).map((doc) => doc.id);
}

export async function generatePracticeActivity(encounterId: string, kind: ActivityKind, signal: AbortSignal): Promise<PracticeActivity> {
  const url = process.env.EXPO_PUBLIC_PRACTICE_SERVER_URL ?? process.env.EXPO_PUBLIC_TRANSCRIPTION_URL;
  if (!url) throw new Error("Set the practice server address and restart Expo.");
  const user = await ensureUser();
  const token = await user.getIdToken();
  const response = await fetch(`${url.replace(/\/$/, "")}/practice/activity`, {
    method: "POST", signal,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ encounterId, kind }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(typeof data.detail === "string" ? data.detail : "Could not generate this activity.");
  if (data.kind !== kind || typeof data.prompt !== "string" || typeof data.answer !== "string" ||
      typeof data.explanation !== "string" || !Array.isArray(data.choices) ||
      (kind === "mcq" && (data.choices.length !== 4 || !data.choices.includes(data.answer)))) {
    throw new Error("The server returned an invalid activity. Please retry.");
  }
  // Randomize answer position rather than teaching a predictable pattern.
  for (let i = data.choices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [data.choices[i], data.choices[j]] = [data.choices[j], data.choices[i]];
  }
  return data;
}
