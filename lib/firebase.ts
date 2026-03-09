import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDVPQV37mBO5QfknQcnhHCCu7KjAblwgzw",
  authDomain: "estoque-obra.firebaseapp.com",
  projectId: "estoque-obra",
  storageBucket: "estoque-obra.appspot.com",
  messagingSenderId: "598372144788",
  appId: "1:598372144788:web:25d3028b9d7f76684d0681",
};

// Evita reinicializar o Firebase no Next.js
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Serviços Firebase
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };