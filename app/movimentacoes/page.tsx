"use client";

import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  query,
  orderBy,
  getDoc,
  doc
} from "firebase/firestore";

import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/useAuth";

type Movimentacao = {
  id: string;
  materialNome: string;
  tipo: "entrada" | "saida" | "transferencia";
  quantidade: number;
  obraNome: string;
  obraDestino?: string | null;
  destino?: "uso" | "transferencia";
  usuarioNome: string;
  createdAt?: any;
  criadoEm?: any;
  empresaId?: string;
};

export default function MovimentacoesPage() {

  const { user, loading } = useAuth();

  const [role,setRole] = useState<string | null>(null);
  const [empresaId,setEmpresaId] = useState<string | null>(null);

  const [movimentacoes,setMovimentacoes] = useState<Movimentacao[]>([]);
  const [carregando,setCarregando] = useState(true);


  useEffect(()=>{

    if(!user) return;

    carregarUsuario();

  },[user]);


  useEffect(()=>{

    if((role === "admin" || role === "almoxarifado") && empresaId){

      carregarMovimentacoes();

    }

  },[role,empresaId]);


  async function carregarUsuario(){

    if(!user) return;

    const snap = await getDoc(doc(db,"usuarios",user.uid));

    if(snap.exists()){

      const data = snap.data();

      setRole(data.role);
      setEmpresaId(data.empresaId);

    }

  }


  async function carregarMovimentacoes(){

    if(!empresaId) return;

    setCarregando(true);

    try{

      const q = query(
        collection(db,"movimentacoes"),
        orderBy("createdAt","desc")
      );

      const snap = await getDocs(q);

      const lista = snap.docs
        .map(doc=>({
          id:doc.id,
          ...doc.data()
        }))
        .filter((mov:any)=>mov.empresaId === empresaId) as Movimentacao[];

      setMovimentacoes(lista);

    }catch(error){

      console.error("Erro ao carregar movimentações:",error);
      setMovimentacoes([]);

    }

    setCarregando(false);

  }


  function formatarData(mov:Movimentacao){

    const data = mov.createdAt || mov.criadoEm;

    if(!data) return "";

    try{

      return data.toDate().toLocaleString("pt-BR");

    }catch{

      return "";

    }

  }


  if(loading) return null;


  if(role !== "admin" && role !== "almoxarifado"){

    return(

      <div className="p-10 text-center text-red-600 font-semibold">
        Você não tem permissão para acessar esta página.
      </div>

    );

  }


  return(

    <div className="max-w-6xl mx-auto p-8 flex flex-col h-[85vh]">

      <h1 className="text-3xl font-bold mb-6">
        Histórico de Movimentações
      </h1>

      {carregando && <p>Carregando...</p>}

      {!carregando && movimentacoes.length === 0 && (

        <p className="text-gray-500">
          Nenhuma movimentação encontrada.
        </p>

      )}

      {/* LISTA COM ROLAGEM */}
      <div className="space-y-4 overflow-y-auto flex-1 pr-3">

        {movimentacoes.map((mov)=>(

          <div
            key={mov.id}
            className={`p-5 rounded-xl shadow border ${
              mov.tipo === "entrada"
                ? "bg-green-50 border-green-200"
                : mov.tipo === "transferencia"
                ? "bg-blue-50 border-blue-200"
                : "bg-red-50 border-red-200"
            }`}
          >

            <div className="flex justify-between items-center">

              <strong className="text-lg">
                📦 {mov.materialNome}
              </strong>

              <span
                className={`font-semibold ${
                  mov.tipo === "entrada"
                    ? "text-green-600"
                    : mov.tipo === "transferencia"
                    ? "text-blue-600"
                    : "text-red-600"
                }`}
              >

                {mov.tipo === "entrada" && "🟢 Entrada"}
                {mov.tipo === "saida" && "🔴 Saída"}
                {mov.tipo === "transferencia" && "🔵 Transferência"}

              </span>

            </div>

            <div className="mt-2">
              Quantidade: <b>{mov.quantidade}</b>
            </div>

            <div>
              Obra origem: <b>{mov.obraNome}</b>
            </div>

            {mov.tipo === "entrada" && (
              <div>Em estoque</div>
            )}

            {mov.tipo === "transferencia" && mov.obraDestino && (
              <div>
                Transferido para obra: <b>{mov.obraDestino}</b>
              </div>
            )}

            {mov.tipo === "saida" && mov.destino === "uso" && (
              <div>Usado na obra</div>
            )}

            <div>
              Usuário: <b>{mov.usuarioNome}</b>
            </div>

            <div className="text-sm text-gray-500 mt-2">
              📅 {formatarData(mov)}
            </div>

          </div>

        ))}

      </div>

    </div>

  );

}