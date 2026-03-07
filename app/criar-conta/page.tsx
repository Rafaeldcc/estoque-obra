"use client";

import { useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";

import { db, auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";

export default function CriarContaPage() {

  const router = useRouter();

  const [email,setEmail] = useState("");
  const [senha,setSenha] = useState("");
  const [confirmar,setConfirmar] = useState("");

  const [loading,setLoading] = useState(false);

  async function criarConta(){

    if(!email || !senha){
      alert("Preencha todos os campos");
      return;
    }

    if(senha !== confirmar){
      alert("Senhas não conferem");
      return;
    }

    setLoading(true);

    try{

      const snap = await getDocs(collection(db,"usuarios"));

      const existe = snap.docs.some((doc)=>
        doc.data().email === email
      );

      if(!existe){

        alert("Este email não está autorizado no sistema.");
        setLoading(false);
        return;

      }

      await createUserWithEmailAndPassword(
        auth,
        email,
        senha
      );

      alert("Conta criada com sucesso!");

      router.push("/login");

    }catch(error){

      console.error(error);
      alert("Erro ao criar conta");

    }

    setLoading(false);

  }

  return(

    <div className="min-h-screen flex items-center justify-center bg-gray-100">

      <div className="bg-white p-8 rounded-xl shadow w-96 space-y-4">

        <h1 className="text-2xl font-bold text-center">
          Criar Conta
        </h1>

        <input
          placeholder="Email"
          value={email}
          onChange={(e)=>setEmail(e.target.value)}
          className="border p-2 rounded w-full"
        />

        <input
          type="password"
          placeholder="Senha"
          value={senha}
          onChange={(e)=>setSenha(e.target.value)}
          className="border p-2 rounded w-full"
        />

        <input
          type="password"
          placeholder="Confirmar senha"
          value={confirmar}
          onChange={(e)=>setConfirmar(e.target.value)}
          className="border p-2 rounded w-full"
        />

        <button
          onClick={criarConta}
          disabled={loading}
          className="bg-blue-600 text-white w-full py-2 rounded"
        >
          {loading ? "Criando..." : "Criar conta"}
        </button>

      </div>

    </div>

  );

}