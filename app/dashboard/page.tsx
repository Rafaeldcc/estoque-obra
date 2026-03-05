"use client";

import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/useAuth";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

export default function Dashboard() {
  const { user, loading } = useAuth();

  const [totalObras, setTotalObras] = useState(0);
  const [totalSetores, setTotalSetores] = useState(0);
  const [totalMateriais, setTotalMateriais] = useState(0);
  const [totalEstoque, setTotalEstoque] = useState(0);

  const [empresa, setEmpresa] = useState("...");

  useEffect(() => {
    if (!user) return;

    carregarIndicadores();
    carregarEmpresa();
  }, [user]);

  async function carregarEmpresa() {
    if (!user) return;

    try {
      const usuarioRef = doc(db, "usuarios", user.uid);
      const usuarioSnap = await getDoc(usuarioRef);

      if (usuarioSnap.exists()) {
        setEmpresa(usuarioSnap.data().empresa || "Sistema");
      } else {
        setEmpresa("Sistema");
      }
    } catch {
      setEmpresa("Sistema");
    }
  }

  async function carregarIndicadores() {
    const obrasSnap = await getDocs(collection(db, "obras"));

    let setoresCount = 0;
    let materiaisCount = 0;
    let estoqueTotal = 0;

    for (const obraDoc of obrasSnap.docs) {
      const setoresSnap = await getDocs(
        collection(db, "obras", obraDoc.id, "setores")
      );

      setoresCount += setoresSnap.size;

      for (const setorDoc of setoresSnap.docs) {
        const materiaisSnap = await getDocs(
          collection(
            db,
            "obras",
            obraDoc.id,
            "setores",
            setorDoc.id,
            "materiais"
          )
        );

        materiaisCount += materiaisSnap.size;

        materiaisSnap.forEach((doc) => {
          const saldo = doc.data().saldo ?? 0;
          estoqueTotal += saldo;
        });
      }
    }

    setTotalObras(obrasSnap.size);
    setTotalSetores(setoresCount);
    setTotalMateriais(materiaisCount);
    setTotalEstoque(estoqueTotal);
  }

  if (loading) return null;

  return (
    <div className="max-w-7xl mx-auto p-8 space-y-10">
      <div>
        <h1 className="text-3xl font-bold">
          Dashboard {empresa}
        </h1>

        <p className="text-gray-500">
          Visão geral do sistema
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card titulo="Obras" valor={totalObras} />
        <Card titulo="Setores" valor={totalSetores} />
        <Card titulo="Materiais" valor={totalMateriais} />
        <Card titulo="Total em Estoque" valor={totalEstoque} />
      </div>
    </div>
  );
}

function Card({ titulo, valor }: any) {
  return (
    <div className="bg-white p-6 rounded-xl shadow">
      <p className="text-gray-500">{titulo}</p>
      <h2 className="text-3xl font-bold mt-2">{valor}</h2>
    </div>
  );
}