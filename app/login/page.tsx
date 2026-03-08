"use client";

import { useState } from "react";
import { auth, db } from "@/lib/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {

  const router = useRouter();

  const [email,setEmail] = useState("");
  const [senha,setSenha] = useState("");
  const [mostrarSenha,setMostrarSenha] = useState(false);
  const [erro,setErro] = useState("");
  const [loading,setLoading] = useState(false);

  async function handleLogin(e:any){

    e.preventDefault();
    setErro("");
    setLoading(true);

    try{

      const cred = await signInWithEmailAndPassword(auth,email,senha);

      const uid = cred.user.uid;

      const snap = await getDoc(doc(db,"usuarios",uid));

      if(!snap.exists()){

        setErro("Usuário sem permissão.");
        setLoading(false);
        return;

      }

      const role = snap.data().role;

      if(role === "admin"){
        router.push("/dashboard");
      }
      else if(role === "user"){
        router.push("/dashboard");
      }
      else if(role === "almoxarifado"){
        router.push("/dashboard");
      }
      else{
        setErro("Usuário sem permissão definida.");
        setLoading(false);
      }

    }catch(error){

      console.error(error);
      setErro("Email ou senha inválidos.");
      setLoading(false);

    }

  }

  return(

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

        {erro &&(

          <div className="bg-red-100 text-red-600 text-sm p-2 rounded mb-4 text-center">
            {erro}
          </div>

        )}

        <form onSubmit={handleLogin}>

          <input
            type="email"
            placeholder="Seu email"
            value={email}
            onChange={(e)=>setEmail(e.target.value)}
            className="w-full p-3 border rounded-lg mb-4"
            required
          />

          <div className="relative mb-6">

            <input
              type={mostrarSenha ? "text":"password"}
              placeholder="Sua senha"
              value={senha}
              onChange={(e)=>setSenha(e.target.value)}
              className="w-full p-3 border rounded-lg"
              required
            />

            <span
              onClick={()=>setMostrarSenha(!mostrarSenha)}
              className="absolute right-3 top-3 cursor-pointer text-gray-500 text-sm"
            >
              {mostrarSenha ? "Ocultar":"Mostrar"}
            </span>

          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white p-3 rounded-lg"
          >
            {loading ? "Entrando..." : "Entrar"}
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