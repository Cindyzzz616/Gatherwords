import { addDoc, collection, doc, onSnapshot, setDoc } from "firebase/firestore";

import { db } from "./firebaseConfig";

export type UserContact = {
  id: string;
  name: string;
  phoneNumber: string;
};

export async function addUserContact(userId: string, name: string, phoneNumber: string) {
  const trimmedName = name.trim();
  const trimmedPhoneNumber = phoneNumber.trim();
  if (!trimmedName || !trimmedPhoneNumber) {
    throw new Error("Enter both a name and phone number.");
  }

  await addDoc(collection(db, "users", userId, "contacts"), {
    name: trimmedName,
    phoneNumber: trimmedPhoneNumber,
  });
}

export function subscribeToUserContacts(
  userId: string,
  onChange: (contacts: UserContact[]) => void,
) {
  return onSnapshot(collection(db, "users", userId, "contacts"), (snapshot) => {
    onChange(snapshot.docs.map((contact) => {
      const data = contact.data();
      return {
        id: contact.id,
        name: typeof data.name === "string" ? data.name : "",
        phoneNumber: typeof data.phoneNumber === "string" ? data.phoneNumber : "",
      };
    }));
  });
}

export async function saveContactChatId(userId: string, contactId: string, chatId: string) {
  await setDoc(doc(db, "users", userId, "contacts", contactId), { linqChatId: chatId }, { merge: true });
}
