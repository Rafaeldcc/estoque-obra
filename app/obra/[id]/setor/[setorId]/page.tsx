"use client";

import { useEffect, useState } from "react";

import {
collection,
getDocs,
doc,
updateDoc,
addDoc,
deleteDoc
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
estoqueMinimo?:number
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

const [quantidade,setQuantidade] = useState(0)
const [tipoMov,setTipoMov] = useState("uso")

const [obras,setObras] = useState<any[]>([])
const [obraDestino,setObraDestino] = useState("")

useEffect(()=>{
carregarMateriais()
carregarObras()
},[])

// 🔥 OBRAS
async function carregarObras(){
const snap = await getDocs(collection(db,"obras"))

const lista:any[] = []

snap.forEach(docSnap=>{
const data = docSnap.data()
lista.push({ id:docSnap.id, nome:data.nome })
})

setObras(lista)
}

// 🔥 MATERIAIS
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
foto:data.foto ?? "",
estoqueMinimo:data.estoqueMinimo ?? 0
})
})

lista.sort((a,b)=>a.nome.localeCompare(b.nome))
setMateriais(lista)
}

// 🔥 MENSAGEM
function mostrarMensagem(texto:string){
setMensagem(texto)
setTimeout(()=>setMensagem(""),3000)
}

//////////////////////////////////////////////////
// 🔥🔥🔥 EXCLUIR MATERIAL (PROFISSIONAL)
//////////////////////////////////////////////////

async function excluirMaterial(material:Material){

if(!confirm(`Deseja excluir o material "${material.nome}"?`)) return

try{

// 🔥 REMOVE DO FIREBASE
await deleteDoc(
doc(db,"obras",obraId,"setores",setorId,"materiais",material.id)
)

// 🔥 LOG
await addDoc(collection(db,"movimentacoes"),{
materialNome: material.nome,
tipo:"exclusao",
obraNome:"Obra atual",
usuarioNome:"Sistema",
criadoEm:new Date()
})

mostrarMensagem("Material excluído com sucesso")

setMaterialSelecionado(null)

await carregarMateriais()

}catch(e){
console.error(e)
alert("Erro ao excluir material")
}

}

//////////////////////////////////////////////////

async function registrarSaida(){

if(!materialSelecionado) return
if(quantidade <= 0) return alert("Digite uma quantidade válida")

if(quantidade > materialSelecionado.saldo){
return alert("Estoque insuficiente")
}

if(tipoMov === "transferencia" && !obraDestino){
return alert("Selecione a obra de destino")
}

const novoSaldo = materialSelecionado.saldo - quantidade

await updateDoc(
doc(db,"obras",obraId,"setores",setorId,"materiais",materialSelecionado.id),
{saldo: novoSaldo}
)

// 🔥 TRANSFERÊNCIA
if(tipoMov === "transferencia"){

const setoresSnap = await getDocs(
collection(db,"obras",obraDestino,"setores")
)

let setorDestinoId = ""

if(setoresSnap.empty){

const novoSetor = await addDoc(
collection(db,"obras",obraDestino,"setores"),
{
nome:"Geral",
criadoEm:new Date()
}
)

setorDestinoId = novoSetor.id

}else{
setorDestinoId = setoresSnap.docs[0].id
}

const materiaisSnap = await getDocs(
collection(db,"obras",obraDestino,"setores",setorDestinoId,"materiais")
)

let existe = false

for(const docMat of materiaisSnap.docs){

const data = docMat.data()

if(data.nome === materialSelecionado.nome){

await updateDoc(docMat.ref,{
saldo: (data.saldo || 0) + quantidade
})

existe = true
break
}
}

if(!existe){

await addDoc(
collection(db,"obras",obraDestino,"setores",setorDestinoId,"materiais"),
{
nome: materialSelecionado.nome,
saldo: quantidade,
unidade: materialSelecionado.unidade,
estoqueMinimo: materialSelecionado.estoqueMinimo ?? 0,
foto: materialSelecionado.foto ?? ""
}
)

}

}

await addDoc(collection(db,"movimentacoes"),{
materialNome: materialSelecionado.nome,
quantidade,
tipo:"saida",
destino: tipoMov,
obraNome:"Obra atual",
obraDestino: obraDestino || null,
usuarioNome:"Sistema",
criadoEm:new Date()
})

mostrarMensagem("Movimentação realizada")

setQuantidade(0)
setObraDestino("")
await carregarMateriais()

}

// 🔥 ENTRADA
async function registrarEntrada(){

if(!materialSelecionado) return
if(quantidade <= 0) return alert("Digite uma quantidade válida")

const novoSaldo = materialSelecionado.saldo + quantidade

await updateDoc(
doc(db,"obras",obraId,"setores",setorId,"materiais",materialSelecionado.id),
{saldo: novoSaldo}
)

mostrarMensagem("Entrada registrada")

setQuantidade(0)
await carregarMateriais()

}

// 🔥 FOTO
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

await carregarMateriais()

setMaterialSelecionado({
...material,
foto:url
})

mostrarMensagem("Foto salva")
}

async function removerFoto(material:Material){

await updateDoc(
doc(db,"obras",obraId,"setores",setorId,"materiais",material.id),
{foto:""}
)

await carregarMateriais()

setMaterialSelecionado({
...material,
foto:""
})

mostrarMensagem("Foto removida")
}

// 🔥 ESTOQUE MÍNIMO
async function salvarEstoqueMinimo(){

if(!materialSelecionado) return

await updateDoc(
doc(db,"obras",obraId,"setores",setorId,"materiais",materialSelecionado.id),
{estoqueMinimo: materialSelecionado.estoqueMinimo ?? 0}
)

mostrarMensagem("Estoque mínimo salvo")
await carregarMateriais()
}

// 🔥 BUSCA
function normalizar(texto:string){
return texto.normalize("NFD")
.replace(/[\u0300-\u036f]/g,"")
.toLowerCase()
}

const filtrados = materiais.filter(m =>
normalizar(m.nome).startsWith(normalizar(busca))
)

//////////////////////////////////////////////////
// UI
//////////////////////////////////////////////////

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

<table className="w-full border rounded">

<tbody>

{filtrados.map(material=>(

<tr
key={material.id}
className="border-t cursor-pointer hover:bg-gray-50"
onClick={()=>setMaterialSelecionado(material)}
>

<td className="p-3">{material.nome}</td>

<td className="p-3 text-right font-bold">
{material.saldo} {material.unidade}
</td>

</tr>

))}

</tbody>
</table>
</>
)}

{materialSelecionado && (

<div className="bg-white border rounded-xl p-8 shadow-md">

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
Saldo: {materialSelecionado.saldo} {materialSelecionado.unidade}
</p>

<div className="flex gap-3 flex-wrap">

<input
type="number"
value={quantidade}
onChange={(e)=>setQuantidade(Number(e.target.value))}
className="border p-2 rounded w-28"
/>

<button onClick={registrarEntrada} className="bg-green-600 text-white px-4 py-2 rounded">
Entrada
</button>

<button onClick={registrarSaida} className="bg-orange-500 text-white px-4 py-2 rounded">
Saída / Transferir
</button>

{/* 🔥 BOTÃO NOVO */}
<button
onClick={()=>excluirMaterial(materialSelecionado)}
className="bg-red-600 text-white px-4 py-2 rounded"
>
Excluir
</button>

</div>

</div>
)}

{mensagem && (
<div className="fixed top-6 right-6 bg-green-600 text-white px-6 py-3 rounded">
{mensagem}
</div>
)}

</div>
)
}