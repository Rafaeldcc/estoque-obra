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

  const [empresa, setEmpresa] = useState("...");

  const [visao, setVisao] = useState("menu");

  const [graficoObras, setGraficoObras] = useState<any[]>([]);
  const [graficoSetores, setGraficoSetores] = useState<any[]>([]);
  const [graficoConsumoObras, setGraficoConsumoObras] = useState<any[]>([]);

  const [estoqueBaixo, setEstoqueBaixo] = useState<any[]>([]);
  const [materiaisUsados, setMateriaisUsados] = useState<any[]>([]);

  useEffect(() => {

    if (!user) return;

    carregarIndicadores();
    carregarEmpresa();

  }, [user]);

  async function carregarEmpresa() {

    if (!user) return;

    const snap = await getDoc(doc(db, "usuarios", user.uid));

    if (snap.exists()) {
      setEmpresa(snap.data().empresa || "Sistema");
    }

  }

  async function carregarIndicadores() {

    const obrasSnap = await getDocs(collection(db, "obras"));

    const dadosGraficoObras: any[] = [];
    const mapaSetores: any = {};
    const materiaisBaixos: any[] = [];

    for (const obraDoc of obrasSnap.docs) {

      const obraNome = obraDoc.data().nome;

      const setoresSnap = await getDocs(
        collection(db, "obras", obraDoc.id, "setores")
      );

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

        materiaisSnap.forEach((doc) => {

          const data = doc.data();
          const saldo = data.saldo ?? 0;

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

    /* ===================== MOVIMENTAÇÕES ===================== */

    const movSnap = await getDocs(collection(db, "movimentacoes"));

    const consumoMateriais: any = {};
    const consumoObras: any = {};

    movSnap.forEach((doc) => {

      const data = doc.data();

      if (data.tipo === "saida") {

        const material = data.materialNome;
        const quantidade = data.quantidade ?? 0;
        const obra = data.obraNome;

        if (!consumoMateriais[material]) consumoMateriais[material] = 0;
        consumoMateriais[material] += quantidade;

        if (!consumoObras[obra]) consumoObras[obra] = 0;
        consumoObras[obra] += quantidade;

      }

    });

    const rankingMateriais = Object.keys(consumoMateriais)
      .map((material) => ({
        material,
        quantidade: consumoMateriais[material]
      }))
      .sort((a, b) => b.quantidade - a.quantidade)
      .slice(0, 10);

    setMateriaisUsados(rankingMateriais);

    const rankingObras = Object.keys(consumoObras)
      .map((obra) => ({
        obra,
        consumo: consumoObras[obra]
      }))
      .sort((a, b) => b.consumo - a.consumo);

    setGraficoConsumoObras(rankingObras);

  }

  if (loading) return null;

  /* ================= MENU ================= */

  if (visao === "menu") {

    return (

      <div className="max-w-6xl mx-auto p-10">

        <h1 className="text-3xl font-bold mb-10">
          Dashboard {empresa}
        </h1>

        <div className="grid md:grid-cols-2 gap-6">

          <MenuCard titulo="📊 Estoque por Obra" click={() => setVisao("obra")} />
          <MenuCard titulo="📦 Estoque por Setor" click={() => setVisao("setor")} />
          <MenuCard titulo="📈 Consumo por Obra" click={() => setVisao("consumo")} />
          <MenuCard titulo="⚠ Estoque Baixo" click={() => setVisao("baixo")} />
          <MenuCard titulo="🔥 Materiais Mais Usados" click={() => setVisao("usados")} />

        </div>

      </div>

    );

  }

  /* ================= TELAS ================= */

  return (

    <div className="max-w-7xl mx-auto p-8">

      <button
        onClick={() => setVisao("menu")}
        className="mb-6 bg-gray-200 px-4 py-2 rounded"
      >
        ← Voltar
      </button>

      {visao === "obra" && (
        <Grafico titulo="Estoque por Obra" dados={graficoObras} chaveX="obra" chaveY="estoque" cor="#2563eb" />
      )}

      {visao === "setor" && (
        <Grafico titulo="Estoque por Setor" dados={graficoSetores} chaveX="setor" chaveY="estoque" cor="#16a34a" />
      )}

      {visao === "consumo" && (
        <Grafico titulo="Consumo de Material por Obra" dados={graficoConsumoObras} chaveX="obra" chaveY="consumo" cor="#f97316" />
      )}

      {visao === "baixo" && (
        <Lista titulo="⚠ Materiais com estoque baixo" dados={estoqueBaixo} campoNome="material" campoValor="saldo" cor="text-red-600" />
      )}

      {visao === "usados" && (
        <Lista titulo="🔥 Materiais mais usados" dados={materiaisUsados} campoNome="material" campoValor="quantidade" cor="text-blue-600" />
      )}

    </div>

  );

}

/* ================= COMPONENTES ================= */

function MenuCard({ titulo, click }: any) {

  return (

    <div
      onClick={click}
      className="bg-white p-8 rounded-xl shadow cursor-pointer hover:shadow-xl text-center text-lg font-semibold"
    >
      {titulo}
    </div>

  );

}

function Grafico({ titulo, dados, chaveX, chaveY, cor }: any) {

  return (

    <div className="bg-white p-6 rounded-xl shadow">

      <h2 className="text-xl font-bold mb-4">{titulo}</h2>

      <ResponsiveContainer width="100%" height={350}>

        <BarChart data={dados}>

          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={chaveX} />
          <YAxis />
          <Tooltip />
          <Bar dataKey={chaveY} fill={cor} />

        </BarChart>

      </ResponsiveContainer>

    </div>

  );

}

function Lista({ titulo, dados, campoNome, campoValor, cor }: any) {

  return (

    <div className="bg-white p-6 rounded-xl shadow">

      <h2 className="text-xl font-bold mb-4">{titulo}</h2>

      {dados.map((m: any, i: number) => (

        <div key={i} className="flex justify-between border-b py-2">

          <span>{m[campoNome]}</span>

          <span className={`${cor} font-bold`}>
            {m[campoValor]}
          </span>

        </div>

      ))}

    </div>

  );

}