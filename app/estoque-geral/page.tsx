"use client";

import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function EstoqueGeral() {

  const [tabela, setTabela] = useState<any[]>([]);
  const [obras, setObras] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarEstoque();
  }, []);

  async function carregarEstoque() {

    const obrasSnap = await getDocs(collection(db, "obras"));

    const obrasLista = obrasSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    setObras(obrasLista);

    const mapaMateriais: any = {};

    for (const obra of obrasLista) {

      const setoresSnap = await getDocs(
        collection(db, "obras", obra.id, "setores")
      );

      for (const setor of setoresSnap.docs) {

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

          if (!mapaMateriais[data.nome]) {
            mapaMateriais[data.nome] = {
              material: data.nome,
              total: 0
            };
          }

          const saldo = data.saldo ?? 0;

          mapaMateriais[data.nome][obra.nome] = saldo;

          mapaMateriais[data.nome].total += saldo;

        });

      }

    }

    const tabelaFinal = Object.values(mapaMateriais);

    setTabela(tabelaFinal);
    setLoading(false);

  }

  if (loading) {
    return (
      <div className="p-10 text-center">
        Carregando estoque...
      </div>
    );
  }

  return (

    <div className="max-w-7xl mx-auto p-8">

      <h1 className="text-3xl font-bold mb-8">
        Estoque Geral da Empresa
      </h1>

      <div className="overflow-x-auto">

        <table className="w-full border">

          <thead className="bg-gray-100">

            <tr>

              <th className="p-3 text-left border">
                Material
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

            {tabela.map((linha: any, index) => (

              <tr key={index} className="border">

                <td className="p-3 border font-semibold">
                  {linha.material}
                </td>

                {obras.map((obra) => (

                  <td key={obra.id} className="p-3 border text-center">

                    {linha[obra.nome] ?? 0}

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