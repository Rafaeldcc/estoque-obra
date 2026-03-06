"use client";

import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from "recharts";

type Obra = {
  id: string;
  nome: string;
};

type LinhaEstoque = {
  material: string;
  setor: string;
  total: number;
  obras: { [key: string]: number };
};

export default function EstoqueGeral() {

  const [obras, setObras] = useState<Obra[]>([]);
  const [tabela, setTabela] = useState<LinhaEstoque[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarEstoque();
  }, []);

  async function carregarEstoque() {

    const obrasSnap = await getDocs(collection(db, "obras"));

    const listaObras: Obra[] = obrasSnap.docs.map((doc) => ({
      id: doc.id,
      nome: doc.data().nome
    }));

    setObras(listaObras);

    const mapa: any = {};

    for (const obra of listaObras) {

      const setoresSnap = await getDocs(
        collection(db, "obras", obra.id, "setores")
      );

      for (const setor of setoresSnap.docs) {

        const setorNome = setor.data().nome;

        const materiaisSnap = await getDocs(
          collection(
            db,
            "obras",
            obra.id,
            "setores",
            setor.id,
            "materiais"
          )
        );

        materiaisSnap.forEach(mat => {

          const data = mat.data();
          const materialNome = data.nome;
          const saldo = data.saldo ?? 0;

          const chave = materialNome + "_" + setorNome;

          if (!mapa[chave]) {

            mapa[chave] = {
              material: materialNome,
              setor: setorNome,
              total: 0,
              obras: {}
            };

          }

          mapa[chave].obras[obra.nome] = saldo;
          mapa[chave].total += saldo;

        });

      }

    }

    setTabela(Object.values(mapa));
    setLoading(false);

  }

  if (loading) {
    return (
      <div className="p-10 text-center">
        Carregando estoque geral...
      </div>
    );
  }

  const dadosGrafico = obras.map((obra) => {

    const total = tabela.reduce((acc, linha) => {
      return acc + (linha.obras[obra.nome] ?? 0);
    }, 0);

    return {
      obra: obra.nome,
      total
    };

  });

  return (

    <div className="max-w-7xl mx-auto p-8">

      <h1 className="text-3xl font-bold mb-8">
        Estoque Geral da Empresa
      </h1>

      {/* GRÁFICO */}

      <div className="bg-white p-6 rounded-xl shadow mb-8">

        <h2 className="text-xl font-bold mb-4">
          Estoque por Obra
        </h2>

        <ResponsiveContainer width="100%" height={300}>

          <BarChart data={dadosGrafico}>

            <XAxis dataKey="obra" />

            <YAxis />

            <Tooltip />

            <Bar dataKey="total" fill="#2563eb" />

          </BarChart>

        </ResponsiveContainer>

      </div>

      {/* TABELA */}

      <div className="overflow-x-auto">

        <table className="w-full border">

          <thead className="bg-gray-100">

            <tr>

              <th className="p-3 border text-left">
                Material
              </th>

              <th className="p-3 border text-left">
                Setor
              </th>

              {obras.map((obra) => (
                <th key={obra.id} className="p-3 border">
                  {obra.nome}
                </th>
              ))}

              <th className="p-3 border">
                Total
              </th>

            </tr>

          </thead>

          <tbody>

            {tabela.map((linha, index) => (

              <tr key={index} className="border">

                <td className="p-3 border font-semibold">
                  {linha.material}
                </td>

                <td className="p-3 border">
                  {linha.setor}
                </td>

                {obras.map((obra) => (

                  <td key={obra.id} className="p-3 border text-center">
                    {linha.obras[obra.nome] ?? 0}
                  </td>

                ))}

                <td className="p-3 border font-bold text-center">
                  {linha.total}
                </td>

              </tr>

            ))}

          </tbody>

        </table>

      </div>

    </div>

  );

}