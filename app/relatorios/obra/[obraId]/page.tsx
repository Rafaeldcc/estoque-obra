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
  const [loading,setLoading] = useState(true);

  useEffect(()=>{
    carregar();
  },[]);

  async function carregar(){

    try{

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

    }catch(e){
      console.error("Erro ao carregar relatório:",e);
    }

    setLoading(false);
  }

  // 🔥 PDF PROFISSIONAL CORRIGIDO
  function gerarPDF(){

    const pdf = new jsPDF("p","mm","a4");

    let y = 15;
    const pageHeight = 270;

    function cabecalho(){

      pdf.setFont("helvetica","bold");
      pdf.setFontSize(16);
      pdf.text("RELATÓRIO DE ESTOQUE DE OBRA",105,10,{align:"center"});

      pdf.setFontSize(10);
      pdf.setFont("helvetica","normal");

      pdf.text(`Obra: ${obraNome}`,20,18);

      const data = new Date().toLocaleDateString();
      pdf.text(`Data: ${data}`,150,18);

      pdf.line(20,22,190,22);

      y = 30;
    }

    function novaPagina(){
      pdf.addPage();
      cabecalho();
    }

    cabecalho();

    setores.forEach((setor:any)=>{

      if(y + 10 > pageHeight) novaPagina();

      pdf.setFont("helvetica","bold");
      pdf.setFontSize(12);
      pdf.text(`SETOR: ${setor.nome}`,20,y);

      y += 8;

      pdf.setFontSize(10);

      pdf.text("Material",20,y);
      pdf.text("Unid.",130,y);
      pdf.text("Qtd.",170,y,{align:"right"});

      y += 2;
      pdf.line(20,y,190,y);
      y += 6;

      let totalSetor = 0;

      pdf.setFont("helvetica","normal");

      if(!setor.materiais || setor.materiais.length === 0){

        pdf.text("Sem materiais cadastrados",20,y);
        y += 8;

      } else {

        setor.materiais.forEach((m:any)=>{

          const saldo = Number(m.saldo ?? 0);
          const unidade = m.unidade || "";

          totalSetor += saldo;

          // 🔥 CORREÇÃO PRINCIPAL
          if(y + 8 > pageHeight){
            novaPagina();
          }

          pdf.text(String(m.nome || "-"),20,y);
          pdf.text(unidade,130,y);
          pdf.text(saldo.toString(),170,y,{align:"right"});

          y += 6;

        });

      }

      y += 4;

      pdf.setFont("helvetica","bold");

      pdf.line(130,y,190,y);

      y += 6;

      pdf.text("TOTAL:",130,y);
      pdf.text(totalSetor.toString(),170,y,{align:"right"});

      y += 12;

    });

    pdf.save(`relatorio-${obraNome}.pdf`);
  }

  return (

    <div className="p-10 flex flex-col h-[calc(100vh-80px)]">

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

      {/* 🔥 SCROLL CORRIGIDO */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-2 border rounded p-4 bg-white shadow">

        {loading && <p>Carregando...</p>}

        {!loading && setores.length === 0 && (
          <p>Nenhum setor encontrado.</p>
        )}

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