"use client";

import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function CentralMateriais() {
  const [busca, setBusca] = useState("");
  const [resultado, setResultado] = useState<any[]>([]);
  const [totalGeral, setTotalGeral] = useState(0);

  async function buscarMaterial() {
    if (!busca) return;

    const obrasSnap = await getDocs(collection(db, "obras"));

    let encontrados: any[] = [];
    let somaTotal = 0;

    for (const obraDoc of obrasSnap.docs) {
      const obraId = obraDoc.id;
      const obraNome = obraDoc.data().nome;

      const setoresSnap = await getDocs(
        collection(db, "obras", obraId, "setores")
      );

      for (const setorDoc of setoresSnap.docs) {
        const setorId = setorDoc.id;
        const setorNome = setorDoc.data().nome;

        const materiaisSnap = await getDocs(
          collection(
            db,
            "obras",
            obraId,
            "setores",
            setorId,
            "materiais"
          )
        );

        materiaisSnap.forEach((matDoc) => {
          const data = matDoc.data();

          if (
            data.nome.toLowerCase().includes(busca.toLowerCase())
          ) {
            encontrados.push({
              obra: obraNome,
              setor: setorNome,
              quantidade: data.quantidade,
            });

            somaTotal += data.quantidade;
          }
        });
      }
    }

    setResultado(encontrados);
    setTotalGeral(somaTotal);
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">
        Central de Materiais
      </h1>

      <div className="flex gap-2 mb-6">
        <input
          placeholder="Buscar material..."
          className="flex-1 border p-2 rounded"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
        <button
          onClick={buscarMaterial}
          className="bg-blue-600 text-white px-4 rounded"
        >
          Buscar
        </button>
      </div>

      {resultado.map((item, index) => (
        <div
          key={index}
          className="border p-4 rounded mb-3 bg-white"
        >
          <div className="font-bold">{item.obra}</div>
          <div>{item.setor}</div>
          <div>Quantidade: {item.quantidade}</div>
        </div>
      ))}

      {resultado.length > 0 && (
        <div className="mt-6 text-xl font-bold">
          Total Geral: {totalGeral}
        </div>
      )}
    </div>
  );
}