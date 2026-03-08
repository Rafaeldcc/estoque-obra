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
  const [erro,setErro] = useState("");

  async function handleLogin(e:any){

    e.preventDefault();

    try{

      const cred = await signInWithEmailAndPassword(auth,email,senha);

      const uid = cred.user.uid;

      const snap = await getDoc(doc(db,"usuarios",uid));

      if(!snap.exists()){
        setErro("Usuário sem permissão.");
        return;
      }

      router.push("/dashboard");

    }catch{
      setErro("Email ou senha inválidos.");
    }

  }

  return(

    <div className="flex items-center justify-center min-h-screen bg-gray-100">

      <div className="bg-white p-10 rounded-xl shadow w-96">

        <h1 className="text-2xl font-bold text-center mb-6">
          Estoque F.Vieira
        </h1>

        {erro &&(
          <div className="bg-red-100 text-red-600 p-2 rounded mb-4 text-center">
            {erro}
          </div>
        )}

        <form onSubmit={handleLogin}>

          <input
            placeholder="Email"
            value={email}
            onChange={(e)=>setEmail(e.target.value)}
            className="border p-2 rounded w-full mb-3"
          />

          <input
            type="password"
            placeholder="Senha"
            value={senha}
            onChange={(e)=>setSenha(e.target.value)}
            className="border p-2 rounded w-full mb-4"
          />

          <button className="bg-blue-600 text-white w-full py-2 rounded">
            Entrar
          </button>

        </form>

        <div className="text-center mt-4">

          <Link
            href="/criar-conta"
            className="text-blue-600 text-sm"
          >
            Criar conta / Definir senha
          </Link>

        </div>

      </div>

    </div>

  );

}