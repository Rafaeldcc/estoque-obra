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
  const [obraDestino,setObraDestino] = useState(""); // 🔥 NOVO

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
      if(!agrupado[item.id]){
        agrupado[item.id] = {...item};
      }else{
        agrupado[item.id].saldo += item.saldo || 0;
      }
    });

    setMateriais(Object.values(agrupado));
  }

  function mostrarMensagem(texto:string){
    setMensagem(texto);
    setTimeout(()=>setMensagem(""),3000);
  }

  async function salvarMinimo(material:Material){

    const minimo = minimos[material.id];
    if(minimo === undefined) return;

    const setoresSnap = await getDocs(
      collection(db,"obras",obraSelecionada,"setores")
    );

    for(const setorDoc of setoresSnap.docs){

      const materialRef = doc(
        db,
        "obras",
        obraSelecionada,
        "setores",
        setorDoc.id,
        "materiais",
        material.id
      );

      await updateDoc(materialRef,{
        estoqueMinimo:minimo
      }).catch(()=>{});
    }

    mostrarMensagem("Estoque mínimo atualizado");
    carregarMateriais(obraSelecionada);
  }

  async function entrada(material:Material){

    if(role !== "admin" && role !== "almoxarifado"){
      alert("Você não tem permissão.");
      return;
    }

    const qtd = quantidades[material.id];
    if(!qtd || qtd <= 0) return;

    if(!user) return;

    try{

      const setoresSnap = await getDocs(
        collection(db,"obras",obraSelecionada,"setores")
      );

      for(const setorDoc of setoresSnap.docs){

        const materialRef = doc(
          db,
          "obras",
          obraSelecionada,
          "setores",
          setorDoc.id,
          "materiais",
          material.id
        );

        await updateDoc(materialRef,{
          saldo: increment(qtd),
          atualizadoEm: serverTimestamp()
        }).catch(()=>{});
      }

      mostrarMensagem("Entrada registrada com sucesso!");
      carregarMateriais(obraSelecionada);

    }catch(error){
      console.error(error);
      alert("Erro na entrada.");
    }
  }

  // 🔥🔥🔥 SAÍDA COM TRANSFERÊNCIA
  async function saida(material:Material){

  if(role !== "admin" && role !== "almoxarifado"){
    alert("Você não tem permissão.");
    return;
  }

  const qtd = quantidades[material.id];

  if(!qtd || qtd <= 0) return;

  if(qtd > material.saldo){
    alert("Quantidade maior que o saldo disponível.");
    return;
  }

  if(!obraDestino){
    alert("Selecione a obra destino");
    return;
  }

  if(!user) return;

  try{

    // 🔻 REMOVE DA OBRA ATUAL
    const setoresSnap = await getDocs(
      collection(db,"obras",obraSelecionada,"setores")
    );

    for(const setorDoc of setoresSnap.docs){

      const nomeSetorOrigem = setorDoc.data().nome;

      const materialRef = doc(
        db,
        "obras",
        obraSelecionada,
        "setores",
        setorDoc.id,
        "materiais",
        material.id
      );

      await updateDoc(materialRef,{
        saldo: increment(-qtd),
        atualizadoEm: serverTimestamp()
      }).catch(()=>{});

      // 🔥 DESTINO

      const setoresDestinoSnap = await getDocs(
        collection(db,"obras",obraDestino,"setores")
      );

      let setorDestinoId = "";

      // 🔍 PROCURA SETOR COM MESMO NOME
      const setorExistente = setoresDestinoSnap.docs.find(
        s => s.data().nome === nomeSetorOrigem
      );

      if(setorExistente){
        setorDestinoId = setorExistente.id;
      }else{
        // 🔥 CRIA O MESMO SETOR (EX: Elétrica)
        const novoSetor = await addDoc(
          collection(db,"obras",obraDestino,"setores"),
          {
            nome: nomeSetorOrigem,
            nomeNormalizado: nomeSetorOrigem.toLowerCase(),
            criadoEm:new Date()
          }
        );

        setorDestinoId = novoSetor.id;
      }

      // 🔍 MATERIAL NO DESTINO
      const materiaisDestinoSnap = await getDocs(
        collection(db,"obras",obraDestino,"setores",setorDestinoId,"materiais")
      );

      const materialExistente = materiaisDestinoSnap.docs.find(
        m => m.data().nome === material.nome
      );

      if(materialExistente){
        await updateDoc(materialExistente.ref,{
          saldo: increment(qtd)
        });
      }else{
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

    // 🧾 REGISTRO (mantive seu padrão)
    const obraDestinoNome =
      obras.find(o => o.id === obraDestino)?.nome || "";

    await registrarMovimentacao({
      materialId: material.id,
      materialNome: material.nome,
      tipo: "transferencia",
      quantidade: qtd,

      obraOrigem: obraNome,
      obraDestino: obraDestinoNome,

      usuarioId: user.uid,
      usuarioNome: user.email || "",
      empresaId: empresaId
    });

    mostrarMensagem("Transferência realizada com sucesso 🚀");

    setQuantidades(prev=>({
      ...prev,
      [material.id]:0
    }));

    carregarMateriais(obraSelecionada);

  }catch(error){

    console.error(error);
    alert("Erro na transferência.");

  }
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

      {/* OBRA ORIGEM */}
      <select
        className="w-full p-3 border rounded mb-3"
        onChange={(e)=>setObraSelecionada(e.target.value)}
      >
        <option value="">Selecionar obra</option>
        {obras.map(obra=>(
          <option key={obra.id} value={obra.id}>
            {obra.nome}
          </option>
        ))}
      </select>

      {/* OBRA DESTINO */}
      <select
        className="w-full p-3 border rounded mb-6"
        onChange={(e)=>setObraDestino(e.target.value)}
      >
        <option value="">Obra destino</option>
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

        const abertoMaterial = aberto === material.id;

        return(

        <div key={material.id} className="p-5 rounded-xl shadow mb-3 border">

          <div
            className="flex justify-between cursor-pointer"
            onClick={()=>setAberto(
              abertoMaterial ? null : material.id
            )}
          >

            <b>{material.nome}</b>

            <span>{material.saldo} {material.unidade}</span>

          </div>

          {abertoMaterial && (

            <div className="flex gap-3 mt-3">

              <input
                type="number"
                placeholder="Qtd"
                value={quantidades[material.id] || ""}
                onChange={(e)=>
                  setQuantidades(prev=>({
                    ...prev,
                    [material.id]: Number(e.target.value)
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
                className="bg-blue-600 text-white px-4 rounded"
              >
                Transferir
              </button>

            </div>

          )}

        </div>

        )

      })}

    </div>

  );
}