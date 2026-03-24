"use client";

import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  query,
  where,
  serverTimestamp,
  getDoc
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useParams } from "next/navigation";

type Material = {
  id: string;
  nome: string;
  saldo: number;
  unidade?: string;
  estoqueMinimo?: number;
};

export default function ControleSetor() {

  const params = useParams();

  const obraId = params?.id as string;
  const setorId = params?.setorId as string;

  const [materiais, setMateriais] = useState<Material[]>([]);
  const [obras, setObras] = useState<any[]>([]);

  const [quantidades, setQuantidades] = useState<{[key:string]:number}>({});
  const [obraDestino, setObraDestino] = useState("");

  const [busca, setBusca] = useState("");
  const [aberto, setAberto] = useState<string | null>(null);

  const [mensagem, setMensagem] = useState("");

  useEffect(()=>{
    if(!obraId || !setorId) return;
    carregarMateriais();
    carregarObras();
  },[obraId,setorId]);

  function mostrarMensagem(texto:string){
    setMensagem(texto);
    setTimeout(()=>setMensagem(""),3000);
  }

  async function carregarMateriais(){

    const snap = await getDocs(
      collection(
        db,
        "obras",
        obraId,
        "setores",
        setorId,
        "materiais"
      )
    );

    const lista:Material[] = snap.docs.map(doc=>({
      id:doc.id,
      nome:doc.data()?.nome || "",
      saldo:doc.data()?.saldo || 0,
      unidade:doc.data()?.unidade || "",
      estoqueMinimo:doc.data()?.estoqueMinimo || 0
    }));

    setMateriais(lista);
  }

  async function carregarObras(){

    const snap = await getDocs(collection(db,"obras"));

    const lista = snap.docs.map(doc=>({
      id:doc.id,
      ...doc.data()
    }));

    setObras(lista);
  }

  // 🔥 TRANSFERÊNCIA (MELHORADA SEM QUEBRAR NADA)
  async function transferir(material:Material){

    const quantidade = Number(quantidades[material.id]);

    if(!quantidade || quantidade <= 0){
      return mostrarMensagem("Digite uma quantidade válida");
    }

    if(!obraDestino){
      return mostrarMensagem("Selecione a obra destino");
    }

    if(quantidade > material.saldo){
      return mostrarMensagem("Estoque insuficiente");
    }

    try{

      // 🔥 BUSCAR SETOR ATUAL (FORMA SEGURA)
      const setorRef = doc(db,"obras",obraId,"setores",setorId);
      const setorSnap = await getDoc(setorRef);

      if(!setorSnap.exists()){
        return mostrarMensagem("Setor não encontrado");
      }

      const setorNome = setorSnap.data()?.nome || "Geral";

      // 🔥 DESTINO - BUSCAR OU CRIAR SETOR
      const setoresDestinoRef = collection(
        db,
        "obras",
        obraDestino,
        "setores"
      );

      const qSetor = query(
        setoresDestinoRef,
        where("nome","==",setorNome)
      );

      const setorDestinoSnap = await getDocs(qSetor);

      let setorDestinoId:string;

      if(!setorDestinoSnap.empty){
        setorDestinoId = setorDestinoSnap.docs[0].id;
      }else{

        const novoSetor = await addDoc(setoresDestinoRef,{
          nome:setorNome,
          criadoEm:serverTimestamp()
        });

        setorDestinoId = novoSetor.id;
      }

      // 🔻 ATUALIZA ORIGEM (PROTEGIDO)
      await updateDoc(
        doc(
          db,
          "obras",
          obraId,
          "setores",
          setorId,
          "materiais",
          material.id
        ),
        {
          saldo: Math.max(0, material.saldo - quantidade)
        }
      );

      // 🔥 DESTINO MATERIAL
      const materiaisDestinoRef = collection(
        db,
        "obras",
        obraDestino,
        "setores",
        setorDestinoId,
        "materiais"
      );

      const qMaterial = query(
        materiaisDestinoRef,
        where("nome","==",material.nome)
      );

      const materialDestinoSnap = await getDocs(qMaterial);

      if(!materialDestinoSnap.empty){

        const saldoAtual = materialDestinoSnap.docs[0].data()?.saldo || 0;

        await updateDoc(materialDestinoSnap.docs[0].ref,{
          saldo: saldoAtual + quantidade
        });

      } else {

        await addDoc(materiaisDestinoRef,{
          nome:material.nome,
          saldo:quantidade,
          unidade:material.unidade || "",
          estoqueMinimo:material.estoqueMinimo ?? 0,
          criadoEm:serverTimestamp()
        });

      }

      mostrarMensagem("✅ Transferência realizada com sucesso");

      setQuantidades(prev=>({
        ...prev,
        [material.id]:0
      }));

      await carregarMateriais();

    }catch(error){
      console.error(error);
      mostrarMensagem("❌ Erro na transferência");
    }

  }

  const materiaisFiltrados = materiais
    .filter(m =>
      m?.nome?.toLowerCase().includes(busca.toLowerCase())
    )
    .sort((a,b)=>{

      const buscaLower = busca.toLowerCase();

      const aComeca = a.nome.toLowerCase().startsWith(buscaLower);
      const bComeca = b.nome.toLowerCase().startsWith(buscaLower);

      if(aComeca && !bComeca) return -1;
      if(!aComeca && bComeca) return 1;

      return a.nome.localeCompare(b.nome);
    });

  return(

    <div className="max-w-5xl mx-auto p-6 space-y-6">

      <h1 className="text-2xl font-bold">
        Controle de Estoque
      </h1>

      {mensagem && (
        <div className="bg-green-600 text-white p-3 rounded">
          {mensagem}
        </div>
      )}

      <input
        placeholder="Buscar material..."
        value={busca}
        onChange={(e)=>setBusca(e.target.value)}
        className="border p-2 rounded w-full"
      />

      <div className="bg-white rounded shadow max-h-[70vh] overflow-y-auto">

        {materiaisFiltrados.map(material=>{

          const abertoMaterial = aberto === material.id;

          return(

          <div key={material.id} className="border-b">

            <div
              className="flex justify-between p-4 cursor-pointer hover:bg-gray-50"
              onClick={()=>setAberto(
                abertoMaterial ? null : material.id
              )}
            >

              <span>
                {abertoMaterial ? "▼" : "▶"} {material.nome}
              </span>

              <span className="font-bold">
                {material.saldo} {material.unidade || ""}
              </span>

            </div>

            {abertoMaterial && (

              <div className="p-4 bg-gray-50 flex gap-2 flex-wrap">

                <input
                  type="number"
                  placeholder="Qtd"
                  className="border p-2 w-24"
                  value={quantidades[material.id] || ""}
                  onChange={(e)=>
                    setQuantidades(prev=>({
                      ...prev,
                      [material.id]: Number(e.target.value)
                    }))
                  }
                />

                <select
                  value={obraDestino}
                  onChange={(e)=>setObraDestino(e.target.value)}
                  className="border p-2"
                >
                  <option value="">
                    Selecionar obra destino
                  </option>

                  {obras
                    .filter(o=>o.id!==obraId)
                    .map(obra=>(
                      <option key={obra.id} value={obra.id}>
                        {obra.nome}
                      </option>
                    ))}
                </select>

                <button
                  onClick={()=>transferir(material)}
                  className="bg-purple-600 text-white px-4 py-2 rounded"
                >
                  Transferir
                </button>

              </div>

            )}

          </div>

          )

        })}

      </div>

    </div>

  );

}