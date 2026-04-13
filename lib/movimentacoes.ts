import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

type MovimentacaoProps = {
  materialId: string;
  materialNome: string;

  tipo: "entrada" | "saida" | "transferencia";

  quantidade: number;

  obraId?: string;
  obraNome?: string;

  obraOrigem?: string;
  obraDestino?: string | null;

  setorId?: string;
  setorNome?: string;

  destino?: "entrada" | "uso" | "transferencia" | "descarte";

  usuarioId?: string;
  usuarioNome?: string;

  empresaId?: string;
};

export async function registrarMovimentacao(data: MovimentacaoProps) {
  try {

    const movimentacao = {
      materialId: data.materialId,
      materialNome: data.materialNome,

      tipo: data.tipo,
      quantidade: data.quantidade,

      obraId: data.obraId ?? null,
      obraNome: data.obraNome ?? null,

      obraOrigem: data.obraOrigem ?? null,
      obraDestino: data.obraDestino ?? null,

      setorId: data.setorId ?? null,
      setorNome: data.setorNome ?? null,

      destino: data.destino ?? "uso",

      usuarioId: data.usuarioId ?? "",
      usuarioNome: data.usuarioNome ?? "",

      empresaId: data.empresaId ?? "",

      createdAt: serverTimestamp(),
      criadoEm: serverTimestamp()
    };

    await addDoc(
      collection(db, "movimentacoes"),
      movimentacao
    );

  } catch (error) {
    console.error("Erro ao registrar movimentação:", error);
    throw error;
  }
}