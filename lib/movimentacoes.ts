import { db } from "@/lib/firebase"
import { collection, addDoc, serverTimestamp } from "firebase/firestore"

export async function registrarMovimentacao({
  materialId,
  materialNome,
  tipo,
  quantidade,
  obraId,
  obraNome,
  usuarioId,
  usuarioNome
}: any) {
  await addDoc(collection(db, "movimentacoes"), {
    materialId,
    materialNome,
    tipo,
    quantidade,
    obraId,
    obraNome,
    usuarioId,
    usuarioNome,
    createdAt: serverTimestamp()
  })
}