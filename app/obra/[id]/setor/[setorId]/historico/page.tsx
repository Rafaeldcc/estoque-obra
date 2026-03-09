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
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useParams } from "next/navigation";

export default function ControleSetor() {

  const params = useParams();

  const obraId = params.id as string;
  const setorId = params.setorId as string;

  const [materiais,setMateriais] = useState<any[]>([]);
  const [obras,setObras] = useState<any[]>([]);

  const [quantidades,setQuantidades] = useState<any>({});
  const [obraDestino,setObraDestino] = useState("");

  const [busca,setBusca] = useState("");
  const [aberto,setAberto] = useState<string | null>(null);

  useEffect(()=>{

    carregarMateriais();
    carregarObras();

  },[]);

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

    const lista = snap.docs.map(doc=>({
      id:doc.id,
      ...doc.data()
    }));

    setMateriais(lista);

  }

  async function carregarObras(){

    const snap = await getDocs(
      collection(db,"obras")
    );

    const lista = snap.docs.map(doc=>({
      id:doc.id,
      ...doc.data()
    }));

    setObras(lista);

  }

  async function transferir(material:any){

    const quantidade = quantidades[material.id];

    if(!quantidade || quantidade <= 0) return;
    if(!obraDestino) return;

    if(quantidade > material.saldo){
      alert("Quantidade maior que o saldo.");
      return;
    }

    const setorSnap = await getDocs(
      collection(db,"obras",obraId,"setores")
    );

    const setorAtual = setorSnap.docs.find(
      doc => doc.id === setorId
    );

    const setorNome = setorAtual?.data().nome;

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

    let setorDestinoId;

    if(!setorDestinoSnap.empty){

      setorDestinoId =
        setorDestinoSnap.docs[0].id;

    } else {

      const novoSetor = await addDoc(
        setoresDestinoRef,
        {
          nome:setorNome,
          criadoEm:new Date()
        }
      );

      setorDestinoId = novoSetor.id;

    }

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
        saldo: material.saldo - quantidade
      }
    );

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

    const materialDestinoSnap =
      await getDocs(qMaterial);

    if(!materialDestinoSnap.empty){

      const saldoAtual =
        materialDestinoSnap.docs[0].data().saldo || 0;

      await updateDoc(
        materialDestinoSnap.docs[0].ref,
        {
          saldo: saldoAtual + quantidade
        }
      );

    } else {

      await addDoc(materiaisDestinoRef,{
        nome:material.nome,
        saldo:quantidade,
        unidade:material.unidade,
        criadoEm:new Date()
      });

    }

    alert("Transferência realizada com sucesso.");

    carregarMateriais();

  }

  const materiaisFiltrados = materiais.filter(m =>
    m.nome.toLowerCase().includes(
      busca.toLowerCase()
    )
  );

  return(

    <div className="max-w-5xl mx-auto p-6 space-y-6">

      <h1 className="text-2xl font-bold">
        Controle de Estoque
      </h1>

      <input
        placeholder="Buscar material..."
        value={busca}
        onChange={(e)=>setBusca(e.target.value)}
        className="border p-2 rounded w-full"
      />

      <div className="bg-white rounded shadow">

        {materiaisFiltrados.map(material=>{

          const abertoMaterial =
            aberto === material.id;

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
                {material.saldo} {material.unidade}
              </span>

            </div>

            {abertoMaterial && (

              <div className="p-4 bg-gray-50 flex gap-2 flex-wrap">

                <input
                  type="number"
                  placeholder="Qtd"
                  className="border p-2 w-24"
                  onChange={(e)=>
                    setQuantidades({
                      ...quantidades,
                      [material.id]:
                        Number(e.target.value)
                    })
                  }
                />

                <select
                  onChange={(e)=>
                    setObraDestino(e.target.value)
                  }
                  className="border p-2"
                >

                  <option value="">
                    Selecionar obra destino
                  </option>

                  {obras
                    .filter(o=>o.id!==obraId)
                    .map(obra=>(
                      <option
                        key={obra.id}
                        value={obra.id}
                      >
                        {obra.nome}
                      </option>
                    ))}

                </select>

                <button
                  onClick={()=>
                    transferir(material)
                  }
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