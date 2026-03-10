"use client";

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
import { useParams } from "next/navigation";
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
  const obraId = params.id as string;
  const setorId = params.setorId as string;

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

  async function uploadFoto(e:any, material:Material){

    const file = e.target.files[0];
    if(!file) return;

    try{

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

      setMaterialSelecionado({
        ...material,
        foto:url
      });

    }catch(error){

      console.error(error);
      alert("Erro ao enviar foto");

    }

  }

  async function salvarMinimo(material:Material){

    const minimo = Number(minimos[material.id]);

    if(isNaN(minimo)){
      alert("Digite o estoque mínimo");
      return;
    }

    try{

      await updateDoc(
        doc(db,"obras",obraId,"setores",setorId,"materiais",material.id),
        { estoqueMinimo:minimo }
      );

      mostrarMensagem("Estoque mínimo atualizado");

      setMaterialSelecionado({
        ...material,
        estoqueMinimo:minimo
      });

      carregarMateriais();

    }catch(error){

      console.error(error);
      alert("Erro ao salvar estoque mínimo");

    }

  }

  async function entrada(material:Material){

    const qtd = Number(quantidades[material.id] ?? 0);
    if(!qtd) return;

    const novoSaldo = material.saldo + qtd;

    await updateDoc(
      doc(db,"obras",obraId,"setores",setorId,"materiais",material.id),
      { saldo:novoSaldo }
    );

    mostrarMensagem("Entrada realizada");

    carregarMateriais();

  }

  async function transferir(material:Material){

    const qtd = Number(quantidades[material.id] ?? 0);
    const destinoObra = destinos[material.id];

    if(!qtd || !destinoObra) return alert("Preencha os campos");
    if(qtd > material.saldo) return alert("Saldo insuficiente");

    const novoSaldo = material.saldo - qtd;

    await updateDoc(
      doc(db,"obras",obraId,"setores",setorId,"materiais",material.id),
      { saldo:novoSaldo }
    );

    mostrarMensagem("Transferência realizada");

    carregarMateriais();

  }

  async function excluir(materialId:string){

    if(role !== "admin"){
      alert("Apenas administradores podem excluir materiais.");
      return;
    }

    if(!confirm("Excluir material?")) return;

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

      <table className="w-full border rounded-xl overflow-hidden">

        <thead className="bg-gray-100">
          <tr>
            <th className="p-3 text-left">Material</th>
            <th className="p-3 text-center">Saldo</th>
            <th className="p-3 text-center">Ação</th>
          </tr>
        </thead>

        <tbody>

          {filtrados.map(material => (

            <tr
              key={material.id}
              className="border-t hover:bg-gray-50 cursor-pointer"
              onClick={()=>setMaterialSelecionado(material)}
            >

              <td className="p-3 font-medium">
                {material.nome}
              </td>

              <td className="p-3 text-center font-bold">
                {material.saldo} {material.unidade}
              </td>

              <td className="p-3 text-center">
                Abrir
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
          ← Voltar para lista
        </button>

        <div className="flex gap-8 flex-wrap">

          <div>

            {materialSelecionado.foto && (

              <img
                src={materialSelecionado.foto}
                className="w-56 h-56 object-cover rounded border"
              />

            )}

            <label className="block mt-3 text-sm bg-gray-200 px-3 py-1 rounded cursor-pointer w-fit">

              Trocar foto

              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e)=>uploadFoto(e,materialSelecionado)}
              />

            </label>

          </div>

          <div className="flex flex-col gap-4">

            <h2 className="text-xl font-bold">
              {materialSelecionado.nome}
            </h2>

            <div>
              Saldo atual:
              <strong className="ml-2">
                {materialSelecionado.saldo} {materialSelecionado.unidade}
              </strong>
            </div>

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

              <button
                onClick={()=>entrada(materialSelecionado)}
                className="bg-green-600 text-white px-4 py-2 rounded"
              >
                Entrada
              </button>

              <select
                onChange={(e)=>
                  setDestinos({
                    ...destinos,
                    [materialSelecionado.id]:e.target.value
                  })
                }
                className="border p-2 rounded"
              >

                <option value="">Obra destino</option>

                {obras.map(obra=>(

                  <option key={obra.id} value={obra.id}>
                    {obra.nome}
                  </option>

                ))}

              </select>

              <button
                onClick={()=>transferir(materialSelecionado)}
                className="bg-purple-600 text-white px-4 py-2 rounded"
              >
                Transferir
              </button>

            </div>

            <div className="flex gap-3 items-center">

              <input
                type="number"
                placeholder="Estoque mínimo"
                value={
                  minimos[materialSelecionado.id] ??
                  materialSelecionado.estoqueMinimo ??
                  ""
                }
                onChange={(e)=>
                  setMinimos({
                    ...minimos,
                    [materialSelecionado.id]:Number(e.target.value)
                  })
                }
                className="border p-2 w-32 rounded"
              />

              <button
                onClick={()=>salvarMinimo(materialSelecionado)}
                className="bg-blue-600 text-white px-4 py-2 rounded"
              >
                Salvar mínimo
              </button>

              {role === "admin" && (

                <button
                  onClick={()=>excluir(materialSelecionado.id)}
                  className="text-red-600 font-semibold"
                >
                  Excluir
                </button>

              )}

            </div>

          </div>

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