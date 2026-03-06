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
  const [estoqueBaixo, setEstoqueBaixo] = useState<any[]>([]);
  const [materiaisUsados, setMateriaisUsados] = useState<any[]>([]);

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
    const materiaisBaixos: any[] = [];

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

          const data = doc.data();
          const saldo = data.saldo ?? 0;

          estoqueTotal += saldo;
          estoqueObra += saldo;

          if (!mapaSetores[setorNome]) {
            mapaSetores[setorNome] = 0;
          }

          mapaSetores[setorNome] += saldo;

          if (saldo <= 5) {

            materiaisBaixos.push({
              material: data.nome,
              saldo
            });

          }

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
    setEstoqueBaixo(materiaisBaixos);

    setTotalObras(obrasSnap.size);
    setTotalSetores(setoresCount);
    setTotalMateriais(materiaisCount);
    setTotalEstoque(estoqueTotal);

    /* =========================
       MATERIAIS MAIS USADOS
       ========================= */

    const movSnap = await getDocs(collection(db, "movimentacoes"));

    const consumoMateriais: any = {};

    movSnap.forEach((doc) => {

      const data = doc.data();

      if (data.tipo === "saida") {

        const material = data.materialNome;
        const quantidade = data.quantidade ?? 0;

        if (!consumoMateriais[material]) {
          consumoMateriais[material] = 0;
        }

        consumoMateriais[material] += quantidade;

      }

    });

    const ranking = Object.keys(consumoMateriais)
      .map((material) => ({
        material,
        quantidade: consumoMateriais[material]
      }))
      .sort((a, b) => b.quantidade - a.quantidade)
      .slice(0, 10);

    setMateriaisUsados(ranking);

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

      {/* ESTOQUE POR OBRA */}

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

      {/* ESTOQUE POR SETOR */}

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

      {/* ESTOQUE BAIXO */}

      <div className="bg-white p-6 rounded-xl shadow">

        <h2 className="text-xl font-bold mb-4">
          ⚠ Materiais com estoque baixo
        </h2>

        {estoqueBaixo.length === 0 && (
          <p className="text-gray-500">
            Nenhum material com estoque baixo
          </p>
        )}

        {estoqueBaixo.map((m, i) => (

          <div key={i} className="flex justify-between border-b py-2">

            <span>{m.material}</span>

            <span className="text-red-600 font-bold">
              {m.saldo}
            </span>

          </div>

        ))}

      </div>

      {/* MATERIAIS MAIS USADOS */}

      <div className="bg-white p-6 rounded-xl shadow">

        <h2 className="text-xl font-bold mb-4">
          📦 Materiais mais usados
        </h2>

        {materiaisUsados.map((m, i) => (

          <div key={i} className="flex justify-between border-b py-2">

            <span>{m.material}</span>

            <span className="text-blue-600 font-bold">
              {m.quantidade}
            </span>

          </div>

        ))}

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