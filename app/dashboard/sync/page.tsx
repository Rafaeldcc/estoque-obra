"use client";

import { useState } from "react";
import {
  collection,
  getDocs,
  doc,
  setDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function SyncEstoque() {
  const [loading, setLoading] = useState(false);

  async function sincronizar() {
    try {
      setLoading(true);

      const obrasSnap = await getDocs(
        collection(db, "obras")
      );

      let estoqueGlobal: any = {};

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

            const saldo = data.saldo || 0;

            if (!data.nome) return;

            if (!estoqueGlobal[data.nome]) {
              estoqueGlobal[data.nome] = {
                nome: data.nome,
                total: 0,
                locais: [],
              };
            }

            estoqueGlobal[data.nome].total += saldo;

            estoqueGlobal[data.nome].locais.push({
              obraId,
              obraNome,
              setorId,
              setorNome,
              quantidade: saldo,
            });
          });
        }
      }

      for (const nome in estoqueGlobal) {
        const materialId = nome.replace(/\s/g, "_");

        await setDoc(
          doc(db, "estoque_global", materialId),
          estoqueGlobal[nome]
        );
      }

      alert("Estoque Global sincronizado!");
    } catch (error) {
      console.error("Erro:", error);
      alert("Erro na sincronização.");
    }

    setLoading(false);
  }

  return (
    <div className="p-10 space-y-6">
      <h1 className="text-2xl font-bold">
        Sincronizar Estoque Global
      </h1>

      <button
        onClick={sincronizar}
        disabled={loading}
        className="bg-blue-600 text-white px-6 py-3 rounded"
      >
        {loading ? "Sincronizando..." : "Sincronizar Agora"}
      </button>
    </div>
  );
}