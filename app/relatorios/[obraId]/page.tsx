"use client";

import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useParams } from "next/navigation";

export default function RelatorioObra() {

  const params = useParams();
  const obraId = params.obraId as string;

  const [setores, setSetores] = useState<any[]>([]);

  useEffect(() => {
    carregar();
  }, []);

  async function carregar() {

    const snap = await getDocs(
      collection(db,"obras",obraId,"setores")
    );

    const lista = snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    setSetores(lista);

  }

  function abrirPDF(setorId:string){

    window.open(`/relatorios/setor/${obraId}/${setorId}`);

  }

  return (

    <div className="p-10">

      <h1 className="text-3xl font-bold mb-6">
        Selecionar Setor
      </h1>

      {setores.map((setor)=>(
        <div
          key={setor.id}
          className="flex justify-between border p-4 rounded mb-3"
        >

          <span>{setor.nome}</span>

          <button
            onClick={()=>abrirPDF(setor.id)}
            className="bg-green-600 text-white px-4 py-2 rounded"
          >
            Gerar PDF
          </button>

        </div>
      ))}

    </div>

  );
}