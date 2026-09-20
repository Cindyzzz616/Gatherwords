import { addDoc, collection, onSnapshot, orderBy, query, serverTimestamp } from "firebase/firestore";

import { db } from "./firebaseConfig";

export type ConversationMessage = {
  id: string;
  text: string;
  direction: "inbound" | "outbound";
  status: "sent" | "failed";
  createdAt: number;
};

export function subscribeToContactMessages(
  userId: string,
  contactId: string,
  onChange: (messages: ConversationMessage[]) => void,
) {
  const messagesQuery = query(
    collection(db, "users", userId, "contacts", contactId, "messages"),
    orderBy("createdAt", "asc"),
  );

  return onSnapshot(messagesQuery, (snapshot) => {
    onChange(snapshot.docs.map((message) => {
      const data = message.data();
      return {
        id: message.id,
        text: typeof data.text === "string" ? data.text : "",
        direction: data.direction === "inbound" ? "inbound" : "outbound",
        status: data.status === "failed" ? "failed" : "sent",
        createdAt: typeof data.createdAt === "number" ? data.createdAt : 0,
      };
    }));
  });
}

export async function saveOutgoingMessage(
  userId: string,
  contactId: string,
  text: string,
  linqMessageId?: string,
) {
  await addDoc(collection(db, "users", userId, "contacts", contactId, "messages"), {
    text,
    direction: "outbound",
    status: "sent",
    linqMessageId: linqMessageId ?? null,
    createdAt: Date.now(),
    savedAt: serverTimestamp(),
  });
}

function getLinqServerUrl() {
  const configuredUrl = process.env.EXPO_PUBLIC_LINQ_SERVER_URL;
  if (configuredUrl) return configuredUrl.replace(/\/$/, "");

  const transcriptionUrl = process.env.EXPO_PUBLIC_TRANSCRIPTION_URL;
  return transcriptionUrl?.replace(/\/transcribe\/?$/, "") ?? "";
}

export async function sendLinqMessage(input: {
  phoneNumber: string;
  text: string;
  chatId?: string;
}) {
  const serverUrl = getLinqServerUrl();
  if (!serverUrl) throw new Error("Set EXPO_PUBLIC_LINQ_SERVER_URL to your server address.");

  const response = await fetch(`${serverUrl}/linq/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof body.detail === "string" ? body.detail : "Linq could not send this message.");
  return body as { chatId?: string; messageId?: string };
}
