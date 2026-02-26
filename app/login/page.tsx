"use client";

import { useState } from "react";
import { auth, db } from "@/lib/firebase";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import {
  doc,
  setDoc,
  getDocs,
  collection,
  serverTimestamp,
} from "firebase/firestore";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setErro("");

    try {
      await signInWithEmailAndPassword(auth, email, senha);
      router.push("/dashboard");
    } catch {
      setErro("Email ou senha inválidos.");
    }
  }

  async function handleRegister() {
    setErro("");

    try {
      const cred = await createUserWithEmailAndPassword(
        auth,
        email,
        senha
      );

      const user = cred.user;

      // Verifica se já existe usuário (para definir admin)
      const usuariosSnap = await getDocs(collection(db, "usuarios"));

      let role = "usuario";

      if (usuariosSnap.empty) {
        role = "admin";
      }

      await setDoc(doc(db, "usuarios", user.uid), {
        email: user.email,
        role: role,
        criadoEm: serverTimestamp(),
      });

      router.push("/dashboard");
    } catch (err: any) {
      setErro("Erro ao criar usuário.");
      console.error(err);
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <form
        onSubmit={handleLogin}
        className="bg-white p-8 rounded-xl shadow-md w-96"
      >
        <h1 className="text-2xl font-bold mb-6 text-center">
          Sistema de Estoque
        </h1>

        {erro && (
          <p className="text-red-500 text-sm mb-4 text-center">{erro}</p>
        )}

        <input
          type="email"
          placeholder="Email"
          className="w-full p-2 border rounded mb-4"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <input
          type="password"
          placeholder="Senha"
          className="w-full p-2 border rounded mb-4"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          required
        />

        <button
          type="submit"
          className="w-full bg-blue-600 text-white p-2 rounded mb-2 hover:bg-blue-700"
        >
          Entrar
        </button>

        <button
          type="button"
          onClick={handleRegister}
          className="w-full bg-gray-200 p-2 rounded hover:bg-gray-300"
        >
          Criar Conta
        </button>
      </form>
    </div>
  );
}