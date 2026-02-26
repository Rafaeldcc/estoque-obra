"use client";

import { Suspense } from "react";
import ResultadoBuscaClient from "./ResultadoBuscaClient";

export default function Page() {
  return (
    <Suspense fallback={<div className="p-6">Carregando...</div>}>
      <ResultadoBuscaClient />
    </Suspense>
  );
}