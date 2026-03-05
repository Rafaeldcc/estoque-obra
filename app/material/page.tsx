"use client";

import { useSearchParams } from "next/navigation";

export default function MaterialDetalhe() {

  const params = useSearchParams();
  const data = params.get("data");

  if (!data) return <p>Material não encontrado</p>;

  const materiais = JSON.parse(decodeURIComponent(data));

  return (
    <div className="max-w-xl mx-auto p-8 bg-white rounded shadow">

      <h1 className="text-2xl font-bold mb-6">
        {materiais[0]?.nome}
      </h1>

      {materiais.map((material, index) => (

        <div
          key={index}
          className="mb-4 p-4 border rounded"
        >

          <p><b>Obra:</b> {material.obra}</p>

          <p><b>Setor:</b> {material.setor}</p>

          <p>
            <b>Saldo:</b> {material.saldo} {material.unidade}
          </p>

        </div>

      ))}

    </div>
  );
}