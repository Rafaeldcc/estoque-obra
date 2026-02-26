"use client";

import { useEffect } from "react";
import {
  collection,
  getDocs,
  doc,
  setDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function SyncEstoque() {
  useEffect(() => {
    sincronizar();
  }, []);

  async function sincronizar() {
    try {
      console.log("Iniciando sincronização...");

      const obrasSnap = await getDocs(
        collection(db, "obras")
      );

      console.log("Obras encontradas:", obrasSnap.size);

      let estoqueGlobal: any = {};

      for (const obraDoc of obrasSnap.docs) {
        const obraId = obraDoc.id;
        const obraNome = obraDoc.data().nome;

        const setoresSnap = await getDocs(
          collection(db, "obras", obraId, "setores")
        );

        console.log(
          "Setores da obra",
          obraNome,
          ":",
          setoresSnap.size
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

          console.log(
            "Materiais no setor",
            setorNome,
            ":",
            materiaisSnap.size
          );

          materiaisSnap.forEach((matDoc) => {
            const data = matDoc.data();

            if (!estoqueGlobal[data.nome]) {
              estoqueGlobal[data.nome] = {
                nome: data.nome,
                total: 0,
                locais: [],
              };
            }

            estoqueGlobal[data.nome].total +=
              data.quantidade;

            estoqueGlobal[data.nome].locais.push({
              obraId,
              obraNome,
              setorId,
              setorNome,
              quantidade: data.quantidade,
            });
          });
        }
      }

      console.log("Estoque consolidado:", estoqueGlobal);

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
      alert("Erro na sincronização. Veja o console.");
    }
  }

  return (
    <div className="p-10">
      Sincronizando estoque global...
    </div>
  );
}