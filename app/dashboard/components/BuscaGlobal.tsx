"use client";

import { useState } from "react";
import {
  collection,
  getDocs,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useRouter } from "next/navigation";

export default function BuscaGlobal() {
  const [busca, setBusca] = useState("");
  const router = useRouter();

  async function buscarMaterial() {
    if (!busca.trim()) {
      alert("Digite um material");
      return;
    }

    try {
      const obrasSnapshot = await getDocs(
        collection(db, "obras")
      );

      const resultados: any[] = [];

      for (const obra of obrasSnapshot.docs) {
        const setoresSnapshot = await getDocs(
          collection(db, `obras/${obra.id}/setores`)
        );

        for (const setor of setoresSnapshot.docs) {
          const materiaisSnapshot = await getDocs(
            collection(
              db,
              `obras/${obra.id}/setores/${setor.id}/materiais`
            )
          );

          materiaisSnapshot.forEach((material) => {
            const data = material.data();

            if (
              data.nome
                ?.toLowerCase()
                .includes(busca.toLowerCase())
            ) {
              resultados.push({
                obraNome: obra.data().nome,
                setorNome: setor.data().nome,
                nome: data.nome,
                quantidade: data.quantidade,
              });
            }
          });
        }
      }

      if (resultados.length === 0) {
        alert("Nenhum material encontrado");
        return;
      }

      localStorage.setItem(
        "resultadoBusca",
        JSON.stringify(resultados)
      );

      router.push("/dashboard/busca");

    } catch (error) {
      console.error(error);
      alert("Erro na busca. Veja o console.");
    }
  }

  return (
    <div className="mb-8">
      <input
        type="text"
        placeholder="Buscar material..."
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        className="w-full p-3 border rounded mb-3"
      />

      <button
        onClick={buscarMaterial}
        className="bg-gray-800 text-white px-4 py-2 rounded"
      >
        Buscar
      </button>
    </div>
  );
}