"use client";

import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useParams } from "next/navigation";

export default function RelatorioObra() {

  const params = useParams();
  const obraId = params.obraId as string;

  const [setores, setSetores] = useState<any[]>([]);
  const [nomeObra, setNomeObra] = useState("");
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    carregar();
  }, []);

  async function carregar() {

    try {

      // 🔹 pegar nome da obra
      const obraSnap = await getDoc(
        doc(db, "obras", obraId)
      );

      if (obraSnap.exists()) {
        setNomeObra(obraSnap.data().nome);
      }

      // 🔹 pegar setores
      const q = query(
        collection(db, "obras", obraId, "setores"),
        orderBy("nome")
      );

      const snap = await getDocs(q);

      const lista = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setSetores(lista);

    } catch (error) {

      console.error("Erro ao carregar setores:", error);

    }

    setCarregando(false);

  }

  function abrirPDF(setorId: string) {

    window.open(
      `/relatorios/setor/${obraId}/${setorId}`,
      "_blank"
    );

  }

  function abrirPDFObra() {

    window.open(
      `/relatorios/obra/${obraId}`,
      "_blank"
    );

  }

  if (carregando) {
    return <div className="p-10">Carregando...</div>;
  }

  return (

    <div className="max-w-4xl mx-auto p-10">

      <h1 className="text-3xl font-bold mb-2">
        Relatórios da Obra
      </h1>

      <p className="text-gray-500 mb-8">
        {nomeObra}
      </p>

      {/* BOTÃO RELATÓRIO COMPLETO */}

      <div className="mb-10">

        <button
          onClick={abrirPDFObra}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg"
        >
          Gerar PDF da Obra Completa
        </button>

      </div>

      <h2 className="text-xl font-semibold mb-4">
        Relatório por setor
      </h2>

      {setores.length === 0 && (
        <p className="text-gray-500">
          Nenhum setor cadastrado.
        </p>
      )}

      <div className="space-y-4">

        {setores.map((setor) => (

          <div
            key={setor.id}
            className="flex justify-between items-center bg-white border p-4 rounded-lg shadow-sm"
          >

            <span className="font-medium">
              {setor.nome}
            </span>

            <button
              onClick={() => abrirPDF(setor.id)}
              className="bg-green-600 text-white px-4 py-2 rounded"
            >
              Gerar PDF
            </button>

          </div>

        ))}

      </div>

    </div>

  );

}