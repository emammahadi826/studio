// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  projectId: "canvasnote-ycx8y",
  appId: "1:646483323411:web:d752e3d1fd8b3c4073ade6",
  storageBucket: "canvasnote-ycx8y.firebasestorage.app",
  apiKey: "AIzaSyDtV9gfRaeayHxr_IslIwB4QD3_FNin3h8",
  authDomain: "canvasnote-ycx8y.firebaseapp.com",
  messagingSenderId: "646483323411",
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth };
