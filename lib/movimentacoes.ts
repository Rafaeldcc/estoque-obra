import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

type MovimentacaoProps = {
  materialId: string;
  materialNome: string;

  // 🔥 Agora aceita transferência também
  tipo: "entrada" | "saida" | "transferencia";

  quantidade: number;

  obraId: string;
  obraNome: string;

  // 🔥 usado quando for transferência
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