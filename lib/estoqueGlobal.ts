import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  doc
} from "firebase/firestore";

import { db } from "./firebase";

export async function atualizarEstoqueGlobal(
  material: string,
  setor: string,
  unidade: string,
  quantidade: number
) {

  const q = query(
    collection(db, "estoque_global"),
    where("material", "==", material),
    where("setor", "==", setor)
  );

  const snap = await getDocs(q);

  if (snap.empty) {

    await addDoc(collection(db, "estoque_global"), {
      material,
      setor,
      unidade,
      total: quantidade
    });

  } else {

    const ref = snap.docs[0];

    const atual = ref.data().total ?? 0;

    await updateDoc(doc(db, "estoque_global", ref.id), {
      total: atual + quantidade
    });

  }

}