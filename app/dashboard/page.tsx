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

  const [graficoObras, setGraficoObras] = useState<any[]>([]);
  const [graficoSetores, setGraficoSetores] = useState<any[]>([]);

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

    const dadosGraficoObras: any[] = [];
    const mapaSetores: any = {};

    for (const obraDoc of obrasSnap.docs) {

      const obraNome = obraDoc.data().nome;

      const setoresSnap = await getDocs(
        collection(db, "obras", obraDoc.id, "setores")
      );

      setoresCount += setoresSnap.size;

      let estoqueObra = 0;

      for (const setorDoc of setoresSnap.docs) {

        const setorNome = setorDoc.data().nome;

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
          estoqueObra += saldo;

          if (!mapaSetores[setorNome]) {
            mapaSetores[setorNome] = 0;
          }

          mapaSetores[setorNome] += saldo;

        });

      }

      dadosGraficoObras.push({
        obra: obraNome,
        estoque: estoqueObra,
      });

    }

    const dadosSetores = Object.keys(mapaSetores).map((setor) => ({
      setor,
      estoque: mapaSetores[setor]
    }));

    setGraficoObras(dadosGraficoObras);
    setGraficoSetores(dadosSetores);

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

      {/* CARDS */}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">

        <Card titulo="Obras" valor={totalObras} />
        <Card titulo="Setores" valor={totalSetores} />
        <Card titulo="Materiais" valor={totalMateriais} />
        <Card titulo="Total em Estoque" valor={totalEstoque} />

      </div>

      {/* GRÁFICO ESTOQUE POR OBRA */}

      <div className="bg-white p-6 rounded-xl shadow">

        <h2 className="text-xl font-bold mb-4">
          Estoque por Obra
        </h2>

        <ResponsiveContainer width="100%" height={350}>

          <BarChart data={graficoObras}>

            <CartesianGrid strokeDasharray="3 3" />

            <XAxis dataKey="obra" />

            <YAxis />

            <Tooltip />

            <Bar dataKey="estoque" fill="#2563eb" />

          </BarChart>

        </ResponsiveContainer>

      </div>

      {/* GRÁFICO ESTOQUE POR SETOR */}

      <div className="bg-white p-6 rounded-xl shadow">

        <h2 className="text-xl font-bold mb-4">
          Estoque por Setor
        </h2>

        <ResponsiveContainer width="100%" height={350}>

          <BarChart data={graficoSetores}>

            <CartesianGrid strokeDasharray="3 3" />

            <XAxis dataKey="setor" />

            <YAxis />

            <Tooltip />

            <Bar dataKey="estoque" fill="#16a34a" />

          </BarChart>

        </ResponsiveContainer>

      </div>

    </div>

  );

}

function Card({ titulo, valor }: any) {

  return (

    <div className="bg-white p-6 rounded-xl shadow">

      <p className="text-gray-500">
        {titulo}
      </p>

      <h2 className="text-3xl font-bold mt-2">
        {valor}
      </h2>

    </div>

  );

}