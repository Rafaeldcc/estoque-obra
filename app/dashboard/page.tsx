"use client";

import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getAuth } from "firebase/auth";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  const [totalObras, setTotalObras] = useState(0);
  const [totalSetores, setTotalSetores] = useState(0);
  const [totalMateriais, setTotalMateriais] = useState(0);
  const [totalEstoque, setTotalEstoque] = useState(0);

  const [materiais, setMateriais] = useState<string[]>([]);
  const [filtro, setFiltro] = useState("");
  const [mostrarLista, setMostrarLista] = useState(false);

  const [empresa, setEmpresa] = useState("...");
  const [graficoData, setGraficoData] = useState<any[]>([]);
  const [mostrarGrafico, setMostrarGrafico] = useState(false);

  const router = useRouter();

  useEffect(() => {
    carregarIndicadores();
    carregarMateriais();
    carregarEmpresa();
  }, []);

  async function carregarEmpresa() {
    try {
      const auth = getAuth();
      const user = auth.currentUser;

      if (!user) {
        setEmpresa("Sistema");
        return;
      }

      const usuarioRef = doc(db, "usuarios", user.uid);
      const usuarioSnap = await getDoc(usuarioRef);

      if (usuarioSnap.exists()) {
        setEmpresa(usuarioSnap.data().empresa || "Sistema");
      } else {
        setEmpresa("Sistema");
      }
    } catch (error) {
      console.error("Erro ao carregar empresa:", error);
      setEmpresa("Sistema");
    }
  }

  async function carregarIndicadores() {
    const obrasSnap = await getDocs(collection(db, "obras"));

    let setoresCount = 0;
    let materiaisCount = 0;
    let estoqueTotal = 0;

    let dadosGrafico: any[] = [];

    for (const obraDoc of obrasSnap.docs) {
      let estoquePorObra = 0;

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
          estoquePorObra += saldo;
        });
      }

      dadosGrafico.push({
        obra: obraDoc.data().nome,
        estoque: estoquePorObra,
      });
    }

    setGraficoData(dadosGrafico);
    setTotalObras(obrasSnap.size);
    setTotalSetores(setoresCount);
    setTotalMateriais(materiaisCount);
    setTotalEstoque(estoqueTotal);
  }

  async function carregarMateriais() {
    const obrasSnap = await getDocs(collection(db, "obras"));

    let lista: string[] = [];

    for (const obraDoc of obrasSnap.docs) {
      const setoresSnap = await getDocs(
        collection(db, "obras", obraDoc.id, "setores")
      );

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

        materiaisSnap.forEach((doc) => {
          const nome = doc.data().nome;
          if (nome) lista.push(nome);
        });
      }
    }

    const unica = [...new Set(lista)];
    unica.sort((a, b) => a.localeCompare(b, "pt-BR"));

    setMateriais(unica);
  }

  const materiaisFiltrados = materiais.filter((item) =>
    item.toLowerCase().includes(filtro.toLowerCase())
  );

  function selecionar(material: string) {
    router.push(
      `/dashboard/busca?material=${encodeURIComponent(material)}`
    );
  }

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

      <Link
        href="/dashboard/cadastrar-material"
        className="inline-block bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-xl font-medium"
      >
        + Cadastrar Material
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card titulo="Obras" valor={totalObras} />
        <Card titulo="Setores" valor={totalSetores} />
        <Card titulo="Materiais" valor={totalMateriais} />

        <div
          onClick={() => setMostrarGrafico(!mostrarGrafico)}
          className="cursor-pointer"
        >
          <Card titulo="Total em Estoque" valor={totalEstoque} />
        </div>
      </div>

      {mostrarGrafico && (
        <div className="bg-white p-6 rounded-xl shadow">
          <h2 className="font-semibold text-lg mb-4">
            Estoque por Obra
          </h2>

          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={graficoData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="obra" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="estoque" fill="#7c3aed" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="bg-white p-6 rounded-xl shadow relative">
        <h2 className="font-semibold text-lg mb-4">
          Buscar Material
        </h2>

        <input
          type="text"
          placeholder="Digite o nome do material..."
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          onFocus={() => setMostrarLista(true)}
          className="w-full p-3 border rounded-lg"
        />

        {mostrarLista && filtro && (
          <div className="absolute z-50 w-full bg-white border rounded-lg mt-1 max-h-60 overflow-auto shadow-lg">
            {materiaisFiltrados.length === 0 && (
              <div className="p-3 text-gray-500">
                Nenhum encontrado
              </div>
            )}

            {materiaisFiltrados.map((item, index) => (
              <div
                key={index}
                onClick={() => selecionar(item)}
                className="p-3 hover:bg-gray-100 cursor-pointer"
              >
                {item}
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

function Card({ titulo, valor }: any) {
  return (
    <div className="bg-white p-6 rounded-xl shadow hover:shadow-lg transition">
      <p className="text-gray-500">{titulo}</p>
      <h2 className="text-3xl font-bold mt-2">{valor}</h2>
    </div>
  );
}