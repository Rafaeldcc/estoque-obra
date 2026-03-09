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

    let y = 20;

    pdf.setFontSize(20);
    pdf.text("Relatório de Estoque",20,y);

    y += 10;

    pdf.setFontSize(12);
    pdf.text(`Obra: ${nomeObra}`,20,y);

    y += 8;

    pdf.text(`Setor: ${nomeSetor}`,20,y);

    y += 12;

    // Cabeçalho da tabela

    pdf.setFontSize(12);
    pdf.text("Material",20,y);
    pdf.text("Quantidade",150,y);

    y += 3;

    pdf.line(20,y,190,y);

    y += 8;

    materiais.forEach((m:any)=>{

      const unidade = m.unidade || "";

      pdf.text(
        m.nome,
        20,
        y
      );

      pdf.text(
        `${m.saldo} ${unidade}`,
        150,
        y
      );

      y += 8;

      // quebra de página automática

      if(y > 270){

        pdf.addPage();
        y = 20;

      }

    });

    y += 10;

    const data = new Date().toLocaleDateString();

    pdf.setFontSize(10);
    pdf.text(`Gerado em: ${data}`,20,y);

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
        className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded"
      >
        Gerar PDF
      </button>

      <div className="mt-10 space-y-2">

        {materiais.map((m)=>(
          <div key={m.id}>
            {m.nome} — {m.saldo} {m.unidade || ""}
          </div>
        ))}

      </div>

    </div>

  );

}