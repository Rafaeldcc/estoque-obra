"use client";

import { useState } from "react";
import { auth, db } from "@/lib/firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from "firebase/auth";
import {
  collection,
  getDocs,
  doc,
  setDoc
} from "firebase/firestore";
import { useRouter } from "next/navigation";

export default function CriarContaPage() {

  const router = useRouter();

  const [email,setEmail] = useState("");
  const [senha,setSenha] = useState("");
  const [loading,setLoading] = useState(false);

  async function criarConta(){

    if(!email || !senha){
      alert("Preencha todos os campos");
      return;
    }

    setLoading(true);

    try{

      // 🔎 verifica se email está autorizado
      const snap = await getDocs(collection(db,"usuarios"));

      let usuarioEncontrado:any = null;

      snap.forEach((docSnap)=>{

        const data = docSnap.data();

        if(data.email === email){
          usuarioEncontrado = data;
        }

      });

      if(!usuarioEncontrado){

        alert("Este email não está autorizado no sistema.");
        setLoading(false);
        return;

      }

      try{

        // 🚀 tenta criar conta
        const cred = await createUserWithEmailAndPassword(auth,email,senha);

        const uid = cred.user.uid;

        // salva no firestore usando UID
        await setDoc(doc(db,"usuarios",uid),{
          ...usuarioEncontrado,
          uid,
          email
        });

        alert("Conta criada com sucesso!");

        router.push("/dashboard");

      }catch(error:any){

        // 🔄 se já existir → faz login
        if(error.code === "auth/email-already-in-use"){

          await signInWithEmailAndPassword(auth,email,senha);

          alert("Conta já existia. Login realizado.");

          router.push("/dashboard");

        }else{

          throw error;

        }

      }

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