"use client";

import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
  getDocs
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useParams } from "next/navigation";
import Link from "next/link";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function Setores() {

  const params = useParams();
  const obraId = params.id as string;

  const [setores, setSetores] = useState<any[]>([]);
  const [novoSetor, setNovoSetor] = useState("");

  useEffect(() => {

    if (!obraId) return;

    const setoresRef = collection(
      db,
      "obras",
      obraId,
      "setores"
    );

    const unsubscribe = onSnapshot(
      setoresRef,
      (snapshot) => {

        const lista = snapshot.docs.map(
          (doc) => ({
            id: doc.id,
            ...doc.data(),
          })
        );

        setSetores(lista);

      }
    );

    return () => unsubscribe();

  }, [obraId]);

  async function criarSetor() {

    if (!novoSetor.trim()) return;

    await addDoc(
      collection(
        db,
        "obras",
        obraId,
        "setores"
      ),
      {
        nome: novoSetor.trim(),
        criadoEm: new Date(),
      }
    );

    setNovoSetor("");

  }

  async function excluirSetor(id: string) {

    await deleteDoc(
      doc(
        db,
        "obras",
        obraId,
        "setores",
        id
      )
    );

  }

  /* =========================
      GERAR RELATÓRIO PDF
  ========================== */

  async function gerarRelatorioPDF() {

    const linhas: any[] = [];

    for (const setor of setores) {

      const materiaisSnap = await getDocs(
        collection(
          db,
          "obras",
          obraId,
          "setores",
          setor.id,
          "materiais"
        )
      );

      materiaisSnap.forEach((doc) => {

        const data = doc.data();

        linhas.push([
          setor.nome,
          data.nome,
          data.saldo ?? 0
        ]);

      });

    }

    const pdf = new jsPDF();

    pdf.setFontSize(18);
    pdf.text("Relatório de Estoque da Obra", 14, 20);

    pdf.setFontSize(12);
    pdf.text(
      `Data: ${new Date().toLocaleDateString("pt-BR")}`,
      14,
      30
    );

    autoTable(pdf, {
      startY: 40,
      head: [["Setor", "Material", "Quantidade"]],
      body: linhas,
    });

    pdf.save(`relatorio-obra-${obraId}.pdf`);

  }

  return (

    <div className="max-w-4xl mx-auto p-6 space-y-6">

      <h1 className="text-2xl font-bold">
        Setores
      </h1>

      {/* BOTÃO PDF */}

      <button
        onClick={gerarRelatorioPDF}
        className="bg-green-600 text-white px-4 py-2 rounded"
      >
        Gerar Relatório PDF
      </button>

      <div className="flex gap-2">

        <input
          placeholder="Nome do setor"
          value={novoSetor}
          onChange={(e) =>
            setNovoSetor(e.target.value)
          }
          className="flex-1 border p-2 rounded"
        />

        <button
          onClick={criarSetor}
          className="bg-blue-600 text-white px-4 rounded"
        >
          Criar
        </button>

      </div>

      {setores.map((setor) => (

        <div
          key={setor.id}
          className="flex justify-between items-center border p-4 rounded"
        >

          <Link
            href={`/obra/${obraId}/setor/${setor.id}`}
            className="font-medium"
          >
            {setor.nome}
          </Link>

          <button
            onClick={() =>
              excluirSetor(setor.id)
            }
            className="bg-red-600 text-white px-3 py-1 rounded"
          >
            Excluir
          </button>

        </div>

      ))}

    </div>

  );

}