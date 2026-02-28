import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDVPQV37mBO5QfknQcnhHCCu7KjAblwgzw",
  authDomain: "estoque-obra.firebaseapp.com",
  projectId: "estoque-obra",
  storageBucket: "estoque-obra.appspot.com",
  messagingSenderId: "598372144788",
  appId: "1:598372144788:web:25d3028b9d7f76684d0681",
};

const app =
  getApps().length === 0
    ? initializeApp(firebaseConfig)
    : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);