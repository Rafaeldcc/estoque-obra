"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import jsPDF from "jspdf";

export default function RelatorioSubcategoria(){

  const params = useParams();
  const router = useRouter();

  const obraId = params.obraId as string;
  const setorId = params.setorId as string;
  const subId = params.subId as string;

  const [materiais,setMateriais] = useState<any[]>([]);
  const [nomeObra,setNomeObra] = useState("");
  const [nomeSetor,setNomeSetor] = useState("");
  const [nomeSub,setNomeSub] = useState("");

  useEffect(()=>{
    carregar();
  },[]);

  async function carregar(){

    const obraSnap = await getDoc(doc(db,"obras",obraId));
    if(obraSnap.exists()) setNomeObra(obraSnap.data().nome);

    const setorSnap = await getDoc(
      doc(db,"obras",obraId,"setores",setorId)
    );
    if(setorSnap.exists()) setNomeSetor(setorSnap.data().nome);

    const subSnap = await getDoc(
      doc(db,"obras",obraId,"setores",setorId,"subcategorias",subId)
    );
    if(subSnap.exists()) setNomeSub(subSnap.data().nome);

    const matSnap = await getDocs(
      collection(
        db,
        "obras",
        obraId,
        "setores",
        setorId,
        "subcategorias",
        subId,
        "materiais"
      )
    );

    const lista = matSnap.docs.map(doc=>({
      id: doc.id,
      ...doc.data()
    }));

    setMateriais(lista);
  }

  function gerarPDF(){

    if(materiais.length === 0){
      alert("Sem materiais");
      return;
    }

    const pdf = new jsPDF();

    let y = 20;

    pdf.setFontSize(16);
    pdf.text("RELATÓRIO DE SUBCATEGORIA",20,y);

    y += 10;

    pdf.setFontSize(10);
    pdf.text(`Obra: ${nomeObra}`,20,y);
    y += 6;
    pdf.text(`Setor: ${nomeSetor}`,20,y);
    y += 6;
    pdf.text(`Subcategoria: ${nomeSub}`,20,y);

    y += 10;

    pdf.text("Material",20,y);
    pdf.text("Qtd.",170,y);

    y += 4;
    pdf.line(20,y,190,y);
    y += 6;

    let total = 0;

    materiais.forEach((m:any)=>{

      const saldo = Number(m.saldo ?? 0);
      total += saldo;

      pdf.text(m.nome,20,y);
      pdf.text(saldo.toString(),170,y);

      y += 6;

      if(y > 270){
        pdf.addPage();
        y = 20;
      }

    });

    y += 6;
    pdf.text(`TOTAL: ${total}`,20,y);

    pdf.save(`subcategoria-${nomeSub}.pdf`);
  }

  return(

    <div className="p-10">

      <button
        onClick={()=>router.back()}
        className="mb-6 bg-gray-600 text-white px-4 py-2 rounded"
      >
        ← Voltar
      </button>

      <h1 className="text-2xl font-bold mb-2">
        Relatório por Subcategoria
      </h1>

      <p className="mb-4">
        {nomeObra} / {nomeSetor} / <b>{nomeSub}</b>
      </p>

      <button
        onClick={gerarPDF}
        className="bg-green-600 text-white px-6 py-2 rounded mb-6"
      >
        Gerar PDF
      </button>

      {materiais.map(m=>(
        <div key={m.id}>
          {m.nome} — {m.saldo}
        </div>
      ))}

    </div>
  );
}