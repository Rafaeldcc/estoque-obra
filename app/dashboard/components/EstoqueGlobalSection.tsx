"use client";

import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useRouter } from "next/navigation";

interface MaterialGlobal {
  nome: string;
  total: number;
}

export default function EstoqueGlobalSection() {
  const [materiais, setMateriais] = useState<MaterialGlobal[]>([]);
  const [busca, setBusca] = useState("");
  const router = useRouter();

  useEffect(() => {
    async function carregarMateriais() {
      const obrasSnapshot = await getDocs(collection(db, "obras"));

      const mapa: { [key: string]: number } = {};

      for (const obraDoc of obrasSnapshot.docs) {
        const setoresSnapshot = await getDocs(
          collection(db, `obras/${obraDoc.id}/setores`)
        );

        for (const setorDoc of setoresSnapshot.docs) {
          const materiaisSnapshot = await getDocs(
            collection(
              db,
              `obras/${obraDoc.id}/setores/${setorDoc.id}/materiais`
            )
          );

          materiaisSnapshot.forEach((matDoc) => {
            const mat = matDoc.data();

            if (!mapa[mat.nome]) {
              mapa[mat.nome] = 0;
            }

            mapa[mat.nome] += mat.quantidade;
          });
        }
      }

      const lista: MaterialGlobal[] = Object.keys(mapa).map((nome) => ({
        nome,
        total: mapa[nome],
      }));

      lista.sort((a, b) => a.nome.localeCompare(b.nome));

      setMateriais(lista);
    }

    carregarMateriais();
  }, []);

  const filtrados = busca
    ? materiais.filter((m) =>
        m.nome.toLowerCase().includes(busca.toLowerCase())
      )
    : [];

  return (
    <div className="mb-8">
      <input
        type="text"
        placeholder="Buscar material..."
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        className="w-full p-3 border rounded-lg mb-4"
      />

      {filtrados.length > 0 && (
        <div className="space-y-3">
          {filtrados.map((item) => (
            <div
              key={item.nome}
              onClick={() =>
                router.push(`/dashboard/material/${encodeURIComponent(item.nome)}`)
              }
              className="p-4 border rounded-lg shadow hover:shadow-lg cursor-pointer transition"
            >
              <h3 className="font-semibold">{item.nome}</h3>
              <p className="text-sm text-gray-500">
                Total Geral: {item.total}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}