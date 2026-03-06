"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import jsPDF from "jspdf";

export default function RelatorioObra() {

  const params = useParams();
  const obraId = params.obraId as string;

  const [obraNome,setObraNome] = useState("");
  const [setores,setSetores] = useState<any[]>([]);

  useEffect(()=>{
    carregar();
  },[]);

  async function carregar(){

    const obraSnap = await getDoc(
      doc(db,"obras",obraId)
    );

    if(obraSnap.exists()){
      setObraNome(obraSnap.data().nome);
    }

    const setoresSnap = await getDocs(
      collection(db,"obras",obraId,"setores")
    );

    const lista:any[] = [];

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

      const materiais = materiaisSnap.docs.map(doc=>({
        id:doc.id,
        ...doc.data()
      }));

      lista.push({
        id:setorDoc.id,
        nome:setorDoc.data().nome,
        materiais
      });

    }

    setSetores(lista);

  }

  function gerarPDF(){

    const pdf = new jsPDF();

    let y = 20;

    pdf.setFontSize(18);
    pdf.text("Relatório Geral da Obra",20,y);

    y += 10;

    pdf.setFontSize(12);
    pdf.text(`Obra: ${obraNome}`,20,y);

    y += 15;

    setores.forEach((setor:any)=>{

      pdf.setFontSize(14);
      pdf.text(`Setor: ${setor.nome}`,20,y);

      y += 10;

      pdf.setFontSize(11);

      setor.materiais.forEach((m:any)=>{

        const saldo = m.saldo ?? 0;

        pdf.text(`${m.nome} - ${saldo}`,25,y);

        y += 7;

        if(y > 270){
          pdf.addPage();
          y = 20;
        }

      });

      y += 10;

    });

    pdf.save(`relatorio-${obraNome}.pdf`);

  }

  return(

    <div className="p-10">

      <h1 className="text-3xl font-bold mb-4">
        Relatório Geral da Obra
      </h1>

      <p className="mb-6">
        Obra: <b>{obraNome}</b>
      </p>

      <button
        onClick={gerarPDF}
        className="bg-green-600 text-white px-6 py-3 rounded"
      >
        Gerar PDF da Obra
      </button>

    </div>

  );

}