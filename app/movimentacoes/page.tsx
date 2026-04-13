"use client";

import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  query,
  orderBy,
  getDoc,
  doc,
  deleteDoc
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
  destino?: "uso" | "transferencia" | "descarte";
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

  // 🔥 NOVO: MÊS
  const [mesSelecionado, setMesSelecionado] = useState(new Date().getMonth() + 1);


  useEffect(()=>{
    if(!user) return;
    carregarUsuario();
  },[user]);

  useEffect(()=>{
    if(empresaId){
      carregarMovimentacoes();
    }
  },[empresaId]);

  // 🔥 ATUALIZA AO TROCAR MÊS
  useEffect(()=>{
    if(empresaId){
      carregarMovimentacoes();
    }
  },[mesSelecionado]);


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
      orderBy("criadoEm","desc") // ✅ CORRIGIDO
    );

    const snap = await getDocs(q);

    const lista = snap.docs
      .map(doc=>({
        id:doc.id,
        ...doc.data()
      }))
      .filter((mov:any)=>{

        const data = mov.createdAt || mov.criadoEm;

        if(!data) return false;

        try {

          const dataMov = data.toDate();
          const mesMov = dataMov.getMonth() + 1;

          return mesMov === mesSelecionado;

        } catch {

          return false;

        }

      }) as Movimentacao[];

    setMovimentacoes(lista);

  }catch(error){

    console.error("Erro ao carregar movimentações:",error);
    setMovimentacoes([]);

  }

  setCarregando(false);
}


  async function excluirMovimentacao(id: string) {

    const confirmar = confirm("Tem certeza que deseja excluir esta movimentação?");

    if (!confirmar) return;

    try {

      await deleteDoc(doc(db, "movimentacoes", id));

      alert("Movimentação excluída!");

      carregarMovimentacoes();

    } catch (error) {

      console.error("Erro ao excluir:", error);
      alert("Erro ao excluir movimentação");

    }
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


  if(!role){

    return(
      <div className="p-10 text-center text-red-600 font-semibold">
        Usuário sem permissão definida.
      </div>
    );

  }


  return(

    <div className="max-w-6xl mx-auto p-8 flex flex-col h-[85vh]">

      {/* 🔥 HEADER COM FILTRO */}
      <div className="flex justify-between items-center mb-6">

        <h1 className="text-3xl font-bold">
          Histórico de Movimentações
        </h1>

        <select
          value={mesSelecionado}
          onChange={(e) => setMesSelecionado(Number(e.target.value))}
          className="border p-2 rounded-lg"
        >
          <option value={1}>Janeiro</option>
          <option value={2}>Fevereiro</option>
          <option value={3}>Março</option>
          <option value={4}>Abril</option>
          <option value={5}>Maio</option>
          <option value={6}>Junho</option>
          <option value={7}>Julho</option>
          <option value={8}>Agosto</option>
          <option value={9}>Setembro</option>
          <option value={10}>Outubro</option>
          <option value={11}>Novembro</option>
          <option value={12}>Dezembro</option>
        </select>

      </div>

      {/* 🔥 TOTAL DO MÊS */}
      <div className="mb-4 font-semibold">
        Total do mês: {movimentacoes.reduce((acc, mov) => acc + mov.quantidade, 0)}
      </div>

      {carregando && <p>Carregando...</p>}

      {!carregando && movimentacoes.length === 0 && (
        <p className="text-gray-500">
          Nenhuma movimentação encontrada.
        </p>
      )}

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

              <div className="flex items-center gap-4">

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

                {role === "admin" && (
                  <button
                    onClick={() => excluirMovimentacao(mov.id)}
                    className="text-red-500 hover:text-red-700 text-sm font-semibold"
                  >
                    🗑
                  </button>
                )}

              </div>

            </div>

            <div className="mt-2">
              Quantidade: <b>{mov.quantidade}</b>
            </div>

            <div>
              Obra origem: <b>{mov.obraNome}</b>
            </div>

            {mov.tipo === "entrada" && <div>Em estoque</div>}

            {mov.tipo === "transferencia" && mov.obraDestino && (
              <div>
                Transferido para obra: <b>{mov.obraDestino}</b>
              </div>
            )}

            {mov.tipo === "saida" && mov.destino === "uso" && (
              <div>Usado na obra</div>
            )}

            {mov.tipo === "saida" && mov.destino === "descarte" && (
              <div>Material descartado</div>
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