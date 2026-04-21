"use client";

import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Link from "next/link";

export default function Relatorios() {

  const [obras, setObras] = useState<any[]>([]);

  useEffect(() => {
    carregarObras();
  }, []);

  async function carregarObras() {

    const snap = await getDocs(collection(db, "obras"));

    const lista = snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    setObras(lista);
  }

  return (

    <div className="max-w-5xl mx-auto">

      <h1 className="text-3xl font-bold mb-6">
        Relatórios do Sistema
      </h1>

      <p className="mb-6 text-gray-600">
        Selecione uma obra para gerar relatórios PDF dos setores.
      </p>

      <div className="space-y-4">

        {obras.map((obra) => (

          <div
            key={obra.id}
            className="bg-white p-5 rounded-lg shadow flex justify-between items-center border"
          >

            <strong className="text-lg">
              {obra.nome}
            </strong>

            <Link
              href={`/relatorios/${obra.id}`}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
            >
              Gerar PDF
            </Link>

          </div>

        ))}

      </div>

    </div>

  );

}