"use client";

import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Link from "next/link";

interface Obra {
  id: string;
  nome: string;
}

export default function ObrasPage() {
  const [obras, setObras] = useState<Obra[]>([]);

  useEffect(() => {
    carregarObras();
  }, []);

  async function carregarObras() {
    const snapshot = await getDocs(collection(db, "obras"));

    const lista: Obra[] = [];

    snapshot.forEach((docSnap) => {
      lista.push({
        id: docSnap.id,
        nome: docSnap.data().nome,
      });
    });

    setObras(lista);
  }

  return (
    <div>
      <h1 style={{ fontSize: 24, marginBottom: 20 }}>
        Obras Cadastradas
      </h1>

      {obras.map((obra) => (
        <div
          key={obra.id}
          style={{
            background: "white",
            padding: 20,
            marginBottom: 15,
            borderRadius: 10,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
          }}
        >
          <span style={{ fontWeight: 500 }}>
            {obra.nome}
          </span>

          <Link
            href={`/obra/${obra.id}`}
            style={{
              background: "#2563eb",
              color: "white",
              padding: "8px 14px",
              borderRadius: 6,
              textDecoration: "none",
            }}
          >
            Abrir
          </Link>
        </div>
      ))}
    </div>
  );
}