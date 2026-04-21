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

  const [subcategorias, setSubcategorias] = useState<any[]>([]);
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

      const subSnap = await getDocs(
        collection(
          db,
          "obras",
          obraId,
          "setores",
          setorId,
          "subcategorias"
        )
      );

      for(const sub of subSnap.docs){

        const matSnap = await getDocs(
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

        const materiais = matSnap.docs.map(doc=>({
          id: doc.id,
          ...doc.data()
        }));

        lista.push({
          id: sub.id,
          nome: sub.data().nome,
          materiais
        });

      }

      setSubcategorias(lista);

    } catch(e){
      console.error(e);
    }

    setLoading(false);
  }

  function gerarPDF(){

    if(subcategorias.length === 0){
      alert("Nenhum material encontrado!");
      return;
    }

    const pdf = new jsPDF("p","mm","a4");

    let y = 15;
    const pageHeight = 270;

    function header(){

      pdf.setFont("helvetica","bold");
      pdf.setFontSize(16);
      pdf.text("RELATÓRIO DE ESTOQUE",105,10,{align:"center"});

      pdf.setFont("helvetica","normal");
      pdf.setFontSize(10);

      pdf.text(`Obra: ${nomeObra}`,20,18);
      pdf.text(`Setor: ${nomeSetor}`,20,24);

      const data = new Date().toLocaleDateString();
      pdf.text(`Data: ${data}`,150,18);

      pdf.line(20,28,190,28);

      y = 35;
    }

    function novaPagina(){
      pdf.addPage();
      header();
    }

    header();

    let totalGeral = 0;

    subcategorias.forEach((sub:any)=>{

      if(y + 10 > pageHeight) novaPagina();

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

        pdf.text(String(m.nome || "-"),20,y);
        pdf.text(unidade,130,y);
        pdf.text(saldo.toString(),170,y,{align:"right"});

        y += 6;
      });

      y += 2;

      pdf.setFont("helvetica","bold");
      pdf.line(130,y,190,y);

      y += 6;

      pdf.text("TOTAL SUBCATEGORIA:",130,y);
      pdf.text(totalSub.toString(),170,y,{align:"right"});

      y += 10;

    });

    if(y + 10 > pageHeight) novaPagina();

    pdf.setFont("helvetica","bold");
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

      <div className="flex-1 overflow-y-auto border rounded p-4 bg-white">

        {loading && <p>Carregando...</p>}

        {!loading && subcategorias.length === 0 && (
          <p>Nenhum material encontrado.</p>
        )}

        {subcategorias.map((sub:any)=>(
          <div key={sub.id} className="mb-4 border-b pb-2">

            <div className="flex justify-between items-center">

              <strong>{sub.nome}</strong>

              <button
                onClick={() =>
                  window.open(
                    `/relatorios/subcategoria/${obraId}/${setorId}/${sub.id}`,
                    "_blank"
                  )
                }
                className="bg-blue-600 text-white px-3 py-1 rounded"
              >
                PDF
              </button>

            </div>

            <div className="ml-4 mt-2 text-sm">

              {sub.materiais.length === 0 && "Sem materiais"}

              {sub.materiais.map((m:any)=>(
                <div key={m.id}>
                  {m.nome} — {m.saldo} {m.unidade || ""}
                </div>
              ))}

            </div>

          </div>
        ))}

      </div>

    </div>

  );
}