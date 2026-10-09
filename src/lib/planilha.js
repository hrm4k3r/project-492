import { CATEGORIAS } from "./loja";

export const COLUNAS = [
  "nome",
  "categoria",
  "preco",
  "marca",
  "pais",
  "estilo",
  "descricao",
  "fotos",
  "ativo",
  "peso_kg",
  "altura_cm",
  "largura_cm",
  "comprimento_cm",
];

const ALIASES = {
  nome: ["nome", "produto", "titulo", "nomedoproduto"],
  categoria: ["categoria"],
  preco: ["preco", "valor", "precor", "precoreais"],
  marca: ["marca"],
  pais: ["pais", "paisdeorigem", "origem"],
  estilo: ["estilo", "tipo", "estilotipo"],
  descricao: ["descricao", "descricaocurta", "shortdescription"],
  fotos: ["fotos", "foto", "imagem", "imagens"],
  ativo: ["ativo", "situacao", "status"],
  peso_kg: ["pesokg", "peso"],
  altura_cm: ["alturacm", "altura"],
  largura_cm: ["larguracm", "largura"],
  comprimento_cm: ["comprimentocm", "comprimento"],
};

// Medidas estimadas da embalagem pronta para envio, usadas quando a planilha não informa.
export const DIMENSOES_PADRAO = {
  "cervejas-nacionais": { peso_kg: 0.8, altura_cm: 30, largura_cm: 10, comprimento_cm: 10 },
  "cervejas-importadas": { peso_kg: 0.8, altura_cm: 30, largura_cm: 10, comprimento_cm: 10 },
  vinhos: { peso_kg: 1.6, altura_cm: 35, largura_cm: 10, comprimento_cm: 10 },
  queijos: { peso_kg: 0.5, altura_cm: 10, largura_cm: 15, comprimento_cm: 15 },
  cafes: { peso_kg: 0.35, altura_cm: 15, largura_cm: 10, comprimento_cm: 6 },
};

export const norm = (s = "") =>
  String(s)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

const soAlfanumerico = (s) => norm(s).replace(/[^a-z0-9]/g, "");

export function lerCSV(texto) {
  let conteudo = String(texto).replace(/^﻿/, "");
  const primeiraLinha = conteudo.split(/\r?\n/, 1)[0] ?? "";
  const contagem = (c) => primeiraLinha.split(c).length - 1;
  const separador = [";", "\t", ","].sort((a, b) => contagem(b) - contagem(a))[0];

  const linhas = [];
  let linha = [];
  let campo = "";
  let aspas = false;

  for (let i = 0; i < conteudo.length; i++) {
    const c = conteudo[i];
    if (aspas) {
      if (c === '"' && conteudo[i + 1] === '"') {
        campo += '"';
        i++;
      } else if (c === '"') {
        aspas = false;
      } else {
        campo += c;
      }
    } else if (c === '"') {
      aspas = true;
    } else if (c === separador) {
      linha.push(campo);
      campo = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && conteudo[i + 1] === "\n") i++;
      linha.push(campo);
      linhas.push(linha);
      linha = [];
      campo = "";
    } else {
      campo += c;
    }
  }
  if (campo !== "" || linha.length > 0) {
    linha.push(campo);
    linhas.push(linha);
  }

  return linhas.filter((l) => l.some((c) => c.trim() !== ""));
}

export function mapearCabecalho(cabecalho) {
  const indices = {};
  cabecalho.forEach((titulo, i) => {
    const chave = soAlfanumerico(titulo);
    for (const [campo, apelidos] of Object.entries(ALIASES)) {
      if (apelidos.includes(chave) && indices[campo] === undefined) indices[campo] = i;
    }
  });
  return indices;
}

export function lerNumero(valor) {
  let t = String(valor ?? "").replace(/R\$/gi, "").replace(/\s/g, "");
  if (t === "") return null;
  if (t.includes(",") && t.includes(".")) t = t.replace(/\./g, "").replace(",", ".");
  else if (t.includes(",")) t = t.replace(",", ".");
  const n = Number(t);
  return Number.isFinite(n) ? n : NaN;
}

export function resolverCategoria(texto) {
  const t = norm(texto);
  if (!t) return null;
  const exata = CATEGORIAS.find((c) => c.slug === t || norm(c.nome) === t);
  if (exata) return exata.slug;
  if (t.includes("import")) return "cervejas-importadas";
  if (t.includes("nacion") || t.includes("artesanal")) return "cervejas-nacionais";
  if (t.startsWith("vinh")) return "vinhos";
  if (t.startsWith("quei")) return "queijos";
  if (t.startsWith("caf")) return "cafes";
  return null;
}

export function lerAtivo(valor) {
  const t = norm(valor);
  if (["sim", "s", "1", "true", "ativo", "yes"].includes(t)) return true;
  if (["nao", "n", "0", "false", "inativo", "no"].includes(t)) return false;
  return null;
}

export function separarFotos(valor) {
  return String(valor ?? "")
    .split(/[|;\n]/)
    .map((f) => f.trim())
    .filter(Boolean);
}

const ehURL = (f) => /^https?:\/\//i.test(f);
export const nomeDoArquivo = (f) => norm(f.split(/[\\/]/).pop());

