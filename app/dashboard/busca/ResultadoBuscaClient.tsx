"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface Localizacao {
  obra: string;
  setor: string;
  saldo: number;
}

interface Resultado {
  nome: string;
  locais: Localizacao[];
  total: number;
}

export default function ResultadoBuscaClient() {

  const searchParams = useSearchParams();

  const materialBusca = decodeURIComponent(
    searchParams.get("material") || ""
  ).trim();

  const [resultados,setResultados] = useState<Resultado[]>([]);
  const [loading,setLoading] = useState(false);

  useEffect(()=>{
    if(!materialBusca) return;
    buscar();
  },[materialBusca]);

  function normalizar(texto:string){
    return texto
      ?.normalize("NFD")
      .replace(/[\u0300-\u036f]/g,"")
      .toLowerCase()
      .trim();
  }

  async function buscar(){

    setLoading(true);

    const buscaNormalizada = normalizar(materialBusca);

    const mapaMateriais:Map<string,Resultado> = new Map();

    try{

      const obrasSnap = await getDocs(collection(db,"obras"));

      for(const obraDoc of obrasSnap.docs){

        const obraId = obraDoc.id;
        const obraNome = obraDoc.data().nome || "";

        const setoresSnap = await getDocs(
          collection(db,"obras",obraId,"setores")
        );

        for(const setorDoc of setoresSnap.docs){

          const setorId = setorDoc.id;
          const setorNome = setorDoc.data().nome || "";

          const materiaisSnap = await getDocs(
            collection(
              db,
              "obras",
              obraId,
              "setores",
              setorId,
              "materiais"
            )
          );

          materiaisSnap.forEach(docSnap=>{

            const data = docSnap.data();
            if(!data?.nome) return;

            const nomeMaterial = normalizar(data.nome);

            if(!nomeMaterial.includes(buscaNormalizada)) return;

            const saldo = data.saldo || 0;

            if(!mapaMateriais.has(data.nome)){

              mapaMateriais.set(data.nome,{
                nome:data.nome,
                locais:[],
                total:0
              });

            }

            const item = mapaMateriais.get(data.nome)!;

            item.locais.push({
              obra:obraNome,
              setor:setorNome,
              saldo
            });

            item.total += saldo;

          });

        }

      }

      setResultados(Array.from(mapaMateriais.values()));

    }
    catch(error){
      console.error("Erro na busca:",error);
    }

    setLoading(false);

  }

  return(

<div className="max-w-6xl mx-auto p-6">

<h1 className="text-2xl font-bold mb-6">
🔎 Busca Global de Materiais
</h1>

{loading && (
<p className="text-gray-500">Buscando...</p>
)}

{!loading && resultados.length === 0 && (
<p className="text-gray-500">
Nenhum material encontrado
</p>
)}

{resultados.map((item,index)=>(

<div
key={index}
className="bg-white border rounded-xl shadow p-6 mb-6"
>

<h2 className="text-xl font-bold mb-3">
{item.nome}
</h2>

<div className="space-y-2">

{item.locais.map((local,i)=>(

<div
key={i}
className="flex justify-between border-b pb-2"
>

<span>
📍 {local.obra} • {local.setor}
</span>

<span className="font-semibold">
{local.saldo}
</span>

</div>

))}

</div>

<div className="mt-4 text-right font-bold text-blue-600">

Total: {item.total}

</div>

</div>

))}

</div>

  );

}