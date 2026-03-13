"use client";

import { registrarMovimentacao } from "@/lib/movimentacoes";
import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  updateDoc,
  deleteDoc,
  doc
} from "firebase/firestore";

import {
  ref,
  uploadBytes,
  getDownloadURL
} from "firebase/storage";

import { db, storage } from "@/lib/firebase";
import { useParams, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/useAuth";

interface Material {
  id: string;
  nome: string;
  saldo: number;
  unidade: string;
  estoqueMinimo?: number;
  foto?: string;
}

interface Obra {
  id: string;
  nome: string;
}

export default function ControleEstoque() {

  const { role } = useAuth();

  const params = useParams();
  const searchParams = useSearchParams();

  const obraId = params.id as string;
  const setorId = params.setorId as string;

  const materialHighlight = searchParams.get("material");

  const [materiais,setMateriais] = useState<Material[]>([]);
  const [obras,setObras] = useState<Obra[]>([]);
  const [quantidades,setQuantidades] = useState<{[key:string]:number}>({});
  const [destinos,setDestinos] = useState<{[key:string]:string}>({});
  const [minimos,setMinimos] = useState<{[key:string]:number}>({});
  const [busca,setBusca] = useState("");
  const [materialSelecionado,setMaterialSelecionado] = useState<Material | null>(null);
  const [mensagem,setMensagem] = useState("");

  useEffect(()=>{
    carregarMateriais();
    carregarObras();
  },[]);

  async function carregarMateriais(){

    const snapshot = await getDocs(
      collection(db,"obras",obraId,"setores",setorId,"materiais")
    );

    const lista:Material[] = [];

    snapshot.forEach((docSnap)=>{

      const data = docSnap.data();

      lista.push({
        id:docSnap.id,
        nome:data.nome,
        saldo:data.saldo ?? 0,
        unidade:data.unidade ?? "",
        estoqueMinimo:data.estoqueMinimo ?? 0,
        foto:data.foto ?? ""
      });

    });

    lista.sort((a,b)=>a.nome.localeCompare(b.nome));

    setMateriais(lista);

  }

  async function carregarObras(){

    const snapshot = await getDocs(collection(db,"obras"));

    const lista:Obra[] = [];

    snapshot.forEach((docSnap)=>{

      lista.push({
        id:docSnap.id,
        nome:docSnap.data().nome
      });

    });

    setObras(lista.filter((o)=>o.id !== obraId));

  }

  function mostrarMensagem(texto:string){

    setMensagem(texto);
    setTimeout(()=>setMensagem(""),3000);

  }

  async function registrarHistorico(
    material: Material,
    tipo: "entrada" | "saida" | "transferencia",
    quantidade: number,
    destino?: "uso" | "transferencia" | "descarte",
    obraDestino?: string
  ){

    try{

      await registrarMovimentacao({

        materialId: material.id,
        materialNome: material.nome,

        tipo: tipo,
        quantidade: quantidade,

        obraId: obraId,
        obraNome: obras.find(o => o.id === obraId)?.nome || "",

        destino: destino || "uso",
        obraDestino: obraDestino ?? null,

        usuarioId: "",
        usuarioNome: "",
        empresaId: ""

      });

    }catch(error){

      console.error("Erro ao registrar histórico",error);

    }

  }

  async function uploadFoto(e:any, material:Material){

    const file = e.target.files[0];
    if(!file) return;

    const storageRef = ref(
      storage,
      `materiais/${obraId}/${material.id}-${Date.now()}`
    );

    await uploadBytes(storageRef,file);

    const url = await getDownloadURL(storageRef);

    await updateDoc(
      doc(db,"obras",obraId,"setores",setorId,"materiais",material.id),
      { foto:url }
    );

    mostrarMensagem("Foto salva com sucesso");

    carregarMateriais();

  }

  async function salvarMinimo(material:Material){

    const minimo = Number(minimos[material.id]);

    await updateDoc(
      doc(db,"obras",obraId,"setores",setorId,"materiais",material.id),
      { estoqueMinimo:minimo }
    );

    mostrarMensagem("Estoque mínimo atualizado");

    carregarMateriais();

  }

  async function entrada(material:Material){

    const qtd = Number(quantidades[material.id] ?? 0);

    const novoSaldo = material.saldo + qtd;

    await updateDoc(
      doc(db,"obras",obraId,"setores",setorId,"materiais",material.id),
      { saldo:novoSaldo }
    );

    await registrarHistorico(material,"entrada",qtd);

    mostrarMensagem("Entrada realizada");

    carregarMateriais();

  }

  async function usarNaObra(material:Material){

    const qtd = Number(quantidades[material.id] ?? 0);

    const novoSaldo = material.saldo - qtd;

    await updateDoc(
      doc(db,"obras",obraId,"setores",setorId,"materiais",material.id),
      { saldo:novoSaldo }
    );

    await registrarHistorico(material,"saida",qtd,"uso");

    mostrarMensagem("Material usado na obra");

    carregarMateriais();

  }

  async function descartarMaterial(material:Material){

    const qtd = Number(quantidades[material.id] ?? 0);

    const novoSaldo = material.saldo - qtd;

    await updateDoc(
      doc(db,"obras",obraId,"setores",setorId,"materiais",material.id),
      { saldo:novoSaldo }
    );

    await registrarHistorico(material,"saida",qtd,"descarte");

    mostrarMensagem("Material descartado");

    carregarMateriais();

  }

  async function transferir(material:Material){

    const qtd = Number(quantidades[material.id] ?? 0);
    const destinoObra = destinos[material.id];

    const novoSaldo = material.saldo - qtd;

    await updateDoc(
      doc(db,"obras",obraId,"setores",setorId,"materiais",material.id),
      { saldo:novoSaldo }
    );

    await registrarHistorico(material,"transferencia",qtd,"transferencia",destinoObra);

    mostrarMensagem("Transferência realizada");

    carregarMateriais();

  }

  async function excluir(materialId:string){

    if(role !== "admin"){
      alert("Apenas administradores podem excluir materiais.");
      return;
    }

    await deleteDoc(
      doc(db,"obras",obraId,"setores",setorId,"materiais",materialId)
    );

    mostrarMensagem("Material excluído");

    setMaterialSelecionado(null);

    carregarMateriais();

  }

  function normalizar(texto:string){

    return texto
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g,"")
      .toLowerCase();

  }

  const filtrados = materiais.filter(m =>
    normalizar(m.nome).startsWith(
      normalizar(busca)
    )
  );

  return(

    <div className="max-w-6xl mx-auto p-8">

      <h1 className="text-3xl font-bold mb-6">
        Controle de Estoque
      </h1>

      {!materialSelecionado && (

      <>

      <input
        placeholder="Buscar material..."
        value={busca}
        onChange={(e)=>setBusca(e.target.value)}
        className="border p-3 rounded mb-6 w-full"
      />

      <table className="w-full border">

      <thead className="bg-gray-100">
      <tr>
      <th className="p-3 text-left">Material</th>
      <th className="p-3 text-center">Saldo</th>
      </tr>
      </thead>

      <tbody>

      {filtrados.map(material => (

      <tr
      key={material.id}
      className="border-t hover:bg-gray-50 cursor-pointer"
      onClick={()=>setMaterialSelecionado(material)}
      >

      <td className="p-3">{material.nome}</td>

      <td className="p-3 text-center font-bold">
      {material.saldo} {material.unidade}
      </td>

      </tr>

      ))}

      </tbody>

      </table>

      </>

      )}

      {materialSelecionado && (

      <div className="bg-gray-50 border rounded-xl p-8">

        <button
          onClick={()=>setMaterialSelecionado(null)}
          className="mb-6 text-blue-600 font-semibold"
        >
          ← Voltar
        </button>

        <h2 className="text-xl font-bold mb-2">
          {materialSelecionado.nome}
        </h2>

        <p className="mb-4">
          Saldo atual: <strong>{materialSelecionado.saldo} {materialSelecionado.unidade}</strong>
        </p>

        <div className="flex gap-3 flex-wrap">

          <input
            type="number"
            placeholder="Qtd"
            className="border p-2 w-24 rounded"
            onChange={(e)=>
              setQuantidades({
                ...quantidades,
                [materialSelecionado.id]:Number(e.target.value)
              })
            }
          />

          <button onClick={()=>entrada(materialSelecionado)} className="bg-green-600 text-white px-4 py-2 rounded">
            Entrada
          </button>

          <button onClick={()=>usarNaObra(materialSelecionado)} className="bg-orange-600 text-white px-4 py-2 rounded">
            Usado na obra
          </button>

          <button onClick={()=>descartarMaterial(materialSelecionado)} className="bg-red-600 text-white px-4 py-2 rounded">
            Descarte
          </button>

        </div>

      </div>

      )}

      {mensagem && (

        <div className="fixed top-6 right-6 bg-green-600 text-white px-6 py-3 rounded-xl shadow-xl">
          {mensagem}
        </div>

      )}

    </div>

  );

}