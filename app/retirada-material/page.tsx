"use client";

import { useEffect, useState } from "react";
import { db, auth } from "@/lib/firebase";
import { registrarMovimentacao } from "@/lib/movimentacoes";

import {
  collection,
  getDocs,
  doc,
  updateDoc,
  increment,
  addDoc,
  getDoc,
  query,
  where,
  setDoc
} from "firebase/firestore";

type Material = {
  id: string;
  nome: string;
  saldo: number;
  unidade?: string;
  setorId: string;
};

export default function RetiradaMaterial() {

  const [empresaId,setEmpresaId] = useState<string | null>(null);

  const [obras,setObras] = useState<any[]>([]);
  const [obraSelecionada,setObraSelecionada] = useState("");

  const [setores,setSetores] = useState<any[]>([]);
  const [setorSelecionado,setSetorSelecionado] = useState("");

  const [materiais,setMateriais] = useState<Material[]>([]);

  const [quantidades,setQuantidades] = useState<{[key:string]:number}>({});
  const [tipoMov,setTipoMov] = useState<{[key:string]:string}>({});
  const [obraDestino,setObraDestino] = useState<{[key:string]:string}>({});

  useEffect(()=>{

    const user = auth.currentUser;
    if(!user) return;

    carregarUsuario(user.uid);

  },[]);

  useEffect(()=>{

    if(empresaId){
      carregarObras();
    }

  },[empresaId]);

  async function carregarUsuario(uid:string){

    const snap = await getDoc(doc(db,"usuarios",uid));

    if(snap.exists()){

      const data = snap.data();
      setEmpresaId(data.empresaId);

    }

  }

  async function carregarObras(){

    const q = query(
      collection(db,"obras"),
      where("empresaId","==",empresaId)
    );

    const snap = await getDocs(q);

    setObras(
      snap.docs.map(doc=>({
        id:doc.id,
        ...doc.data()
      }))
    );

  }

  async function carregarSetores(obraId:string){

    const snap = await getDocs(
      collection(db,"obras",obraId,"setores")
    );

    setSetores(
      snap.docs.map(doc=>({
        id:doc.id,
        ...doc.data()
      }))
    );

  }

  async function carregarMateriais(obraId:string,setorId:string){

    const materiaisSnap = await getDocs(
      collection(
        db,
        "obras",
        obraId,
        "setores",
        setorId,
        "materiais"
      )
    );

    let lista:Material[] = [];

    materiaisSnap.docs.forEach(docSnap=>{

      const data = docSnap.data();

      lista.push({
        id:docSnap.id,
        nome:data.nome,
        saldo:data.saldo || 0,
        unidade:data.unidade || "",
        setorId:setorId
      });

    });

    setMateriais(lista);

  }

  async function retirar(material:Material){

    const qtd = quantidades[material.id];
    const tipo = tipoMov[material.id] || "uso";

    if(!qtd || qtd <= 0){
      alert("Quantidade inválida");
      return;
    }

    if(qtd > material.saldo){
      alert("Saldo insuficiente");
      return;
    }

    const materialRef = doc(
      db,
      "obras",
      obraSelecionada,
      "setores",
      material.setorId,
      "materiais",
      material.id
    );

    // 🔹 VALIDAÇÃO DA TRANSFERÊNCIA
    if(tipo === "transferencia"){

      const destinoId = obraDestino[material.id];

      if(!destinoId){
        alert("Selecione obra destino");
        return;
      }

    }

    // 🔹 ATUALIZA SALDO DA OBRA ATUAL
    await updateDoc(materialRef,{
      saldo: increment(-qtd)
    });

    // 🔹 SE FOR TRANSFERÊNCIA
if(tipo === "transferencia"){

  const destinoId = obraDestino[material.id];

  const materialDestinoRef = doc(
    db,
    "obras",
    destinoId,
    "setores",
    material.setorId,
    "materiais",
    material.id
  );

  await updateDoc(materialDestinoRef,{
    nome: material.nome,
    saldo: increment(qtd),
    unidade: material.unidade
  }).catch(async () => {

    await setDoc(materialDestinoRef,{
      nome: material.nome,
      saldo: qtd,
      unidade: material.unidade
    });

  });

}
    // 🔹 REGISTRAR MOVIMENTAÇÃO
    const obraNome =
      obras.find((o) => o.id === obraSelecionada)?.nome || "";

    const obraDestinoNome =
      obras.find((o) => o.id === obraDestino[material.id])?.nome || null;

    await registrarMovimentacao({

      materialId: material.id,
      materialNome: material.nome,

      tipo: tipo === "transferencia" ? "transferencia" : "saida",

      quantidade: qtd,

      obraId: obraSelecionada,
      obraNome: obraNome,

      destino:
        tipo === "transferencia"
          ? "transferencia"
          : tipo === "descarte"
          ? "descarte"
          : "uso",

      obraDestino:
        tipo === "transferencia"
          ? obraDestinoNome
          : null,

      usuarioId: auth.currentUser?.uid || "",
      usuarioNome: auth.currentUser?.email || "",

      empresaId: empresaId || ""

    });

    carregarMateriais(obraSelecionada,setorSelecionado);

  }

  return(

<div className="max-w-5xl mx-auto mt-10">

<div className="bg-white shadow-xl rounded-2xl p-8">

<h2 className="text-2xl font-bold mb-6 text-center">
Retirada de Material
</h2>

{/* OBRA */}

<select
className="w-full border rounded-lg p-3 mb-4"
onChange={(e)=>{
const obraId = e.target.value
setObraSelecionada(obraId)
setSetorSelecionado("")
setMateriais([])
carregarSetores(obraId)
}}
>

<option value="">Selecionar obra</option>

{obras.map(obra=>(
<option key={obra.id} value={obra.id}>
{obra.nome}
</option>
))}

</select>

{/* SETOR */}

{setores.length > 0 && (

<select
className="w-full border rounded-lg p-3 mb-6"
onChange={(e)=>{
const setorId = e.target.value
setSetorSelecionado(setorId)
carregarMateriais(obraSelecionada,setorId)
}}
>

<option value="">Selecionar setor</option>

{setores.map(setor=>(
<option key={setor.id} value={setor.id}>
{setor.nome}
</option>
))}

</select>

)}

{/* LISTA COM SCROLL */}

<div className="max-h-[60vh] overflow-y-auto pr-2">

{materiais.map(material=>{

const tipo = tipoMov[material.id] || "uso";

return(

<div
key={material.id}
className="border rounded-xl p-5 mb-4 shadow-sm"
>

<div className="flex justify-between items-center">

<b className="text-lg">{material.nome}</b>

<span className="text-gray-500 text-sm">
Saldo: {material.saldo} {material.unidade}
</span>

</div>

<div className="flex flex-wrap gap-3 mt-4 items-center">

<input
type="number"
placeholder="Quantidade"
value={quantidades[material.id] || ""}
onChange={(e)=>
setQuantidades(prev=>({
...prev,
[material.id]: Number(e.target.value)
}))
}
className="border rounded-lg p-2 w-28"
/>

<select
value={tipo}
onChange={(e)=>
setTipoMov(prev=>({
...prev,
[material.id]: e.target.value
}))
}
className="border rounded-lg p-2"
>

<option value="uso">Uso na obra</option>
<option value="transferencia">Transferência</option>
<option value="descarte">Descarte</option>

</select>

{tipo === "transferencia" && (

<select
className="border rounded-lg p-2"
onChange={(e)=>
setObraDestino(prev=>({
...prev,
[material.id]: e.target.value
}))
}
>

<option value="">Obra destino</option>

{obras
.filter(o => o.id !== obraSelecionada)
.map(o=>(
<option key={o.id} value={o.id}>
{o.nome}
</option>
))}

</select>

)}

<button
onClick={()=>retirar(material)}
className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
>
Confirmar
</button>

</div>

</div>

)

})}

</div>

</div>

</div>

)
}