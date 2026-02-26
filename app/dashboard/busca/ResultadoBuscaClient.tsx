"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { collection, onSnapshot, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface Resultado {
  nome: string;
  saldo: number;
  obraNome: string;
  setorNome: string;
}

export default function ResultadoBuscaClient() {
  const searchParams = useSearchParams();
  const materialBusca =
    searchParams.get("material")?.toLowerCase() || "";

  const [resultados, setResultados] = useState<Resultado[]>([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (!materialBusca) return;

    buscarTempoReal();
  }, [materialBusca]);

  async function buscarTempoReal() {
    const obrasSnap = await getDocs(collection(db, "obras"));

    let listaTemp: Resultado[] = [];
    let somaTemp = 0;

    for (const obraDoc of obrasSnap.docs) {
      const obraId = obraDoc.id;
      const obraNome = obraDoc.data().nome;

      const setoresSnap = await getDocs(
        collection(db, "obras", obraId, "setores")
      );

      for (const setorDoc of setoresSnap.docs) {
        const setorId = setorDoc.id;
        const setorNome = setorDoc.data().nome;

        const materiaisRef = collection(
          db,
          "obras",
          obraId,
          "setores",
          setorId,
          "materiais"
        );

        onSnapshot(materiaisRef, (snapshot) => {
          snapshot.forEach((doc) => {
            const data = doc.data();

            if (
              data.nome?.toLowerCase() === materialBusca
            ) {
              const saldo = data.saldo || 0;

              listaTemp.push({
                nome: data.nome,
                saldo,
                obraNome,
                setorNome,
              });

              somaTemp += saldo;
            }
          });

          setResultados([...listaTemp]);
          setTotal(somaTemp);
        });
      }
    }
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">
        Resultado da Busca
      </h1>

      <div className="bg-blue-600 text-white p-4 rounded-lg mb-6">
        <p className="text-lg font-semibold">
          Total Geral: {total}
        </p>
      </div>

      {resultados.length === 0 && (
        <p className="text-gray-500">
          Nenhum material encontrado.
        </p>
      )}

      {resultados.map((item, index) => (
        <div
          key={index}
          className="p-5 border rounded-lg mb-4 bg-white shadow"
        >
          <p>
            <strong>Material:</strong> {item.nome}
          </p>

          <p>
            <strong>Quantidade:</strong> {item.saldo}
          </p>

          <p>
            <strong>Obra:</strong> {item.obraNome}
          </p>

          <p>
            <strong>Setor:</strong> {item.setorNome}
          </p>
        </div>
      ))}
    </div>
  );
}