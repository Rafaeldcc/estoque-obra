"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import jsPDF from "jspdf";

export default function RelatorioObra() {

  const params = useParams();
  const router = useRouter();

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

    pdf.setFontSize(20);
    pdf.text("Relatório Geral da Obra",20,y);

    y += 10;

    pdf.setFontSize(12);
    pdf.text(`Obra: ${obraNome}`,20,y);

    y += 8;

    const data = new Date().toLocaleDateString();

    pdf.text(`Data: ${data}`,20,y);

    y += 15;

    setores.forEach((setor:any)=>{

      pdf.setFontSize(14);
      pdf.text(`Setor: ${setor.nome}`,20,y);

      y += 8;

      pdf.setFontSize(11);

      pdf.text("Material",25,y);
      pdf.text("Quantidade",150,y);

      y += 3;

      pdf.line(25,y,190,y);

      y += 8;

      setor.materiais.forEach((m:any)=>{

        const saldo = m.saldo ?? 0;
        const unidade = m.unidade || "";

        pdf.text(
          m.nome,
          25,
          y
        );

        pdf.text(
          `${saldo} ${unidade}`,
          150,
          y
        );

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

  return (

  <div className="p-10 h-screen flex flex-col">

    {/* BOTÃO VOLTAR */}
    <button
      onClick={() => router.push(`/obra/${obraId}`)}
      className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded mb-6 w-fit"
    >
      ← Voltar
    </button>

    <h1 className="text-3xl font-bold mb-2">
      Relatório Geral da Obra
    </h1>

    <p className="mb-4">
      Obra: <b>{obraNome}</b>
    </p>

    <button
      onClick={gerarPDF}
      className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded mb-6 w-fit"
    >
      Gerar PDF da Obra
    </button>

    {/* 🔥 CONTAINER COM SCROLL */}
    <div className="flex-1 overflow-y-auto pr-2 border rounded p-4">

      {setores.map((setor:any)=>(
        <div key={setor.id} className="mb-6 border-b pb-4">

          <h2 className="text-xl font-semibold mb-2">
            {setor.nome}
          </h2>

          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th>Material</th>
                <th className="text-right">Quantidade</th>
              </tr>
            </thead>

            <tbody>
              {setor.materiais.map((m:any)=>(
                <tr key={m.id} className="border-b">
                  <td>{m.nome}</td>
                  <td className="text-right">
                    {(m.saldo ?? 0)} {m.unidade || ""}
                  </td>
                </tr>
              ))}
            </tbody>

          </table>

        </div>
      ))}

    </div>

  </div>

);

}