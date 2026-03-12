import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

type MovimentacaoProps = {
  materialId: string;
  materialNome: string;

  tipo: "entrada" | "saida" | "transferencia";

  quantidade: number;

  obraId: string;
  obraNome: string;

  destino?: "uso" | "transferencia";

  obraDestino?: string | null;

  usuarioId: string;
  usuarioNome: string;

  empresaId: string;
};

export async function registrarMovimentacao(data: MovimentacaoProps) {

  try {

    const movimentacao = {
      materialId: data.materialId,
      materialNome: data.materialNome,

      tipo: data.tipo,
      quantidade: data.quantidade,

      obraId: data.obraId,
      obraNome: data.obraNome,

      destino: data.destino ?? "uso",

      obraDestino: data.obraDestino ?? null,

      usuarioId: data.usuarioId,
      usuarioNome: data.usuarioNome,

      empresaId: data.empresaId,

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