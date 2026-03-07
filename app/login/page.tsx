"use client";

import { useState } from "react";
import { auth, db } from "@/lib/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {

  const router = useRouter();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function handleLogin(e: React.FormEvent) {

    e.preventDefault();
    setErro("");
    setCarregando(true);

    try {

      const cred = await signInWithEmailAndPassword(auth, email, senha);

      const userDoc = await getDoc(doc(db, "usuarios", cred.user.uid));

      if (!userDoc.exists()) {
        setErro("Usuário sem permissão.");
        setCarregando(false);
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

    } catch {

      setErro("Email ou senha inválidos.");
      setCarregando(false);

    }

  }

  return (

    <div className="flex items-center justify-center min-h-screen bg-gray-100">

      <div className="bg-white p-10 rounded-2xl shadow-xl w-96">

        <div className="text-center mb-8">

          <h1 className="text-3xl font-bold text-gray-800">
            Estoque F.Vieira
          </h1>

          <p className="text-gray-500 mt-2 text-sm">
            Controle Profissional de Materiais
          </p>

        </div>

        {erro && (
          <div className="bg-red-100 text-red-600 text-sm p-2 rounded mb-4 text-center">
            {erro}
          </div>
        )}

        <form onSubmit={handleLogin}>

          <input
            type="email"
            placeholder="Seu email"
            className="w-full p-3 border rounded-lg mb-4 focus:ring-2 focus:ring-blue-500 outline-none"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <div className="relative mb-6">

            <input
              type={mostrarSenha ? "text" : "password"}
              placeholder="Sua senha"
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
            />

            <span
              onClick={() => setMostrarSenha(!mostrarSenha)}
              className="absolute right-3 top-3 cursor-pointer text-gray-500 text-sm"
            >
              {mostrarSenha ? "Ocultar" : "Mostrar"}
            </span>

          </div>

          <button
            type="submit"
            disabled={carregando}
            className="w-full bg-blue-600 text-white p-3 rounded-lg font-semibold hover:bg-blue-700 transition flex justify-center items-center"
          >
            {carregando ? "Entrando..." : "Entrar"}
          </button>

        </form>

        {/* LINK PARA CRIAR CONTA */}

        <div className="text-center mt-5">

          <Link
            href="/criar-conta"
            className="text-blue-600 hover:underline text-sm"
          >
            Criar conta / Definir senha
          </Link>

        </div>

      </div>

    </div>

  );

}