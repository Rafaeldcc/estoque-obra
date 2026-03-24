"use client";

import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  increment,
  getDoc,
  serverTimestamp,
  addDoc
} from "firebase/firestore";

import { db } from "@/lib/firebase";
import { registrarMovimentacao } from "@/lib/movimentacoes";
import { useAuth } from "@/lib/useAuth";

type Material = {
  id: string;
  nome: string;
  saldo: number;
  unidade?: string;
  estoqueMinimo?: number;
};

export default function Controle() {

  const { user, loading } = useAuth();

  const [role,setRole] = useState<string | null>(null);
  const [empresaId,setEmpresaId] = useState<string>("");

  const [obras,setObras] = useState<any[]>([]);
  const [obraSelecionada,setObraSelecionada] = useState("");
  const [obraDestino,setObraDestino] = useState("");

  const [materiais,setMateriais] = useState<Material[]>([]);
  const [quantidades,setQuantidades] = useState<{[key:string]:number}>({});
  const [minimos,setMinimos] = useState<{[key:string]:number}>({});

  const [mensagem,setMensagem] = useState("");

  const [busca,setBusca] = useState("");
  const [aberto,setAberto] = useState<string | null>(null);

  useEffect(()=>{
    if(!user) return;
    carregarUsuario();
    carregarObras();
  },[user]);

  useEffect(()=>{
    if(obraSelecionada){
      carregarMateriais(obraSelecionada);
    }
  },[obraSelecionada]);

  async function carregarUsuario(){
    if(!user) return;

    const snap = await getDoc(doc(db,"usuarios",user.uid));

    if(snap.exists()){
      const data = snap.data();
      setRole(data.role);
      setEmpresaId(data.empresaId);
    }
  }

  async function carregarObras(){
    const snap = await getDocs(collection(db,"obras"));

    const lista = snap.docs.map(doc=>({
      id:doc.id,
      ...doc.data()
    }));

    setObras(lista);
  }

  async function carregarMateriais(obraId:string){

    const setoresSnap = await getDocs(
      collection(db,"obras",obraId,"setores")
    );

    let todos:any[] = [];

    for(const setorDoc of setoresSnap.docs){

      const materiaisSnap = await getDocs(
        collection(
          db,
          "obras",
          obraId,
          "setores",
          setorDoc.id,
          "materiais"
        )
      );

      materiaisSnap.docs.forEach(docSnap=>{
        const data = docSnap.data();

        todos.push({
          id:docSnap.id,
          nome:data.nome,
          saldo:data.saldo || 0,
          unidade:data.unidade || "",
          estoqueMinimo:data.estoqueMinimo || 0
        });
      });
    }

    const agrupado:{[key:string]:Material} = {};

    todos.forEach(item=>{
      if(!agrupado[item.nome]){
        agrupado[item.nome] = {...item};
      }else{
        agrupado[item.nome].saldo += item.saldo || 0;
      }
    });

    setMateriais(Object.values(agrupado));
  }

  function mostrarMensagem(texto:string){
    setMensagem(texto);
    setTimeout(()=>setMensagem(""),3000);
  }

  function normalizar(nome:string){
    return nome
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g,"")
      .toLowerCase()
      .trim();
  }

  async function salvarMinimo(material:Material){

    const minimo = minimos[material.nome];
    if(minimo === undefined) return;

    const setoresSnap = await getDocs(
      collection(db,"obras",obraSelecionada,"setores")
    );

    for(const setorDoc of setoresSnap.docs){

      const materiaisSnap = await getDocs(
        collection(db,"obras",obraSelecionada,"setores",setorDoc.id,"materiais")
      );

      materiaisSnap.forEach(async (docMat)=>{
        const data = docMat.data();

        if(data.nome === material.nome){
          await updateDoc(docMat.ref,{
            estoqueMinimo:minimo
          });
        }
      });

    }

    mostrarMensagem("Estoque mínimo atualizado");
    carregarMateriais(obraSelecionada);
  }

  async function entrada(material:Material){

    const qtd = quantidades[material.nome];
    if(!qtd || qtd <= 0) return;

    const setoresSnap = await getDocs(
      collection(db,"obras",obraSelecionada,"setores")
    );

    for(const setorDoc of setoresSnap.docs){

      const materiaisSnap = await getDocs(
        collection(db,"obras",obraSelecionada,"setores",setorDoc.id,"materiais")
      );

      materiaisSnap.forEach(async (docMat)=>{
        const data = docMat.data();

        if(data.nome === material.nome){
          await updateDoc(docMat.ref,{
            saldo: increment(qtd),
            atualizadoEm: serverTimestamp()
          });
        }
      });

    }

    mostrarMensagem("Entrada registrada");
    carregarMateriais(obraSelecionada);
  }

  async function saida(material:Material){

    const qtd = quantidades[material.nome];
    if(!qtd || qtd <= 0) return;

    if(qtd > material.saldo){
      alert("Saldo insuficiente");
      return;
    }

    const setoresSnap = await getDocs(
      collection(db,"obras",obraSelecionada,"setores")
    );

    for(const setorDoc of setoresSnap.docs){

      const materiaisSnap = await getDocs(
        collection(db,"obras",obraSelecionada,"setores",setorDoc.id,"materiais")
      );

      materiaisSnap.forEach(async (docMat)=>{
        const data = docMat.data();

        if(data.nome === material.nome){
          await updateDoc(docMat.ref,{
            saldo: increment(-qtd),
            atualizadoEm: serverTimestamp()
          });
        }
      });

    }

    // 🔥 TRANSFERÊNCIA
    if(obraDestino){

      const setoresDestino = await getDocs(
        collection(db,"obras",obraDestino,"setores")
      );

      let setorDestinoId = "";

      for(const setor of setoresDestino.docs){
        setorDestinoId = setor.id;
        break;
      }

      if(!setorDestinoId){
        // 🔥 CRIA SETOR AUTOMÁTICO
        const nomeSetor = "Geral";

        const novoSetor = await addDoc(
          collection(db,"obras",obraDestino,"setores"),
          {
            nome: nomeSetor,
            nomeNormalizado: normalizar(nomeSetor),
            criadoEm: new Date()
          }
        );

        setorDestinoId = novoSetor.id;
      }

      const materiaisDestino = await getDocs(
        collection(db,"obras",obraDestino,"setores",setorDestinoId,"materiais")
      );

      let achou = false;

      for(const docMat of materiaisDestino.docs){

        const data = docMat.data();

        if(data.nome === material.nome){

          await updateDoc(docMat.ref,{
            saldo: increment(qtd)
          });

          achou = true;
          break;
        }
      }

      if(!achou){

        await addDoc(
          collection(db,"obras",obraDestino,"setores",setorDestinoId,"materiais"),
          {
            nome: material.nome,
            saldo: qtd,
            unidade: material.unidade || "",
            estoqueMinimo: material.estoqueMinimo || 0
          }
        );

      }

    }

    mostrarMensagem("Saída / Transferência realizada");
    carregarMateriais(obraSelecionada);
  }

  if(loading) return null;

  const materiaisFiltrados = materiais.filter(m =>
    m.nome.toLowerCase().includes(busca.toLowerCase())
  );

  return(

    <div className="max-w-4xl mx-auto p-8">

      <h2 className="text-2xl font-bold mb-4">
        Controle de Estoque
      </h2>

      {mensagem && (
        <div className="mb-4 bg-green-600 text-white p-3 rounded">
          {mensagem}
        </div>
      )}

      <select
        className="w-full p-3 border rounded mb-4"
        onChange={(e)=>setObraSelecionada(e.target.value)}
      >
        <option value="">Selecionar obra</option>
        {obras.map(obra=>(
          <option key={obra.id} value={obra.id}>
            {obra.nome}
          </option>
        ))}
      </select>

      {/* 🔥 NOVO SELECT DESTINO */}
      <select
        className="w-full p-3 border rounded mb-6"
        onChange={(e)=>setObraDestino(e.target.value)}
      >
        <option value="">Destino (opcional)</option>
        {obras
          .filter(o=>o.id !== obraSelecionada)
          .map(obra=>(
          <option key={obra.id} value={obra.id}>
            {obra.nome}
          </option>
        ))}
      </select>

      <input
        placeholder="Buscar material..."
        value={busca}
        onChange={(e)=>setBusca(e.target.value)}
        className="border p-3 rounded w-full mb-6"
      />

      {materiaisFiltrados.map(material=>{

        const abertoMaterial = aberto === material.nome;

        return(

        <div
          key={material.nome}
          className="p-5 rounded-xl shadow mb-3 border bg-white"
        >

          <div
            className="flex justify-between cursor-pointer"
            onClick={()=>setAberto(
              abertoMaterial ? null : material.nome
            )}
          >

            <b>
              {abertoMaterial ? "▼" : "▶"} {material.nome}
            </b>

            <span className="font-semibold">
              {material.saldo} {material.unidade}
            </span>

          </div>

          {abertoMaterial && (

            <div className="flex gap-3 mt-3">

              <input
                type="number"
                placeholder="Qtd"
                value={quantidades[material.nome] || ""}
                onChange={(e)=>
                  setQuantidades(prev=>({
                    ...prev,
                    [material.nome]: Number(e.target.value)
                  }))
                }
                className="border p-2 w-24 rounded"
              />

              <button
                onClick={()=>entrada(material)}
                className="bg-green-600 text-white px-4 rounded"
              >
                Entrada
              </button>

              <button
                onClick={()=>saida(material)}
                className="bg-orange-500 text-white px-4 rounded"
              >
                Saída / Transferir
              </button>

            </div>

          )}

        </div>

        )

      })}

    </div>

  );

}