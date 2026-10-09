"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "../../../../../config/supabase";
import { CATEGORIAS, formatBRL } from "../../../../lib/loja";
import {
  baixarArquivo, interpretarPlanilha, modeloCSV, nomeDoArquivo, resolverFotos,
} from "../../../../lib/planilha";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faFileArrowDown, faFileCsv, faImages, faCheck, faTriangleExclamation, faArrowLeft,
} from "@fortawesome/free-solid-svg-icons";
import AdminTitulo from "../../components/AdminTitulo";
import { cardClass } from "../../ui";

function lerArquivoTexto(buffer) {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  } catch {
    return new TextDecoder("windows-1252").decode(buffer);
  }
}

const nomeCategoria = (slug) => CATEGORIAS.find((c) => c.slug === slug)?.nome ?? "-";

export default function ImportarProdutos() {
  const [nomeArquivo, setNomeArquivo] = useState("");
  const [analise, setAnalise] = useState(null);
  const [fotos, setFotos] = useState(new Map());
  const [atualizar, setAtualizar] = useState(false);
  const [importando, setImportando] = useState(false);
  const [progresso, setProgresso] = useState({ feitos: 0, total: 0 });
  const [resultado, setResultado] = useState(null);
  const [lendo, setLendo] = useState(false);

  const escolherPlanilha = async (e) => {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    setLendo(true);
    setResultado(null);
    setNomeArquivo(arquivo.name);
    const texto = lerArquivoTexto(await arquivo.arrayBuffer());
    const { data } = await supabase.from("produtos").select("id, produto, imagens, ativo");
    setAnalise(interpretarPlanilha(texto, data ?? []));
    setLendo(false);
  };

  const escolherFotos = (e) => {
    const mapa = new Map();
    Array.from(e.target.files ?? []).forEach((f) => mapa.set(nomeDoArquivo(f.name), f));
    setFotos(mapa);
    setResultado(null);
  };

  const linhas = useMemo(() => {
    if (!analise?.linhas) return [];
    return analise.linhas.map((l) => {
      const f = resolverFotos(l.fotos, fotos);
      let situacao = "novo";
      if (l.erros.length > 0) situacao = "erro";
      else if (l.existente) situacao = atualizar ? "atualizar" : "ignorado";
      return { ...l, f, situacao };
    });
  }, [analise, fotos, atualizar]);

  const contagem = useMemo(() => {
    const c = { novo: 0, atualizar: 0, ignorado: 0, erro: 0, semFoto: 0 };
    linhas.forEach((l) => {
      c[l.situacao]++;
      if ((l.situacao === "novo") && l.f.urls.length + l.f.arquivos.length === 0) c.semFoto++;
    });
    return c;
  }, [linhas]);

  const aImportar = linhas.filter((l) => l.situacao === "novo" || l.situacao === "atualizar");

  const importar = async () => {
    setImportando(true);
    setResultado(null);
    setProgresso({ feitos: 0, total: aImportar.length });

    const saida = { criados: 0, atualizados: 0, semFoto: 0, falhas: [], avisos: [] };
    const jaEnviadas = new Map();

    for (let i = 0; i < aImportar.length; i++) {
      const l = aImportar[i];
      try {
        const urlsEnviadas = [];
        for (const arquivo of l.f.arquivos) {
          const chave = nomeDoArquivo(arquivo.name);
          if (!jaEnviadas.has(chave)) {
            const caminho = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${arquivo.name.replace(/[^a-zA-Z0-9.\-_]/g, "")}`;
            const { error: erroUpload } = await supabase.storage.from("produtos").upload(caminho, arquivo);
            if (erroUpload) throw new Error("Falha ao enviar a foto " + arquivo.name + ": " + erroUpload.message);
            jaEnviadas.set(chave, supabase.storage.from("produtos").getPublicUrl(caminho).data.publicUrl);
          }
          urlsEnviadas.push(jaEnviadas.get(chave));
        }
        l.f.faltando.forEach((nome) => saida.avisos.push(`Linha ${l.linha}: foto "${nome}" não foi encontrada.`));

        const imagensNovas = [...l.f.urls, ...urlsEnviadas];
        const base = {
          produto: l.nome,
          shortdescription: l.descricao,
          valor: l.preco,
          categoria: l.categoria,
          marca: l.marca,
          pais: l.pais,
          estilo: l.estilo,
          peso_kg: l.peso_kg,
          altura_cm: l.altura_cm,
          largura_cm: l.largura_cm,
          comprimento_cm: l.comprimento_cm,
        };

        if (l.situacao === "atualizar") {
          const payload = { valor: l.preco, categoria: l.categoria, ...l.medidasInformadas };
          ["marca", "pais", "estilo"].forEach((campo) => {
            if (l[campo] !== null) payload[campo] = l[campo];
          });
          if (l.descricao !== null) payload.shortdescription = l.descricao;
          if (imagensNovas.length > 0) payload.imagens = imagensNovas;
          if (l.ativoInformado !== null) payload.ativo = l.ativoInformado;
          const { error } = await supabase.from("produtos").update(payload).eq("id", l.existente.id);
          if (error) throw new Error(error.message);
          saida.atualizados++;
        } else {
          const temFoto = imagensNovas.length > 0;
          const ativo = temFoto ? (l.ativoInformado ?? true) : false;
          const { error } = await supabase.from("produtos").insert({ ...base, imagens: imagensNovas, ativo });
          if (error) throw new Error(error.message);
          saida.criados++;
          if (!temFoto) saida.semFoto++;
        }
      } catch (err) {
        saida.falhas.push(`Linha ${l.linha} (${l.nome}): ${err.message}`);
      }
      setProgresso({ feitos: i + 1, total: aImportar.length });
    }

    setResultado(saida);
    setImportando(false);
  };

  const rotuloSituacao = {
    novo: { texto: "Novo", classe: "bg-olive/20 text-olive" },
    atualizar: { texto: "Atualizar", classe: "bg-gold/30 text-primary" },
    ignorado: { texto: "Já existe", classe: "bg-primary/10 text-primary/55" },
    erro: { texto: "Erro", classe: "bg-terracotta/15 text-terracotta" },
  };

  return (
    <div>
      <Link href="/admin/produtos" className="mb-4 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-primary/60 hover:text-terracotta">
        <FontAwesomeIcon icon={faArrowLeft} />
        Voltar para produtos
      </Link>
      <AdminTitulo
        titulo="Importar planilha"
        descricao="Cadastre vários produtos de uma vez a partir de uma planilha CSV."
      />

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className={cardClass}>
          <h2 className="font-display text-2xl font-semibold text-primary">1. Prepare a planilha</h2>
          <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-primary/75">
            <li>Baixe o modelo e abra no Excel ou no Google Planilhas.</li>
            <li>
              Preencha uma linha por produto. Obrigatórios: <strong>nome</strong>, <strong>categoria</strong> e{" "}
              <strong>preço</strong>. O resto é opcional.
            </li>
            <li>
              Categorias aceitas: {CATEGORIAS.map((c) => c.nome).join(", ")}.
            </li>
            <li>
              Na coluna <strong>fotos</strong>, escreva o nome do arquivo (ex: <code>delirium.jpg</code>) ou um link.
              Para mais de uma foto, separe com <code>|</code>. Prefira enviar os arquivos: fotos por link continuam
              hospedadas no outro site e podem sumir se ele tirar a imagem do ar.
            </li>
            <li>
              Salve como <strong>CSV</strong> (no Excel: &quot;CSV UTF-8&quot;).
            </li>
          </ol>
          <button
            onClick={() => baixarArquivo("modelo-produtos.csv", modeloCSV())}
            className="btn-outline mt-5 !py-2.5 text-xs"
          >
            <FontAwesomeIcon icon={faFileArrowDown} />
            Baixar modelo
          </button>
          <p className="mt-4 text-xs leading-relaxed text-primary/50">
            Sem peso e medidas na planilha, usamos estimativas por categoria (garrafa de cerveja: 0,8 kg, 30x10x10 cm).
            Elas afetam o frete, então ajuste depois se souber os valores reais.
          </p>
        </section>

        <section className={cardClass}>
          <h2 className="font-display text-2xl font-semibold text-primary">2. Envie os arquivos</h2>

          <label className="mt-4 flex cursor-pointer items-center gap-4 rounded-xl border border-dashed border-primary/30 p-4 transition-colors hover:border-gold">
            <FontAwesomeIcon icon={faFileCsv} className="text-2xl text-terracotta" />
            <span className="text-sm">
              <span className="block font-medium text-primary">{nomeArquivo || "Escolher planilha (.csv)"}</span>
              <span className="text-primary/55">{lendo ? "Lendo..." : "Clique para selecionar"}</span>
            </span>
            <input type="file" accept=".csv,text/csv" onChange={escolherPlanilha} className="hidden" aria-label="Planilha CSV" />
          </label>

          <label className="mt-3 flex cursor-pointer items-center gap-4 rounded-xl border border-dashed border-primary/30 p-4 transition-colors hover:border-gold">
            <FontAwesomeIcon icon={faImages} className="text-2xl text-terracotta" />
            <span className="text-sm">
              <span className="block font-medium text-primary">
                {fotos.size > 0 ? `${fotos.size} foto${fotos.size > 1 ? "s" : ""} selecionada${fotos.size > 1 ? "s" : ""}` : "Escolher fotos (opcional)"}
              </span>
              <span className="text-primary/55">Selecione todas de uma vez. Os nomes devem bater com a planilha.</span>
            </span>
            <input type="file" accept="image/*" multiple onChange={escolherFotos} className="hidden" aria-label="Fotos dos produtos" />
          </label>

          <label className="mt-4 flex cursor-pointer items-start gap-3 text-sm text-primary/80">
            <input
              type="checkbox" checked={atualizar} onChange={(e) => setAtualizar(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-[#5A2A14]"
            />
            <span>
              Atualizar produtos que já existem (mesmo nome).
              <span className="block text-xs text-primary/50">
                Desmarcado, eles são ignorados. Marcado, só mudamos o que estiver preenchido na planilha: células em
                branco mantêm o valor atual.
              </span>
            </span>
          </label>
        </section>
      </div>

      {analise?.erroGeral && (
        <p className="mt-6 flex items-start gap-3 rounded-xl bg-gold/20 p-4 text-sm text-terracotta">
          <FontAwesomeIcon icon={faTriangleExclamation} className="mt-0.5" />
          {analise.erroGeral}
        </p>
      )}

      {linhas.length > 0 && (
        <section className="mt-8">
          <h2 className="font-display text-3xl font-semibold text-primary">3. Confira e importe</h2>
          <div className="mt-3 flex flex-wrap gap-2 text-xs font-medium">
            <span className="rounded-full bg-olive/20 px-3 py-1 text-olive">{contagem.novo} novos</span>
            {contagem.atualizar > 0 && <span className="rounded-full bg-gold/30 px-3 py-1 text-primary">{contagem.atualizar} para atualizar</span>}
            {contagem.ignorado > 0 && <span className="rounded-full bg-primary/10 px-3 py-1 text-primary/60">{contagem.ignorado} já existem (ignorados)</span>}
            {contagem.erro > 0 && <span className="rounded-full bg-terracotta/15 px-3 py-1 text-terracotta">{contagem.erro} com erro (ignorados)</span>}
            {contagem.semFoto > 0 && <span className="rounded-full bg-gold/25 px-3 py-1 text-primary">{contagem.semFoto} sem foto (entram inativos)</span>}
          </div>

          <div className={`${cardClass} mt-4 max-h-[28rem] overflow-auto !p-0`}>
            <table className="w-full min-w-[720px] border-collapse text-left text-sm">
              <thead className="sticky top-0 bg-white">
                <tr className="border-b border-cardBorder text-[11px] uppercase tracking-[0.14em] text-primary/50">
                  <th className="px-4 py-3 font-medium">Linha</th>
                  <th className="px-3 py-3 font-medium">Produto</th>
                  <th className="px-3 py-3 font-medium">Categoria</th>
                  <th className="px-3 py-3 font-medium">Preço</th>
                  <th className="px-3 py-3 font-medium">Fotos</th>
                  <th className="px-4 py-3 font-medium">Situação</th>
                </tr>
              </thead>
              <tbody>
                {linhas.map((l) => {
                  const r = rotuloSituacao[l.situacao];
                  const total = l.f.urls.length + l.f.arquivos.length;
                  return (
                    <tr key={l.linha} className="border-b border-cardBorder/60 align-top last:border-0">
                      <td className="px-4 py-2.5 text-primary/50">{l.linha}</td>
                      <td className="px-3 py-2.5 font-medium text-primary">{l.nome}</td>
                      <td className="px-3 py-2.5 text-primary/70">{nomeCategoria(l.categoria)}</td>
                      <td className="px-3 py-2.5 text-primary/70">{Number.isFinite(l.preco) ? formatBRL(l.preco) : "-"}</td>
                      <td className="px-3 py-2.5 text-primary/70">
                        {total > 0 ? `${total} ok` : l.fotos.length > 0 ? "" : "nenhuma"}
                        {l.f.faltando.length > 0 && (
                          <span className="block text-xs text-terracotta">não achou: {l.f.faltando.join(", ")}</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide ${r.classe}`}>
                          {r.texto}
                        </span>
                        {l.erros.length > 0 && <span className="mt-1 block text-xs text-terracotta">{l.erros.join("; ")}</span>}
                        {l.avisos.length > 0 && <span className="mt-1 block text-xs text-primary/50">{l.avisos.join("; ")}</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-4">
            <button
              onClick={importar}
              disabled={importando || aImportar.length === 0}
              className="btn-primary !py-3.5 disabled:opacity-60"
            >
              {importando
                ? `Importando ${progresso.feitos} de ${progresso.total}...`
                : `Importar ${aImportar.length} produto${aImportar.length === 1 ? "" : "s"}`}
            </button>
            {importando && (
              <div className="h-2 w-48 overflow-hidden rounded-full bg-cardBorder">
                <div
                  className="h-full bg-gold transition-all"
                  style={{ width: `${progresso.total ? (progresso.feitos / progresso.total) * 100 : 0}%` }}
                />
              </div>
            )}
          </div>
        </section>
      )}

      {resultado && (
        <section className={`${cardClass} mt-8`}>
          <h2 className="flex items-center gap-3 font-display text-3xl font-semibold text-primary">
            <FontAwesomeIcon icon={faCheck} className="text-xl text-olive" />
            Importação concluída
          </h2>
          <ul className="mt-3 space-y-1 text-primary/80">
            <li><strong>{resultado.criados}</strong> produto{resultado.criados === 1 ? "" : "s"} criado{resultado.criados === 1 ? "" : "s"}</li>
            {resultado.atualizados > 0 && <li><strong>{resultado.atualizados}</strong> atualizado{resultado.atualizados === 1 ? "" : "s"}</li>}
            {resultado.falhas.length > 0 && <li className="text-terracotta"><strong>{resultado.falhas.length}</strong> com falha</li>}
          </ul>

          {resultado.semFoto > 0 && (
            <p className="mt-4 rounded-xl bg-gold/20 p-3.5 text-sm text-primary/80">
              {resultado.semFoto} produto{resultado.semFoto > 1 ? "s ficaram" : " ficou"} sem foto e {resultado.semFoto > 1 ? "entraram" : "entrou"} como
              inativo{resultado.semFoto > 1 ? "s" : ""}. Adicione as fotos em Produtos (filtro &quot;Sem foto&quot;) para colocá-los na loja.
            </p>
          )}

          {[...resultado.falhas, ...resultado.avisos].length > 0 && (
            <ul className="mt-4 max-h-48 space-y-1 overflow-auto text-sm text-terracotta">
              {[...resultado.falhas, ...resultado.avisos].map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          )}

          <Link href="/admin/produtos" className="btn-primary mt-5 !py-3">Ver produtos</Link>
        </section>
      )}
    </div>
  );
}
