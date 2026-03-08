"use client";

import { useState } from "react";
import { auth, db } from "@/lib/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { collection, getDocs } from "firebase/firestore";
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

      // Login Firebase
      const cred = await signInWithEmailAndPassword(auth, email, senha);

      // Buscar usuário no Firestore
      const snap = await getDocs(collection(db,"usuarios"));

      let usuario:any = null;

      snap.forEach((doc)=>{

        const data = doc.data();

        if(data.email === email){
          usuario = data;
        }

      });

      if(!usuario){

        setErro("Usuário não autorizado.");
        setCarregando(false);
        return;

      }

      const role = usuario.role;

      // Redirecionamento
      if(role === "admin"){

        router.push("/dashboard");

      }else if(role === "user"){

        router.push("/dashboard");

      }else if(role === "almoxarifado"){

        router.push("/dashboard");

      }else{

        setErro("Usuário sem permissão definida.");
        setCarregando(false);

      }

    } catch (error){

      console.error(error);
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
            className="w-full p-3 border rounded-lg mb-4"
            value={email}
            onChange={(e)=>setEmail(e.target.value)}
            required
          />

          <div className="relative mb-6">

            <input
              type={mostrarSenha ? "text" : "password"}
              placeholder="Sua senha"
              className="w-full p-3 border rounded-lg"
              value={senha}
              onChange={(e)=>setSenha(e.target.value)}
              required
            />

            <span
              onClick={()=>setMostrarSenha(!mostrarSenha)}
              className="absolute right-3 top-3 cursor-pointer text-gray-500 text-sm"
            >
              {mostrarSenha ? "Ocultar" : "Mostrar"}
            </span>

          </div>

          <button
            type="submit"
            disabled={carregando}
            className="w-full bg-blue-600 text-white p-3 rounded-lg font-semibold"
          >
            {carregando ? "Entrando..." : "Entrar"}
          </button>

        </form>

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