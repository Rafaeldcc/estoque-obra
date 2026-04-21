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
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (!obraId) return;
    carregar();
  }, [obraId]);

  async function carregar() {

    try {

      setCarregando(true);

      const obraRef = doc(db, "obras", obraId);
      const obraSnap = await getDoc(obraRef);

      if (obraSnap.exists()) {
        setNomeObra(obraSnap.data().nome);
      }

      const q = query(
        collection(db, "obras", obraId, "setores"),
        orderBy("nome")
      );

      const snap = await getDocs(q);

      const lista = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setSetores(lista);

    } catch (error) {
      console.error("Erro ao carregar setores:", error);
      setErro("Erro ao carregar dados da obra.");
    }

    setCarregando(false);
  }

  function abrirPDF(setorId: string) {
    window.open(`/relatorios/setor/${obraId}/${setorId}`, "_blank");
  }

  function abrirPDFObra() {
    window.open(`/relatorios/obra/${obraId}`, "_blank");
  }

  if (carregando) {
    return (
      <div className="p-10 text-center">
        Carregando relatório...
      </div>
    );
  }

  if (erro) {
    return (
      <div className="p-10 text-red-600">
        {erro}
      </div>
    );
  }

  return (

    <div className="p-6 flex flex-col h-[calc(100vh-80px)]">

      <div className="mb-6">
        <h1 className="text-3xl font-bold">
          Relatórios da Obra
        </h1>
        <p className="text-gray-500 mt-1">
          {nomeObra}
        </p>
      </div>

      {/* RELATÓRIO COMPLETO */}
      <div className="bg-white border rounded-xl p-6 shadow-sm mb-6">

        <h2 className="text-xl font-semibold mb-4">
          📄 Relatório completo da obra
        </h2>

        <button
          onClick={abrirPDFObra}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg"
        >
          Gerar PDF da Obra Completa
        </button>

      </div>

      {/* 🔥 LISTA COM SCROLL */}
      <div className="flex-1 min-h-0 overflow-y-auto">

        <h2 className="text-xl font-semibold mb-4">
          📦 Relatório por setor
        </h2>

        {setores.length === 0 && (
          <p className="text-gray-500">
            Nenhum setor cadastrado.
          </p>
        )}

        <div className="space-y-4 pr-2">

          {setores.map((setor) => (

            <div
              key={setor.id}
              className="flex justify-between items-center bg-white border p-4 rounded-lg shadow-sm hover:shadow-md transition"
            >

              <span className="font-medium">
                {setor.nome}
              </span>

              <button
                onClick={() => abrirPDF(setor.id)}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
              >
                Gerar PDF
              </button>

            </div>

          ))}

        </div>

      </div>

    </div>

  );

}