"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import jsPDF from "jspdf";

export default function RelatorioSetor() {

  const params = useParams();
  const router = useRouter();

  const obraId = params.obraId as string;
  const setorId = params.setorId as string;

  const [materiais, setMateriais] = useState<any[]>([]);
  const [nomeObra, setNomeObra] = useState("");
  const [nomeSetor, setNomeSetor] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {

  try {

    const obraSnap = await getDoc(doc(db,"obras",obraId));
    if(obraSnap.exists()){
      setNomeObra(obraSnap.data().nome);
    }

    const setorSnap = await getDoc(
      doc(db,"obras",obraId,"setores",setorId)
    );

    if(setorSnap.exists()){
      setNomeSetor(setorSnap.data().nome);
    }

    let lista:any[] = [];

    const subcategoriasSnap = await getDocs(
      collection(
        db,
        "obras",
        obraId,
        "setores",
        setorId,
        "subcategorias"
      )
    );

    for(const sub of subcategoriasSnap.docs){

      const materiaisSnap = await getDocs(
        collection(
          db,
          "obras",
          obraId,
          "setores",
          setorId,
          "subcategorias",
          sub.id,
          "materiais"
        )
      );

      const materiais = materiaisSnap.docs.map(doc=>({
        id: doc.id,
        ...doc.data()
      }));

      lista.push({
        id: sub.id,
        nome: sub.data().nome,
        materiais
      });

    }

    setMateriais(lista);

  } catch (e) {
    console.error("Erro ao carregar:", e);
  }

  setLoading(false);
}

  // 🔥 PDF PROFISSIONAL
  function gerarPDF(){

  if(materiais.length === 0){
    alert("Nenhum material encontrado!");
    return;
  }

  const pdf = new jsPDF("p","mm","a4");

  let y = 15;
  const pageHeight = 270;

  function cabecalho(){

    pdf.setFont("helvetica","bold");
    pdf.setFontSize(16);
    pdf.text("RELATÓRIO DE ESTOQUE",105,10,{align:"center"});

    pdf.setFontSize(10);
    pdf.setFont("helvetica","normal");

    pdf.text(`Obra: ${nomeObra}`,20,18);
    pdf.text(`Setor: ${nomeSetor}`,20,24);

    const data = new Date().toLocaleDateString();
    pdf.text(`Data: ${data}`,150,18);

    pdf.line(20,28,190,28);

    y = 35;
  }

  function novaPagina(){
    pdf.addPage();
    cabecalho();
  }

  cabecalho();

  let totalGeral = 0;

  materiais.forEach((sub:any)=>{

    if(y + 10 > pageHeight) novaPagina();

    // 🔹 SUBCATEGORIA
    pdf.setFont("helvetica","bold");
    pdf.setFontSize(12);
    pdf.text(`SUBCATEGORIA: ${sub.nome}`,20,y);

    y += 6;

    pdf.setFontSize(10);
    pdf.text("Material",20,y);
    pdf.text("Unid.",130,y);
    pdf.text("Qtd.",170,y,{align:"right"});

    y += 2;
    pdf.line(20,y,190,y);
    y += 5;

    let totalSub = 0;

    pdf.setFont("helvetica","normal");

    sub.materiais.forEach((m:any)=>{

      const saldo = Number(m.saldo ?? 0);
      const unidade = m.unidade || "";

      totalSub += saldo;
      totalGeral += saldo;

      if(y + 8 > pageHeight){
        novaPagina();
      }

      pdf.text(m.nome,20,y);
      pdf.text(unidade,130,y);
      pdf.text(saldo.toString(),170,y,{align:"right"});

      y += 6;
    });

    // TOTAL SUB
    y += 2;

    pdf.setFont("helvetica","bold");
    pdf.line(130,y,190,y);

    y += 6;

    pdf.text("TOTAL SUBCATEGORIA:",130,y);
    pdf.text(totalSub.toString(),170,y,{align:"right"});

    y += 10;

  });

  // 🔥 TOTAL GERAL
  pdf.setFont("helvetica","bold");

  if(y + 10 > pageHeight) novaPagina();

  pdf.line(20,y,190,y);
  y += 8;

  pdf.text("TOTAL GERAL DO SETOR:",20,y);
  pdf.text(totalGeral.toString(),170,y,{align:"right"});

  pdf.save(`relatorio-${nomeSetor}.pdf`);
}

  return(

    <div className="p-10 flex flex-col h-[calc(100vh-80px)]">

      <button
        onClick={() => router.push(`/obra/${obraId}/setor/${setorId}`)}
        className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded mb-6 w-fit"
      >
        ← Voltar
      </button>

      <h1 className="text-3xl font-bold mb-4">
        Relatório do Setor
      </h1>

      <p className="mb-4">
        Obra: <b>{nomeObra}</b><br/>
        Setor: <b>{nomeSetor}</b>
      </p>

      <button
        onClick={gerarPDF}
        disabled={loading}
        className={`px-6 py-3 rounded text-white mb-6 w-fit ${
          loading
            ? "bg-gray-400"
            : "bg-green-600 hover:bg-green-700"
        }`}
      >
        {loading ? "Carregando..." : "Gerar PDF"}
      </button>

      {/* 🔥 SCROLL FUNCIONANDO */}
      <div className="flex-1 min-h-0 overflow-y-auto border rounded p-4 bg-white shadow">

        {loading && <p>Carregando materiais...</p>}

        {!loading && materiais.length === 0 && (
          <p>Nenhum material encontrado.</p>
        )}

        {materiais.map((m)=>(
          <div key={m.id} className="border-b py-2">
            {m.nome} — {m.saldo} {m.unidade || ""}
          </div>
        ))}

      </div>

    </div>

  );

}