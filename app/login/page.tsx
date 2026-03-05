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

    } catch (err: any) {

      setErro("Email ou senha inválidos.");
      setCarregando(false);

    }

  }

  return (

    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-100 to-gray-200">

      <div className="bg-white p-10 rounded-2xl shadow-lg w-96">

        {/* TÍTULO */}

        <div className="text-center mb-8">

          <h1 className="text-3xl font-bold text-gray-800">
            Estoque F.Vieira
          </h1>

          <p className="text-gray-500 mt-2 text-sm">
            Sistema Profissional de Controle de Materiais
          </p>

        </div>

        {/* ERRO */}

        {erro && (
          <div className="bg-red-100 text-red-600 text-sm p-2 rounded mb-4 text-center">
            {erro}
          </div>
        )}

        {/* FORM */}

        <form onSubmit={handleLogin}>

          <input
            type="email"
            placeholder="Seu email"
            className="w-full p-3 border rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Sua senha"
            className="w-full p-3 border rounded-lg mb-6 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
          />

          <button
            type="submit"
            disabled={carregando}
            className="w-full bg-blue-600 text-white p-3 rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            {carregando ? "Entrando..." : "Entrar"}
          </button>

        </form>

      </div>

    </div>

  );

}