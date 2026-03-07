"use client";

import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  setDoc
} from "firebase/firestore";

import { db, auth } from "@/lib/firebase";
import { useAuth } from "@/lib/useAuth";
import { createUserWithEmailAndPassword } from "firebase/auth";

interface Usuario {
  id: string;
  nome: string;
  role: string;
  empresaId: string;
}

export default function UsuariosPage() {

  const { user, loading } = useAuth();

  const [usuarios,setUsuarios] = useState<Usuario[]>([]);

  const [nome,setNome] = useState("");
  const [email,setEmail] = useState("");
  const [senha,setSenha] = useState("");
  const [role,setRole] = useState("user");
  const [empresaId,setEmpresaId] = useState("empresa_1");

  useEffect(()=>{

    carregarUsuarios();

  },[]);


  async function carregarUsuarios(){

    const snap = await getDocs(collection(db,"usuarios"));

    const lista:Usuario[] = [];

    snap.forEach((docSnap)=>{

      lista.push({
        id:docSnap.id,
        ...(docSnap.data() as any)
      });

    });

    setUsuarios(lista);

  }


  async function criarUsuario(){

    if(!nome || !email || !senha){
      alert("Preencha todos os campos");
      return;
    }

    try{

      const cred = await createUserWithEmailAndPassword(
        auth,
        email,
        senha
      );

      const uid = cred.user.uid;

      await setDoc(doc(db,"usuarios",uid),{

        nome,
        role,
        empresaId

      });

      alert("Usuário criado com sucesso");

      setNome("");
      setEmail("");
      setSenha("");

      carregarUsuarios();

    }catch(error){

      console.error(error);
      alert("Erro ao criar usuário");

    }

  }


  async function excluirUsuario(id:string){

    if(!confirm("Excluir usuário?")) return;

    await deleteDoc(doc(db,"usuarios",id));

    carregarUsuarios();

  }


  if(loading) return null;


  return(

    <div className="max-w-5xl mx-auto p-8 space-y-8">

      <h1 className="text-3xl font-bold">
        Gerenciar Usuários
      </h1>


      {/* CRIAR USUÁRIO */}

      <div className="bg-white p-6 rounded-xl shadow space-y-4">

        <h2 className="text-lg font-semibold">
          Criar usuário
        </h2>

        <input
          placeholder="Nome"
          value={nome}
          onChange={(e)=>setNome(e.target.value)}
          className="border p-2 rounded w-full"
        />

        <input
          placeholder="Email"
          value={email}
          onChange={(e)=>setEmail(e.target.value)}
          className="border p-2 rounded w-full"
        />

        <input
          placeholder="Senha"
          type="password"
          value={senha}
          onChange={(e)=>setSenha(e.target.value)}
          className="border p-2 rounded w-full"
        />

        <select
          value={role}
          onChange={(e)=>setRole(e.target.value)}
          className="border p-2 rounded w-full"
        >
          <option value="user">Usuário</option>
          <option value="admin">Administrador</option>
        </select>

        <input
          placeholder="empresaId"
          value={empresaId}
          onChange={(e)=>setEmpresaId(e.target.value)}
          className="border p-2 rounded w-full"
        />

        <button
          onClick={criarUsuario}
          className="bg-blue-600 text-white px-5 py-2 rounded"
        >
          Criar usuário
        </button>

      </div>


      {/* LISTA */}

      <div className="space-y-4">

        <h2 className="text-lg font-semibold">
          Usuários cadastrados
        </h2>

        {usuarios.map((usuario)=>(

          <div
            key={usuario.id}
            className="flex justify-between items-center bg-white p-4 rounded shadow"
          >

            <div>

              <div className="font-semibold">
                {usuario.nome}
              </div>

              <div className="text-sm text-gray-500">
                Role: {usuario.role}
              </div>

              <div className="text-sm text-gray-500">
                Empresa: {usuario.empresaId}
              </div>

            </div>

            <button
              onClick={()=>excluirUsuario(usuario.id)}
              className="bg-red-600 text-white px-3 py-1 rounded"
            >
              Excluir
            </button>

          </div>

        ))}

      </div>

    </div>

  );

}