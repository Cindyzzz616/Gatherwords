import { signInAnonymously, type User } from "firebase/auth";
import { auth } from "./firebaseAuth";

let pendingUser: Promise<User> | null = null;

export function ensureUser(): Promise<User> {
  if (!pendingUser) {
    pendingUser = (async () => {
      await auth.authStateReady();
      return auth.currentUser ?? (await signInAnonymously(auth)).user;
    })().finally(() => {
      pendingUser = null;
    });
  }
  return pendingUser;
}
