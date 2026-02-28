"use client";

import { useState } from "react";
import { auth, db } from "@/lib/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
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
      const cred = await signInWithEmailAndPassword(auth, email, senha);

      const userDoc = await getDoc(doc(db, "usuarios", cred.user.uid));

      if (!userDoc.exists()) {
        setErro("Usuário sem permissão.");
        return;
      }

      const role = userDoc.data().role;

      if (role === "admin") {
        router.push("/dashboard");
      } else if (role === "almoxarifado") {
        router.push("/controle");
      } else {
        router.push("/dashboard");
      }

    } catch (err: any) {
      setErro("Email ou senha inválidos.");
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <form
        onSubmit={handleLogin}
        className="bg-white p-8 rounded-xl shadow-md w-96"
      >
        <h1 className="text-2xl font-bold mb-6 text-center">
          Sistema Profissional de Estoque
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
          className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700"
        >
          Entrar
        </button>
      </form>
    </div>
  );
}