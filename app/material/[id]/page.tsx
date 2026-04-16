"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

export default function MaterialDetalhe() {

  const { id } = useParams();

  const [material, setMaterial] = useState<any>(null);

  useEffect(() => {
    carregar();
  }, []);

  async function carregar() {

    try {

      // 🔥 COMO SEU MATERIAL ESTÁ EM SUBCOLEÇÃO
      // você precisa saber o caminho completo

      // 👉 solução simples (varrer tudo)
      const obrasSnap = await getDocs(collection(db, "obras"));

      for (const obra of obrasSnap.docs) {

        const setoresSnap = await getDocs(
          collection(db, "obras", obra.id, "setores")
        );

        for (const setor of setoresSnap.docs) {

          const subsSnap = await getDocs(
            collection(db, "obras", obra.id, "setores", setor.id, "subcategorias")
          );

          for (const sub of subsSnap.docs) {

            const ref = doc(
              db,
              "obras",
              obra.id,
              "setores",
              setor.id,
              "subcategorias",
              sub.id,
              "materiais",
              id as string
            );

            const snap = await getDoc(ref);

            if (snap.exists()) {

              const data = snap.data();

              setMaterial({
                ...data,
                obra: obra.data().nome,
                setor: setor.data().nome
              });

              return;
            }

          }
        }
      }

    } catch (e) {
      console.error(e);
    }

  }

  if (!material) {
    return <div className="p-8">Carregando...</div>;
  }

  return (

    <div className="p-8">

      <h1 className="text-2xl font-bold mb-4">
        {material.nome}
      </h1>

      <div className="text-gray-600 mb-2">
        Obra: {material.obra}
      </div>

      <div className="text-gray-600 mb-2">
        Setor: {material.setor}
      </div>

      <div className="text-blue-600 text-xl">
        Estoque: {material.saldo} {material.unidade}
      </div>

    </div>

  );

}