
// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDtV9gfRaeayHxr_IslIwB4QD3_FNin3h8",
  authDomain: "canvasnote-ycx8y.firebaseapp.com",
  projectId: "canvasnote-ycx8y",
  storageBucket: "canvasnote-ycx8y.firebasestorage.app",
  messagingSenderId: "646483323411",
  appId: "1:646483323411:web:f9fc3fbafcfc9a8573ade6"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export { db, auth, googleProvider };
