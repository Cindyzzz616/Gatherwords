// Import the functions you need from the SDKs you need
import { getApp, getApps, initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyC44RQIelJ8Wl9Zmq6j_SL0HOpzDhOeyec",
  authDomain: "gatherwords-2e216.firebaseapp.com",
  projectId: "gatherwords-2e216",
  storageBucket: "gatherwords-2e216.firebasestorage.app",
  messagingSenderId: "258950160147",
  appId: "1:258950160147:web:f1bafb6016452b148f44e6",
  measurementId: "G-9ZEKELTWDE"
};

// Initialize Firebase
export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);
