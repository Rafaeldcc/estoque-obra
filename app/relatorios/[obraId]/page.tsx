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
    carregarSetores();
  }, []);

  async function carregarSetores() {

    const snap = await getDocs(
      collection(db, "obras", obraId, "setores")
    );

    const lista = snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    setSetores(lista);
  }

  function gerarPDF(setorId:string){

    window.open(`/obra/${obraId}/setor/${setorId}`);

  }

  return (

    <div>

      <h1 className="text-3xl font-bold mb-6">
        Relatórios da Obra
      </h1>

      {setores.map((setor) => (

        <div
          key={setor.id}
          style={{
            background:"white",
            padding:20,
            borderRadius:8,
            marginBottom:15,
            display:"flex",
            justifyContent:"space-between",
            alignItems:"center",
            border:"1px solid #e5e7eb"
          }}
        >

          <strong>{setor.nome}</strong>

          <button
            onClick={()=>gerarPDF(setor.id)}
            style={{
              background:"#16a34a",
              color:"white",
              padding:"8px 14px",
              borderRadius:6,
              border:"none",
              cursor:"pointer"
            }}
          >
            Gerar PDF
          </button>

        </div>

      ))}

    </div>

  );
}