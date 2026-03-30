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

// 🔥 SUBCATEGORIAS
const [subcategorias,setSubcategorias] = useState<any[]>([])
const [subcategoriaSelecionada,setSubcategoriaSelecionada] = useState<any>(null)
const [novaSubcategoria,setNovaSubcategoria] = useState("")

const [novoMaterial,setNovoMaterial] = useState("")
const [unidade,setUnidade] = useState("")

useEffect(()=>{
carregarObras()
},[])

useEffect(()=>{
if(!obraId || !setorId) return

const unsubscribe = onSnapshot(
collection(db,"obras",obraId,"setores",setorId,"subcategorias"),
(snapshot)=>{
setSubcategorias(snapshot.docs.map(doc=>({
id:doc.id,
...doc.data()
})))
}
)

return ()=>unsubscribe()
},[obraId,setorId])

// 🔥 CARREGAR MATERIAL AO CLICAR
useEffect(()=>{
if(subcategoriaSelecionada){
carregarMateriais()
}
},[subcategoriaSelecionada])

// 🔥 URL MATERIAL (CORRETO)
useEffect(() => {

if (!materialUrl || materiais.length === 0) return;

const encontrado = materiais.find(m =>
m.nome.toLowerCase().trim() === materialUrl.toLowerCase().trim()
);

if (encontrado) {
setMaterialSelecionado(encontrado);
}

}, [materialUrl, materiais]);
// 🔥 EXCLUIR MATERIAL
async function excluirMaterial(material: Material){

if(!subcategoriaSelecionada) return

const confirmar = confirm(`Excluir ${material.nome}?`)
if (!confirmar) return

await deleteDoc(
doc(
db,
"obras",obraId,
"setores",setorId,
"subcategorias",subcategoriaSelecionada.id,
"materiais",
material.id
)
)

mostrarMensagem("Material excluído")
carregarMateriais()
}

// 🔥 NORMALIZAR (ADICIONE SE AINDA NÃO TEM)
function normalizar(txt:string){
return txt.toLowerCase().trim().replace(/\s+/g," ")
}

