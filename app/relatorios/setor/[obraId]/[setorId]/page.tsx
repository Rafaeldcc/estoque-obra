"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useParams } from "next/navigation";
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

    /* OBRA */

    const obraSnap = await getDoc(
      doc(db, "obras", obraId)
    );

    if (obraSnap.exists()) {
      setNomeObra(obraSnap.data().nome);
    }

    /* SETOR */

    const setorSnap = await getDoc(
      doc(db, "obras", obraId, "setores", setorId)
    );

    if (setorSnap.exists()) {
      setNomeSetor(setorSnap.data().nome);
    }

    /* MATERIAIS */

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

    /* TÍTULO */

    pdf.setFontSize(18);
    pdf.text("Relatório de Estoque", 20, 20);

    pdf.setFontSize(12);

    pdf.text(`Obra: ${nomeObra}`, 20, 35);
    pdf.text(`Setor: ${nomeSetor}`, 20, 45);

    const data = new Date().toLocaleDateString("pt-BR");

    pdf.text(`Data: ${data}`, 20, 55);

    /* CABEÇALHO TABELA */

    let y = 75;

    pdf.setFontSize(13);
    pdf.text("Material", 20, y);
    pdf.text("Saldo", 150, y);

    y += 10;

    pdf.setFontSize(11);

    /* LINHAS */

    materiais.forEach((mat:any) => {

      pdf.text(mat.nome ?? "", 20, y);
      pdf.text(String(mat.saldo ?? 0), 150, y);

      y += 8;

    });

    pdf.save(`relatorio-${nomeSetor}.pdf`);

  }

  return (

    <div className="p-10">

      <h1 className="text-3xl font-bold mb-4">
        Relatório do Setor
      </h1>

      <p className="mb-6 text-gray-600">
        Obra: <strong>{nomeObra}</strong> <br/>
        Setor: <strong>{nomeSetor}</strong>
      </p>

      <button
        onClick={gerarPDF}
        className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded"
      >
        Gerar PDF
      </button>

      <div className="mt-10 bg-white p-6 rounded shadow">

        <h2 className="font-semibold mb-4">
          Materiais do setor
        </h2>

        {materiais.length === 0 && (
          <p className="text-gray-500">
            Nenhum material encontrado
          </p>
        )}

        {materiais.map((m)=>(
          <div
            key={m.id}
            className="flex justify-between border-b py-2"
          >
            <span>{m.nome}</span>
            <span className="font-semibold">
              {m.saldo ?? 0}
            </span>
          </div>
        ))}

      </div>

    </div>

  );

}