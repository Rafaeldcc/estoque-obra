"use client";

import { useEffect, useState } from "react";

import {
collection,
getDocs,
doc,
updateDoc
} from "firebase/firestore";

import {
ref,
uploadBytes,
getDownloadURL
} from "firebase/storage";

import { db, storage } from "@/lib/firebase";
import { useParams, useRouter } from "next/navigation";

interface Material{
id:string
nome:string
saldo:number
unidade:string
foto?:string
}

export default function ControleEstoque(){

const router = useRouter()
const params = useParams()

const obraId = params.id as string
const setorId = params.setorId as string

const [materiais,setMateriais] = useState<Material[]>([])
const [materialSelecionado,setMaterialSelecionado] = useState<Material | null>(null)
const [busca,setBusca] = useState("")
const [mensagem,setMensagem] = useState("")

useEffect(()=>{
carregarMateriais()
},[])

async function carregarMateriais(){

const snapshot = await getDocs(
collection(db,"obras",obraId,"setores",setorId,"materiais")
)

const lista:Material[] = []

snapshot.forEach(docSnap=>{

const data = docSnap.data()

lista.push({
id:docSnap.id,
nome:data.nome,
saldo:data.saldo ?? 0,
unidade:data.unidade ?? "",
foto:data.foto ?? ""
})

})

lista.sort((a,b)=>a.nome.localeCompare(b.nome))

setMateriais(lista)

}

function mostrarMensagem(texto:string){
setMensagem(texto)
setTimeout(()=>setMensagem(""),3000)
}

async function uploadFoto(e:any,material:Material){

const file = e.target.files[0]
if(!file) return

const storageRef = ref(
storage,
`materiais/${obraId}/${material.id}-${Date.now()}`
)

await uploadBytes(storageRef,file)

const url = await getDownloadURL(storageRef)

await updateDoc(
doc(db,"obras",obraId,"setores",setorId,"materiais",material.id),
{foto:url}
)

mostrarMensagem("Foto salva")

}

function normalizar(texto:string){

return texto
.normalize("NFD")
.replace(/[\u0300-\u036f]/g,"")
.toLowerCase()

}

const filtrados = materiais.filter(m =>
normalizar(m.nome).startsWith(normalizar(busca))
)

return(

<div className="max-w-6xl mx-auto p-8">

<button
onClick={()=>router.push(`/obra/${obraId}`)}
className="bg-gray-600 text-white px-4 py-2 rounded mb-6"
>
← Voltar
</button>

<h1 className="text-3xl font-bold mb-6">
Controle de Estoque
</h1>

{!materialSelecionado && (

<>

<input
placeholder="Buscar material..."
value={busca}
onChange={(e)=>setBusca(e.target.value)}
className="border p-3 rounded mb-6 w-full"
/>

<table className="w-full border">

<thead className="bg-gray-100">
<tr>
<th className="p-3 text-left">Material</th>
<th className="p-3 text-center">Quantidade</th>
</tr>
</thead>

<tbody>

{filtrados.map(material=>(

<tr
key={material.id}
className="border-t hover:bg-gray-50 cursor-pointer"
onClick={()=>setMaterialSelecionado(material)}
>

<td className="p-3">{material.nome}</td>

<td className="p-3 text-center font-bold">
{material.saldo} {material.unidade}
</td>

</tr>

))}

</tbody>

</table>

</>

)}

{materialSelecionado && (

<div className="bg-gray-50 border rounded-xl p-8">

<button
onClick={()=>setMaterialSelecionado(null)}
className="mb-6 text-blue-600"
>
← Voltar
</button>

<h2 className="text-xl font-bold mb-2">
{materialSelecionado.nome}
</h2>

<p className="mb-4">
Quantidade atual:
<strong> {materialSelecionado.saldo} {materialSelecionado.unidade}</strong>
</p>

<input
type="file"
accept="image/*"
onChange={(e)=>uploadFoto(e,materialSelecionado)}
className="mb-4"
/>

</div>

)}

{mensagem && (

<div className="fixed top-6 right-6 bg-green-600 text-white px-6 py-3 rounded-xl shadow-xl">
{mensagem}
</div>

)}

</div>

)

}