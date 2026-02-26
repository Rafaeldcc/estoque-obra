import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDVPQV37mBO5QfknQcnhHCCu7KjAblwgzw",
  authDomain: "estoque-obra.firebaseapp.com",
  projectId: "estoque-obra",
  storageBucket: "estoque-obra.firebasestorage.app",
  messagingSenderId: "598372144788",
  appId: "1:598372144788:web:25d3028b9d7f6684d0681"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);