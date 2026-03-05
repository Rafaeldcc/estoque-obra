import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

type MovimentacaoProps = {
  materialId: string;
  materialNome: string;

  // agora aceita transferência
  tipo: "entrada" | "saida" | "transferencia";

  quantidade: number;

  obraId: string;
  obraNome: string;

  // destino da movimentação
  destino?: "uso" | "transferencia";

  // obra destino (quando for transferência)
  obraDestino?: string | null;

  usuarioId: string;
  usuarioNome: string;
};

export async function registrarMovimentacao({
  materialId,
  materialNome,
  tipo,
  quantidade,
  obraId,
  obraNome,
  destino = "uso",
  obraDestino = null,
  usuarioId,
  usuarioNome,
}: MovimentacaoProps) {
  try {
    await addDoc(collection(db, "movimentacoes"), {
      materialId,
      materialNome,
      tipo,
      quantidade,

      obraId,
      obraNome,

      destino,
      obraDestino,

      usuarioId,
      usuarioNome,

      createdAt: serverTimestamp(),
    });

  } catch (error) {
    console.error("Erro ao registrar movimentação:", error);
    throw error;
  }
}