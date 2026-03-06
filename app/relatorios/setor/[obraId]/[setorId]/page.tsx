"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import jsPDF from "jspdf";

export default function RelatorioSetor() {

  const params = useParams();

  const obraId = params.obraId as string;
  const setorId = params.setorId as string;

  const [materiais, setMateriais] = useState<any[]>([]);
  const [nomeObra, setNomeObra] = useState("");
  const [nomeSetor, setNomeSetor] = useState("");

  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {

    const obraSnap = await getDoc(
      doc(db,"obras",obraId)
    );

    if(obraSnap.exists()){
      setNomeObra(obraSnap.data().nome);
    }

    const setorSnap = await getDoc(
      doc(db,"obras",obraId,"setores",setorId)
    );

    if(setorSnap.exists()){
      setNomeSetor(setorSnap.data().nome);
    }

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

    const lista = snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    setMateriais(lista);

  }

  function gerarPDF(){

    const pdf = new jsPDF();

    pdf.setFontSize(18);
    pdf.text("Relatório de Estoque",20,20);

    pdf.setFontSize(12);
    pdf.text(`Obra: ${nomeObra}`,20,35);
    pdf.text(`Setor: ${nomeSetor}`,20,45);

    let y = 65;

    materiais.forEach((m:any)=>{

      pdf.text(
        `${m.nome} - ${m.saldo}`,
        20,
        y
      );

      y += 10;

    });

    pdf.save(`relatorio-${nomeSetor}.pdf`);

  }

  return(

    <div className="p-10">

      <h1 className="text-3xl font-bold mb-6">
        Relatório do Setor
      </h1>

      <p className="mb-6">
        Obra: <b>{nomeObra}</b><br/>
        Setor: <b>{nomeSetor}</b>
      </p>

      <button
        onClick={gerarPDF}
        className="bg-green-600 text-white px-6 py-3 rounded"
      >
        Gerar PDF
      </button>

      <div className="mt-10">

        {materiais.map((m)=>(
          <div key={m.id}>
            {m.nome} — {m.saldo}
          </div>
        ))}

      </div>

    </div>

  );

}