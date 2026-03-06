"use client";

import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useParams } from "next/navigation";
import jsPDF from "jspdf";

export default function RelatorioSetor() {

  const params = useParams();

  const obraId = params.obraId as string;
  const setorId = params.setorId as string;

  const [materiais, setMateriais] = useState<any[]>([]);

  useEffect(() => {
    carregarMateriais();
  }, []);

  async function carregarMateriais() {

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

  function gerarPDF() {

    const pdf = new jsPDF();

    pdf.setFontSize(18);
    pdf.text("Relatório de Estoque", 20, 20);

    pdf.setFontSize(12);

    let y = 40;

    materiais.forEach((mat:any) => {

      pdf.text(
        `${mat.nome} - ${mat.saldo}`,
        20,
        y
      );

      y += 10;

    });

    pdf.save("relatorio-setor.pdf");
  }

  return (

    <div className="p-10">

      <h1 className="text-3xl font-bold mb-6">
        Relatório do Setor
      </h1>

      <button
        onClick={gerarPDF}
        className="bg-green-600 text-white px-6 py-3 rounded"
      >
        Baixar PDF
      </button>

      <div className="mt-10 space-y-2">

        {materiais.map((m)=>(
          <div key={m.id}>
            {m.nome} — {m.saldo}
          </div>
        ))}

      </div>

    </div>

  );
}