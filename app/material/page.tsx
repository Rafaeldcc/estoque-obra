"use client";

import { useSearchParams } from "next/navigation";

export default function MaterialDetalhe() {

  const params = useSearchParams();
  const data = params.get("data");

  if (!data) return <p>Material não encontrado</p>;

  const material = JSON.parse(decodeURIComponent(data));

  return (

    <div className="max-w-xl mx-auto p-8 bg-white rounded shadow">

      <h1 className="text-2xl font-bold mb-6">
        {material.nome}
      </h1>

      <p><b>Obra:</b> {material.obra}</p>

      <p><b>Setor:</b> {material.setor}</p>

      <p>
        <b>Saldo:</b> {material.saldo} {material.unidade}
      </p>

    </div>

  );
}