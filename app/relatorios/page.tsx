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

    <div>

      <h1 className="text-3xl font-bold mb-6">
        Relatórios do Sistema
      </h1>

      <p style={{ marginBottom: 20 }}>
        Gerar relatório PDF das obras.
      </p>

      {obras.map((obra) => (

        <div
          key={obra.id}
          style={{
            background: "white",
            padding: 20,
            borderRadius: 8,
            marginBottom: 15,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            border: "1px solid #e5e7eb",
          }}
        >

          <strong>{obra.nome}</strong>

          <Link
            href={`/obra/${obra.id}`}
            style={{
              background: "#16a34a",
              color: "white",
              padding: "8px 14px",
              borderRadius: 6,
              textDecoration: "none",
            }}
          >
            Gerar PDF
          </Link>

        </div>

      ))}

    </div>

  );

}