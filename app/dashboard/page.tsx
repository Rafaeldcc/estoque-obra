"use client";

import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  query,
  where,
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

    if (!snap.exists()) return;

    const data = snap.data();

    setEmpresa(data?.empresa || "Sistema");

  }


  function gerarListaCompras() {

    if (estoqueBaixo.length === 0) {
      alert("Nenhum material precisa ser comprado.");
      return;
    }

    let texto = "LISTA DE COMPRAS\n\n";

    estoqueBaixo.forEach((item: any) => {

      texto += `Material: ${item.material}\n`;
      texto += `Saldo atual: ${item.saldo}\n`;
      texto += `Mínimo necessário: ${item.minimo}\n`;
      texto += `Comprar: ${item.comprar}\n\n`;

    });

    const blob = new Blob([texto], { type: "text/plain" });

    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "lista-compras.txt";
    a.click();

  }


  async function carregarIndicadores() {

    if (!user) return;

    const userSnap = await getDoc(doc(db, "usuarios", user.uid));

    if (!userSnap.exists()) return;

    const userData = userSnap.data();
    const empresaId = userData?.empresaId;

    if (!empresaId) return;

    const obrasQuery = query(
      collection(db, "obras"),
      where("empresaId", "==", empresaId)
    );

    const obrasSnap = await getDocs(obrasQuery);

    const dadosGraficoObras: any[] = [];
    const mapaSetores: any = {};
    const mapaMateriais: any = {};

    for (const obraDoc of obrasSnap.docs) {

      const obraNome = obraDoc.data().nome;

      const setoresSnap = await getDocs(
        collection(db, "obras", obraDoc.id, "setores")
      );

      let estoqueObra = 0;

      for (const setorDoc of setoresSnap.docs) {

        const setorNome = setorDoc.data().nome || "Setor";

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

        materiaisSnap.forEach((docMat) => {

          const data = docMat.data();

          const saldo = Number(data.saldo || 0);
          const minimo = Number(data.estoqueMinimo || 0);
          const materialNome = data.nome || "Material";

          estoqueObra += saldo;

          if (!mapaSetores[setorNome]) {
            mapaSetores[setorNome] = 0;
          }

          mapaSetores[setorNome] += saldo;

          if (!mapaMateriais[materialNome]) {

            mapaMateriais[materialNome] = {
              material: materialNome,
              saldo: 0,
              minimo: minimo
            };

          }

          mapaMateriais[materialNome].saldo += saldo;

          if (minimo > mapaMateriais[materialNome].minimo) {
            mapaMateriais[materialNome].minimo = minimo;
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


    const materiaisBaixos = Object.values(mapaMateriais)
      .filter((m: any) => m.minimo > 0 && m.saldo <= m.minimo)
      .map((m: any) => ({
        material: m.material,
        saldo: m.saldo,
        minimo: m.minimo,
        comprar: m.minimo - m.saldo
      }));


    setGraficoObras(dadosGraficoObras);
    setGraficoSetores(dadosSetores);
    setEstoqueBaixo(materiaisBaixos);


    const movQuery = query(
      collection(db, "movimentacoes"),
      where("empresaId", "==", empresaId)
    );

    const movSnap = await getDocs(movQuery);

    const consumoMateriais: any = {};
    const consumoObras: any = {};

    movSnap.forEach((docMov) => {

      const data = docMov.data();

      if (data.tipo === "saida") {

        const material = data.materialNome;
        const quantidade = Number(data.quantidade || 0);
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
        <>
          <Lista titulo="⚠ Materiais com estoque baixo" dados={estoqueBaixo} />

          <button
            onClick={gerarListaCompras}
            className="mt-6 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg shadow"
          >
            📦 Gerar Lista de Compras
          </button>
        </>
      )}

      {visao === "usados" && (
        <ListaSimples titulo="🔥 Materiais mais usados" dados={materiaisUsados} />
      )}

    </div>

  );

}


/* COMPONENTES */

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


/* LISTA COM ROLAGEM */

function Lista({ titulo, dados }: any) {

  return (

    <div className="bg-white p-6 rounded-xl shadow max-h-[500px] overflow-y-auto">

      <h2 className="text-xl font-bold mb-4">{titulo}</h2>

      {dados.length === 0 && (
        <p className="text-gray-500">
          Nenhum material com estoque baixo
        </p>
      )}

      {dados.map((m: any, i: number) => (

        <div key={i} className="border-b py-3">

          <div className="flex justify-between font-semibold">

            <span>{m.material}</span>

            <span className="text-red-600">
              Saldo: {m.saldo}
            </span>

          </div>

          <div className="text-sm text-gray-600 mt-1">

            Mínimo: {m.minimo}
            {" | "}
            Comprar:
            <span className="text-red-600 font-bold ml-1">
              {m.comprar}
            </span>

          </div>

        </div>

      ))}

    </div>

  );

}


function ListaSimples({ titulo, dados }: any) {

  return (

    <div className="bg-white p-6 rounded-xl shadow">

      <h2 className="text-xl font-bold mb-4">{titulo}</h2>

      {dados.map((m: any, i: number) => (

        <div key={i} className="flex justify-between border-b py-2">

          <span>{m.material}</span>

          <span className="text-blue-600 font-bold">
            {m.quantidade}
          </span>

        </div>

      ))}

    </div>

  );

}