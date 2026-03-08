"use client";

import { useState } from "react";
import { auth, db } from "@/lib/firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";

export default function CriarContaPage(){

  const router = useRouter();

  const [email,setEmail] = useState("");
  const [senha,setSenha] = useState("");

  async function criarConta(){

    const cred = await createUserWithEmailAndPassword(auth,email,senha);

    const uid = cred.user.uid;

    const snap = await getDocs(collection(db,"usuarios"));

    snap.forEach(async(docSnap)=>{

      const data = docSnap.data();

      if(data.email === email){

        await updateDoc(doc(db,"usuarios",docSnap.id),{
          uid
        });

      }

    });

    alert("Conta criada com sucesso");

    router.push("/login");

  }

  return(

    <div className="flex items-center justify-center min-h-screen">

      <div className="bg-white p-8 rounded shadow w-96">

        <h1 className="text-xl font-bold mb-4">
          Criar Conta
        </h1>

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

        <button
          onClick={criarConta}
          className="bg-blue-600 text-white w-full py-2 rounded"
        >
          Criar conta
        </button>

      </div>

    </div>

  );

}