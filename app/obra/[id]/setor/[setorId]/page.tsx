"use client";

import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  addDoc,
  getDoc,
  deleteDoc,
  serverTimestamp,
  onSnapshot
} from "firebase/firestore";

import {
  ref,
  uploadBytes,
  getDownloadURL
} from "firebase/storage";

import { db, storage } from "@/lib/firebase";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/useAuth";

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
const { user } = useAuth()

const searchParams = useSearchParams();
const materialUrl = searchParams.get("material");

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

const [editandoNome, setEditandoNome] = useState(false)
const [novoNome, setNovoNome] = useState("")

// 🔥 CATEGORIAS
const [categorias, setCategorias] = useState<any[]>([])
const [categoriaSelecionada, setCategoriaSelecionada] = useState<any>(null)
const [novaCategoria, setNovaCategoria] = useState("")

// 🔥 CARREGAR CATEGORIAS
useEffect(() => {
  const unsubscribe = onSnapshot(
    collection(db, "obras", obraId, "setores", setorId, "categorias"),
    (snapshot) => {
      const lista = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))

      setCategorias(lista)

      if (!categoriaSelecionada && lista.length > 0) {
        setCategoriaSelecionada(lista[0])
      }
    }
  )

  return () => unsubscribe()
}, [])

// 🔥 CARREGAR MATERIAIS POR CATEGORIA
useEffect(() => {
  if (categoriaSelecionada) {
    carregarMateriais()
  }
}, [categoriaSelecionada])

useEffect(()=>{
carregarObras()
},[])

// 🔥 EXCLUIR MATERIAL
async function excluirMaterial(material: Material){

if (!categoriaSelecionada) return

const confirmar = confirm(`Excluir ${material.nome}?`)
if (!confirmar) return

await deleteDoc(
doc(
  db,
  "obras",
  obraId,
  "setores",
  setorId,
  "categorias",
  categoriaSelecionada.id,
  "materiais",
  material.id
)
)

mostrarMensagem("Material excluído")
carregarMateriais()
}

// 🔥 EDITAR NOME
async function salvarNomeMaterial(){

if(!materialSelecionado || !novoNome.trim() || !categoriaSelecionada) return

await updateDoc(
doc(
  db,
  "obras",
  obraId,
  "setores",
  setorId,
  "categorias",
  categoriaSelecionada.id,
  "materiais",
  materialSelecionado.id
),
{ nome: novoNome }
)

setMaterialSelecionado({
...materialSelecionado,
nome: novoNome
})

setEditandoNome(false)
mostrarMensagem("Nome atualizado")
carregarMateriais()
}

// 🔥 OBRAS
async function carregarObras(){
const snap = await getDocs(collection(db,"obras"))
const lista:any[] = []

snap.forEach(docSnap=>{
lista.push({
id:docSnap.id,
nome:docSnap.data().nome
})
})

setObras(lista)
}