export function interpretarPlanilha(texto, produtosExistentes = []) {
  const linhas = lerCSV(texto);
  if (linhas.length < 2) {
    return { erroGeral: "A planilha está vazia. Preencha pelo menos uma linha abaixo do cabeçalho.", linhas: [] };
  }

  const indices = mapearCabecalho(linhas[0]);
  const rotulos = { nome: "nome", preco: "preço", categoria: "categoria" };
  const faltando = ["nome", "preco", "categoria"].filter((c) => indices[c] === undefined).map((c) => rotulos[c]);
  if (faltando.length > 0) {
    return {
      erroGeral: `Não encontramos as colunas obrigatórias: ${faltando.join(", ")}. Use o modelo de planilha para conferir os nomes.`,
      linhas: [],
    };
  }

  const existentes = new Map(produtosExistentes.map((p) => [norm(p.produto), p]));
  const vistos = new Set();
  const resultado = [];

  linhas.slice(1).forEach((celulas, i) => {
    const pega = (campo) => (indices[campo] === undefined ? "" : (celulas[indices[campo]] ?? "").trim());
    const nome = pega("nome");
    if (!nome || /^\(exemplo\)/i.test(nome)) return;

    const erros = [];
    const avisos = [];

    const preco = lerNumero(pega("preco"));
    if (preco === null || Number.isNaN(preco) || preco <= 0) erros.push("Preço inválido");

    const categoria = resolverCategoria(pega("categoria"));
    if (!categoria) erros.push(pega("categoria") ? `Categoria "${pega("categoria")}" não reconhecida` : "Categoria em branco");

    const chave = norm(nome);
    if (vistos.has(chave)) erros.push("Nome repetido na planilha");
    vistos.add(chave);

    const padrao = DIMENSOES_PADRAO[categoria] ?? DIMENSOES_PADRAO.queijos;
    const medidasInformadas = {};
    const medida = (campo) => {
      const n = lerNumero(pega(campo));
      if (n === null) return padrao[campo];
      if (Number.isNaN(n) || n <= 0) {
        avisos.push(`${campo} inválido, usamos o padrão`);
        return padrao[campo];
      }
      medidasInformadas[campo] = n;
      return n;
    };

    const fotos = separarFotos(pega("fotos"));
    const existente = existentes.get(chave) ?? null;

    resultado.push({
      linha: i + 2,
      nome,
      categoria,
      preco,
      marca: pega("marca") || null,
      pais: pega("pais") || null,
      estilo: pega("estilo") || null,
      descricao: pega("descricao") || null,
      fotos,
      ativoInformado: lerAtivo(pega("ativo")),
      peso_kg: medida("peso_kg"),
      altura_cm: medida("altura_cm"),
      largura_cm: medida("largura_cm"),
      comprimento_cm: medida("comprimento_cm"),
      medidasInformadas,
      existente,
      erros,
      avisos,
    });
  });

  if (resultado.length === 0) {
    return { erroGeral: "Não encontramos nenhum produto para importar na planilha.", linhas: [] };
  }
  return { erroGeral: null, linhas: resultado };
}

export function resolverFotos(fotos, arquivosPorNome) {
  const urls = [];
  const arquivos = [];
  const faltando = [];
  fotos.forEach((f) => {
    if (ehURL(f)) urls.push(f);
    else {
      const arquivo = arquivosPorNome.get(nomeDoArquivo(f));
      if (arquivo) arquivos.push(arquivo);
      else faltando.push(f);
    }
  });
  return { urls, arquivos, faltando };
}

const escapar = (valor) => {
  const t = valor === null || valor === undefined ? "" : String(valor);
  return /[";\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
};

export function gerarCSV(linhas) {
  const corpo = [COLUNAS, ...linhas].map((l) => l.map(escapar).join(";")).join("\r\n");
  return `﻿${corpo}\r\n`;
}

export function modeloCSV() {
  return gerarCSV([
    [
      "(EXEMPLO) Delirium Tremens",
      "Cervejas Importadas",
      "42,90",
      "Huyghe",
      "Bélgica",
      "Belgian Ale",
      "Belgian strong ale dourada e encorpada",
      "delirium.jpg",
      "sim",
      "",
      "",
      "",
      "",
    ],
  ]);
}

export function produtosParaLinhas(produtos) {
  return produtos.map((p) => [
    p.produto,
    CATEGORIAS.find((c) => c.slug === p.categoria)?.nome ?? "",
    String(p.valor).replace(".", ","),
    p.marca,
    p.pais,
    p.estilo,
    p.shortdescription,
    (p.imagens ?? []).join("|"),
    p.ativo ? "sim" : "não",
    String(p.peso_kg).replace(".", ","),
    String(p.altura_cm).replace(".", ","),
    String(p.largura_cm).replace(".", ","),
    String(p.comprimento_cm).replace(".", ","),
  ]);
}

export function baixarArquivo(nome, conteudo, tipo = "text/csv;charset=utf-8") {
  const blob = new Blob([conteudo], { type: tipo });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  a.click();
  URL.revokeObjectURL(url);
}