// 🔥 EDITAR NOME (VERSÃO MELHORADA)
async function salvarNomeMaterial(){

if(!materialSelecionado || !novoNome.trim() || !subcategoriaSelecionada) return

// 🔥 EVITAR DUPLICADO
const snapshot = await getDocs(
collection(
db,
"obras",obraId,
"setores",setorId,
"subcategorias",subcategoriaSelecionada.id,
"materiais"
)
)

const existe = snapshot.docs.find(doc =>
normalizar(doc.data().nome) === normalizar(novoNome)
)

if(existe && normalizar(novoNome) !== normalizar(materialSelecionado.nome)){
mostrarMensagem("Já existe material com esse nome")
return
}

await updateDoc(
doc(
db,
"obras",obraId,
"setores",setorId,
"subcategorias",subcategoriaSelecionada.id,
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

// 🔥 OBRAS (OK, SÓ MELHORIA DE SEGURANÇA)
async function carregarObras(){
const snap = await getDocs(collection(db,"obras"))

const lista = snap.docs.map(docSnap=>({
id:docSnap.id,
nome:docSnap.data().nome
}))

setObras(lista)
}

// 🔥 MATERIAIS (PROTEÇÃO EXTRA)
async function carregarMateriais(){

if(!subcategoriaSelecionada || !obraId || !setorId) return

const snapshot = await getDocs(
collection(
db,
"obras",obraId,
"setores",setorId,
"subcategorias",subcategoriaSelecionada.id,
"materiais"
)
)

const lista:Material[] = snapshot.docs.map(docSnap=>{
const data = docSnap.data()

return {
id:docSnap.id,
nome:data.nome,
saldo:data.saldo ?? 0,
unidade:data.unidade ?? "",
foto:data.foto ?? "",
estoqueMinimo:data.estoqueMinimo ?? 0
}
})

lista.sort((a,b)=>a.nome.localeCompare(b.nome))
setMateriais(lista)
}

// 🔥 CRIAR MATERIAL (VERSÃO PROFISSIONAL)
async function criarMaterial(){

if(!novoMaterial.trim() || !subcategoriaSelecionada) return

const snapshot = await getDocs(
collection(
db,
"obras",obraId,
"setores",setorId,
"subcategorias",subcategoriaSelecionada.id,
"materiais"
)
)

const existe = snapshot.docs.find(doc =>
normalizar(doc.data().nome) === normalizar(novoMaterial)
)

if(existe){
mostrarMensagem("Material já existe")
return
}

await addDoc(
collection(
db,
"obras",obraId,
"setores",setorId,
"subcategorias",subcategoriaSelecionada.id,
"materiais"
),
{
nome: novoMaterial,
saldo: 0,
unidade: unidade || "un",
estoqueMinimo: 0,
foto: ""
}
)

setNovoMaterial("")
setUnidade("")
mostrarMensagem("Material cadastrado")

carregarMateriais()
}

// 🔥 SAÍDA + TRANSFERÊNCIA
async function registrarSaida(){

if(!user){
alert("Usuário não autenticado")
return
}

if(!materialSelecionado || !subcategoriaSelecionada) return
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

// 🔥 REMOVE DA ORIGEM (SEGURO)
await updateDoc(
doc(
db,
"obras",obraId,
"setores",setorId,
"subcategorias",subcategoriaSelecionada.id,
"materiais",
materialSelecionado.id
),
{
saldo: increment(-quantidade)
}
)

// 🔁 TRANSFERÊNCIA
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
saldo: increment(quantidade)
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

const obraDestinoSnap = await getDoc(doc(db,"obras",obraDestino))
const obraDestinoNome = obraDestinoSnap.data()?.nome || `Obra ${obraDestino}`

await addDoc(collection(db,"movimentacoes"),{
materialNome: materialSelecionado.nome,
quantidade,
tipo:"entrada",
obraId: obraDestino,
obraNome: obraDestinoNome,
obraOrigemId: obraId,
obraDestinoId: obraDestino,
destino:"transferencia",
empresaId,
usuarioNome: user.email || "Sistema",
criadoEm: serverTimestamp()
})
}

// 🔴 SAÍDA
await addDoc(collection(db,"movimentacoes"),{
materialNome: materialSelecionado.nome,
quantidade,
tipo:"saida",
obraId: obraId,
obraNome: obraNome,
obraOrigemId: obraId,
obraDestinoId: tipoMov === "transferencia" ? obraDestino : null,
destino: tipoMov,
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

if(!user){
alert("Usuário não autenticado")
return
}

if(!materialSelecionado || !subcategoriaSelecionada) return
if(quantidade <= 0) return alert("Digite uma quantidade válida")

const userSnap = await getDoc(doc(db,"usuarios",user.uid))
const empresaId = userSnap.data()?.empresaId || null

const obraSnap = await getDoc(doc(db,"obras",obraId))
const obraNome = obraSnap.data()?.nome || `Obra ${obraId}`

// 🔥 ENTRADA SEGURA
await updateDoc(
doc(
db,
"obras",obraId,
"setores",setorId,
"subcategorias",subcategoriaSelecionada.id,
"materiais",
materialSelecionado.id
),
{
saldo: increment(quantidade)
}
)

await addDoc(collection(db,"movimentacoes"),{
materialNome: materialSelecionado.nome,
quantidade,
tipo:"entrada",
obraId,
obraNome,
empresaId,
usuarioNome: user.email || "Sistema",
criadoEm: serverTimestamp()
})

mostrarMensagem("Entrada registrada")

setQuantidade(0)
carregarMateriais()
}

// 🔥 FOTO (VERSÃO PROFISSIONAL)
async function uploadFoto(e:any,material:Material){

if(!subcategoriaSelecionada) return

const file = e.target.files[0]
if(!file) return

// 🔥 VALIDAR IMAGEM
if(!file.type.startsWith("image/")){
alert("Envie apenas imagens")
return
}

// 🔥 TAMANHO MÁX 2MB
if(file.size > 2 * 1024 * 1024){
alert("Imagem muito grande (máx 2MB)")
return
}

const storageRef = ref(
storage,
`materiais/${obraId}/${material.id}-${Date.now()}`
)

await uploadBytes(storageRef,file)
const url = await getDownloadURL(storageRef)

await updateDoc(
doc(
db,
"obras",obraId,
"setores",setorId,
"subcategorias",subcategoriaSelecionada.id,
"materiais",
material.id
),
{foto:url}
)

carregarMateriais()

// 🔥 ATUALIZA SOMENTE SE FOR O MESMO MATERIAL
if(materialSelecionado?.id === material.id){
setMaterialSelecionado({...material,foto:url})
}

mostrarMensagem("Foto salva")
}

// 🔥 REMOVER FOTO (SEGURO)
async function removerFoto(material:Material){

if(!subcategoriaSelecionada) return

await updateDoc(
doc(
db,
"obras",obraId,
"setores",setorId,
"subcategorias",subcategoriaSelecionada.id,
"materiais",
material.id
),
{foto:""}
)

carregarMateriais()

if(materialSelecionado?.id === material.id){
setMaterialSelecionado({...material,foto:""})
}

mostrarMensagem("Foto removida")
}

// 🔥 ESTOQUE MÍNIMO (CORRIGIDO)
async function salvarEstoqueMinimo(){

if(!materialSelecionado || !subcategoriaSelecionada) return

await updateDoc(
doc(
db,
"obras",obraId,
"setores",setorId,
"subcategorias",subcategoriaSelecionada.id,
"materiais",
materialSelecionado.id
),
{
estoqueMinimo: Number(materialSelecionado.estoqueMinimo) || 0
}
)

mostrarMensagem("Estoque mínimo salvo")
carregarMateriais()
}

// 🔥 NORMALIZAR
function normalizar(texto:string){
return texto.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase()
}

// 🔥 FILTRO
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

{/* 🔥 CADASTRO MATERIAL */}
{subcategoriaSelecionada && !materialSelecionado && (

<div className="flex gap-2 mb-4">

<input
placeholder="Nome do material"
value={novoMaterial}
onChange={(e)=>setNovoMaterial(e.target.value)}
onKeyDown={(e)=>{
if(e.key === "Enter") criarMaterial()
}}
autoFocus
className="border p-2 rounded"
/>

<input
placeholder="Un"
value={unidade}
onChange={(e)=>setUnidade(e.target.value)}
onKeyDown={(e)=>{
if(e.key === "Enter") criarMaterial()
}}
className="border p-2 rounded w-32"
/>

<button
onClick={criarMaterial}
className="bg-green-600 text-white px-4 py-2 rounded"
>
+ Material
</button>

</div>

)}

{/* 🔥 CADASTRO SUBCATEGORIA */}
<div className="flex gap-2 mb-4">
<input
placeholder="Ex: Fio 1,5mm"
value={novaSubcategoria}
onChange={(e)=>setNovaSubcategoria(e.target.value)}
onKeyDown={(e)=>{
if(e.key === "Enter") criarSubcategoria()
}}
className="border p-2 rounded"
/>

<button
onClick={criarSubcategoria}
className="bg-green-600 text-white px-4 py-2 rounded"
>
+ Subcategoria
</button>
</div>

{/* 🔥 LISTA SUBCATEGORIAS */}
<div className="flex gap-2 mb-6 flex-wrap">

{!subcategoriaSelecionada && subcategorias
.slice()
.sort((a,b)=>{
const numA = parseFloat(a.nome.replace(/[^0-9,]/g,"").replace(",","."))
const numB = parseFloat(b.nome.replace(/[^0-9,]/g,"").replace(",","."))
return numA - numB
})
.map(sub=>(

<div key={sub.id} className="flex items-center gap-2">

<button
onClick={()=>setSubcategoriaSelecionada(sub)}
className="bg-gray-300 px-3 py-2 rounded"
>
{sub.nome}
</button>

<button
onClick={async()=>{
const novo = prompt("Novo nome:", sub.nome)
if(!novo) return

await updateDoc(
doc(db,"obras",obraId,"setores",setorId,"subcategorias",sub.id),
{ nome: novo }
)
}}
className="text-blue-600"
>
✏️
</button>

<button
onClick={async()=>{
const confirmar = confirm("Excluir subcategoria?")
if(!confirmar) return

await deleteDoc(
doc(db,"obras",obraId,"setores",setorId,"subcategorias",sub.id)
)
}}
className="text-red-600"
>
🗑️
</button>

</div>

))}

</div>

{subcategoriaSelecionada && (
<button
onClick={()=>{
setSubcategoriaSelecionada(null)
setMaterialSelecionado(null)
setQuantidade(0)
setBusca("") // 🔥 limpa busca (melhoria)
}}
className="bg-blue-600 text-white px-3 py-2 rounded"
>
← Voltar
</button>
)}

</div>

{/* 🔥 LISTA DE MATERIAIS */}
{!materialSelecionado && subcategoriaSelecionada && (
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
{material.foto && (
<img src={material.foto} className="w-10 h-10 rounded"/>
)}
{material.nome}
</div>

<button
onClick={(e)=>{
e.stopPropagation()
excluirMaterial(material)
}}
className="text-red-500 hover:text-white hover:bg-red-500 p-2 rounded transition"
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

{/* 🔥 DETALHE DO MATERIAL */}
{materialSelecionado && (

<div className="bg-white border rounded-xl p-8 shadow-md">

<button
onClick={()=>{
setMaterialSelecionado(null)
setQuantidade(0)
}}
className="mb-6 text-blue-600"
>
← Voltar
</button>

{/* 🔥 NOME */}
<div className="flex items-center gap-3 mb-4">

{editandoNome ? (
<>
<input
value={novoNome}
onChange={(e)=>setNovoNome(e.target.value)}
onKeyDown={(e)=>{
if(e.key === "Enter") salvarNomeMaterial()
}}
className="border p-2 rounded"
/>

<button
onClick={salvarNomeMaterial}
className="bg-green-600 text-white px-3 py-1 rounded"
>
Salvar
</button>

<button
onClick={()=>setEditandoNome(false)}
className="bg-gray-400 text-white px-3 py-1 rounded"
>
Cancelar
</button>
</>
) : (
<>
<h2 className="text-xl font-bold">
{materialSelecionado.nome}
</h2>

<button
onClick={()=>{
setEditandoNome(true)
setNovoNome(materialSelecionado.nome)
}}
className="text-blue-600"
>
✏️
</button>
</>
)}

</div>

<p className="mb-2 text-lg">
Quantidade atual:
<strong> {materialSelecionado.saldo} {materialSelecionado.unidade}</strong>
</p>

{/* 🔥 MOVIMENTAÇÃO */}
<div className="mt-6 flex gap-3 flex-wrap">

<input
type="number"
value={quantidade}
onChange={(e)=>setQuantidade(Number(e.target.value))}
onKeyDown={(e)=>{
if(e.key === "Enter") registrarSaida()
}}
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

{obras
.filter(o => o.id !== obraId)
.map((obra)=>(
<option key={obra.id} value={obra.id}>
{obra.nome}
</option>
))}

</select>
)}

<button
onClick={registrarSaida}
className="bg-red-600 text-white px-4 py-2 rounded"
>
Confirmar
</button>

<button
onClick={registrarEntrada}
className="bg-green-600 text-white px-4 py-2 rounded"
>
Entrada
</button>

</div>

{/* 🔥 ESTOQUE MÍNIMO */}
<div className="mt-6">
<input
type="number"
value={materialSelecionado.estoqueMinimo ?? 0}
onChange={(e)=>{
if(!materialSelecionado) return
setMaterialSelecionado({
...materialSelecionado,
estoqueMinimo:Number(e.target.value)
})
}}
className="border p-2 rounded w-32"
/>

<button
onClick={salvarEstoqueMinimo}
className="ml-3 bg-blue-600 text-white px-4 py-2 rounded"
>
Salvar mínimo
</button>
</div>

{/* 🔥 FOTO */}
<div className="mt-6">
{materialSelecionado.foto ? (
<>
<img src={materialSelecionado.foto} className="w-48 mb-3"/>
<button
onClick={()=>removerFoto(materialSelecionado)}
className="bg-red-600 text-white px-4 py-2 rounded"
>
Remover foto
</button>
</>
) : (
<label className="bg-green-600 text-white px-4 py-2 rounded cursor-pointer">
Adicionar foto
<input
type="file"
className="hidden"
onChange={(e)=>uploadFoto(e,materialSelecionado)}
/>
</label>
)}
</div>

</div>
)}

{/* 🔥 MENSAGEM */}
{mensagem && (
<div className="fixed top-6 right-6 bg-green-600 text-white px-6 py-3 rounded">
{mensagem}
</div>
)}

</div>
)
}