// 🔥 MATERIAIS
async function carregarMateriais(){

if (!categoriaSelecionada) return

const snapshot = await getDocs(
collection(
  db,
  "obras",
  obraId,
  "setores",
  setorId,
  "categorias",
  categoriaSelecionada.id,
  "materiais"
)
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

// 🔥 CRIAR CATEGORIA
async function criarCategoria() {
  if (!novaCategoria.trim()) return

  await addDoc(
    collection(db, "obras", obraId, "setores", setorId, "categorias"),
    { nome: novaCategoria }
  )

  setNovaCategoria("")
}

function mostrarMensagem(texto:string){
setMensagem(texto)
setTimeout(()=>setMensagem(""),3000)
}

// 🔥 SAÍDA + TRANSFERÊNCIA
async function registrarSaida(){

if(!user || !categoriaSelecionada) return
if(!materialSelecionado) return
if(quantidade <= 0) return alert("Digite uma quantidade válida")

if(quantidade > materialSelecionado.saldo){
return alert("Estoque insuficiente")
}

if(tipoMov === "transferencia" && !obraDestino){
return alert("Selecione a obra destino")
}

const userSnap = await getDoc(doc(db,"usuarios",user.uid))
const empresaId = userSnap.data()?.empresaId || null

const obraSnap = await getDoc(doc(db,"obras",obraId))
const obraNome = obraSnap.data()?.nome || `Obra ${obraId}`

// remove da origem
await updateDoc(
doc(
  db,
  "obras",
  obraId,
  "setores",
  setorId,
  "categorias",
  categoriaSelecionada.id,
  "materiais",
  materialSelecionado.id
),
{saldo: materialSelecionado.saldo - quantidade}
)

// 🔁 TRANSFERÊNCIA (mantido original)
if(tipoMov === "transferencia"){

const setorRef = doc(db,"obras",obraId,"setores",setorId)
const setorSnap = await getDoc(setorRef)
const setorNome = setorSnap.data()?.nome

const setoresDestinoRef = collection(db,"obras",obraDestino,"setores")
const setoresSnap = await getDocs(setoresDestinoRef)

let setorDestinoId = ""

const setorExistente = setoresSnap.docs.find(
s => s.data().nome === setorNome
)

if(setorExistente){
setorDestinoId = setorExistente.id
}else{
const novoSetor = await addDoc(setoresDestinoRef,{
nome:setorNome,
criadoEm: serverTimestamp()
})
setorDestinoId = novoSetor.id
}

const materiaisDestinoRef = collection(
db,"obras",obraDestino,"setores",setorDestinoId,"materiais"
)

const materiaisSnap = await getDocs(materiaisDestinoRef)

let encontrou = false

for(const docMat of materiaisSnap.docs){
const data = docMat.data()

if(data.nome === materialSelecionado.nome){
await updateDoc(docMat.ref,{
saldo:(data.saldo || 0) + quantidade
})
encontrou = true
break
}
}

if(!encontrou){
await addDoc(materiaisDestinoRef,{
nome: materialSelecionado.nome,
saldo: quantidade,
unidade: materialSelecionado.unidade || "",
estoqueMinimo: materialSelecionado.estoqueMinimo || 0,
foto: materialSelecionado.foto || ""
})
}
}

// 🔴 LOG
await addDoc(collection(db,"movimentacoes"),{
materialNome: materialSelecionado.nome,
quantidade,
tipo:"saida",
obraId,
obraNome,
empresaId,
usuarioNome: user.email || "Sistema",
criadoEm: serverTimestamp()
})

mostrarMensagem("Movimentação realizada com sucesso")
setQuantidade(0)
setObraDestino("")
carregarMateriais()
}

// 🔥 ENTRADA
async function registrarEntrada(){

if(!user || !materialSelecionado || quantidade <= 0 || !categoriaSelecionada) return

await updateDoc(
doc(
  db,
  "obras",
  obraId,
  "setores",
  setorId,
  "categorias",
  categoriaSelecionada.id,
  "materiais",
  materialSelecionado.id
),
{saldo: materialSelecionado.saldo + quantidade}
)

mostrarMensagem("Entrada registrada")
setQuantidade(0)
carregarMateriais()
}

// 🔥 FOTO
async function uploadFoto(e:any,material:Material){

if (!categoriaSelecionada) return

const file = e.target.files[0]
if(!file) return

const storageRef = ref(
storage,
`materiais/${obraId}/${material.id}-${Date.now()}`
)

await uploadBytes(storageRef,file)
const url = await getDownloadURL(storageRef)

await updateDoc(
doc(
  db,
  "obras",
  obraId,
  "setores",
  setorId,
  "categorias",
  categoriaSelecionada.id,
  "materiais",
  material.id
),
{foto:url}
)

carregarMateriais()
setMaterialSelecionado({...material,foto:url})
mostrarMensagem("Foto salva")
}

// 🔥 FILTRO
function normalizar(texto:string){
return texto.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase()
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

{/* 🔥 CATEGORIAS */}
<div className="flex gap-2 mb-4">
<input
placeholder="Nova categoria"
value={novaCategoria}
onChange={(e)=>setNovaCategoria(e.target.value)}
className="border p-2 rounded"
/>

<button
onClick={criarCategoria}
className="bg-green-600 text-white px-4 py-2 rounded"
>
+ Categoria
</button>
</div>

<div className="flex gap-2 mb-6 flex-wrap">
{categorias.map(cat=>(
<button
key={cat.id}
onClick={()=>setCategoriaSelecionada(cat)}
className={`px-3 py-2 rounded ${
categoriaSelecionada?.id === cat.id
? "bg-gray-800 text-white"
: "bg-gray-300"
}`}
>
{cat.nome}
</button>
))}
</div>

{!materialSelecionado && (
<>
<input
placeholder="Buscar material..."
value={busca}
onChange={(e)=>setBusca(e.target.value)}
className="border p-3 rounded mb-6 w-full"
/>

<div className="border rounded-xl overflow-hidden shadow">
<div className="max-h-[600px] overflow-y-auto">

<table className="w-full">
<thead className="bg-gray-100 sticky top-0">
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
<td className="p-3 flex items-center justify-between">
<div className="flex items-center gap-3">
{material.foto && <img src={material.foto} className="w-10 h-10 rounded"/>}
{material.nome}
</div>

<button
onClick={(e)=>{
e.stopPropagation()
excluirMaterial(material)
}}
className="text-red-500 hover:text-white hover:bg-red-500 p-2 rounded"
>
🗑️
</button>
</td>

<td className="p-3 text-center font-bold">
{material.saldo} {material.unidade}
</td>
</tr>
))}
</tbody>
</table>

</div>
</div>
</>
)}

{materialSelecionado && (
<div className="bg-white border rounded-xl p-8 shadow-md">

<button onClick={()=>setMaterialSelecionado(null)} className="mb-6 text-blue-600">
← Voltar
</button>

<h2 className="text-xl font-bold mb-4">
{materialSelecionado.nome}
</h2>

<p className="mb-2 text-lg">
Quantidade atual:
<strong> {materialSelecionado.saldo} {materialSelecionado.unidade}</strong>
</p>

<div className="mt-6 flex gap-3 flex-wrap">
<input
type="number"
value={quantidade}
onChange={(e)=>setQuantidade(Number(e.target.value))}
className="border p-2 rounded w-28"
/>

<select
value={tipoMov}
onChange={(e)=>setTipoMov(e.target.value)}
className="border p-2 rounded"
>
<option value="uso">Uso na obra</option>
<option value="transferencia">Transferência</option>
<option value="descarte">Descarte</option>
</select>

{tipoMov === "transferencia" && (
<select
value={obraDestino}
onChange={(e)=>setObraDestino(e.target.value)}
className="border p-2 rounded"
>
<option value="">Selecionar obra destino</option>
{obras.filter(o => o.id !== obraId).map((obra)=>(
<option key={obra.id} value={obra.id}>
{obra.nome}
</option>
))}
</select>
)}

<button onClick={registrarSaida} className="bg-red-600 text-white px-4 py-2 rounded">
Confirmar
</button>

<button onClick={registrarEntrada} className="bg-green-600 text-white px-4 py-2 rounded">
Entrada
</button>
</div>

<div className="mt-6">
{materialSelecionado.foto ? (
<>
<img src={materialSelecionado.foto} className="w-48 mb-3"/>
</>
) : (
<label className="bg-green-600 text-white px-4 py-2 rounded cursor-pointer">
Adicionar foto
<input type="file" className="hidden" onChange={(e)=>uploadFoto(e,materialSelecionado)} />
</label>
)}
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