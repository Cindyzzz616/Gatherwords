import {
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  GoogleAuthProvider,
  linkWithCredential,
  linkWithPopup,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { Platform } from "react-native";
import { auth } from "./firebaseAuth";
import { db } from "./firebaseConfig";

export async function saveUsername(userId: string, username: string) {
  const trimmedUsername = username.trim();
  if (!trimmedUsername) throw new Error("Enter a username.");
  await setDoc(doc(db, "users", userId), { username: trimmedUsername }, { merge: true });
  return trimmedUsername;
}

export async function loadUsername(userId: string) {
  const snapshot = await getDoc(doc(db, "users", userId));
  const username = snapshot.data()?.username;
  return typeof username === "string" ? username : null;
}

export async function signUpWithEmail(email: string, password: string, username: string) {
  const credential = EmailAuthProvider.credential(email.trim(), password);
  const result = auth.currentUser?.isAnonymous
    ? await linkWithCredential(auth.currentUser, credential)
    : await createUserWithEmailAndPassword(auth, email.trim(), password);
  await saveUsername(result.user.uid, username);
  return result.user;
}

export async function logInWithEmail(email: string, password: string) {
  return (await signInWithEmailAndPassword(auth, email.trim(), password)).user;
}

export async function signInWithGoogle(username?: string) {
  if (Platform.OS !== "web") {
    throw new Error("Google sign-in is currently available in the web build. Use email and password on this device.");
  }

  const provider = new GoogleAuthProvider();
  const result = auth.currentUser?.isAnonymous
    ? await linkWithPopup(auth.currentUser, provider)
    : await signInWithPopup(auth, provider);
  if (username?.trim()) await saveUsername(result.user.uid, username);
  return result.user;
}

export async function logOut() {
  await signOut(auth);
}

export type AccountUser = User;
