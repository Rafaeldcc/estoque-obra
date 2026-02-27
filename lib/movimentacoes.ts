import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

type MovimentacaoProps = {
  materialId: string;
  materialNome: string;
  tipo: "entrada" | "saida";
  quantidade: number;
  obraId: string;
  obraNome: string;
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
      usuarioId,
      usuarioNome,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Erro ao registrar movimentação:", error);
    throw error;
  }
}