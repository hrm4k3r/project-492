"use client";
import { useEffect, useState } from "react";
import { supabase } from "../../../../config/supabase";
import { invalidarCategorias } from "../../../lib/useCategorias";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlus, faChevronUp, faChevronDown, faTrashCan, faPen, faCheck, faXmark,
} from "@fortawesome/free-solid-svg-icons";
import AdminTitulo from "../components/AdminTitulo";
import { cardClass, inputClass, labelClass } from "../ui";

function gerarSlug(nome) {
  return nome
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function CategoriasAdmin() {
  const [categorias, setCategorias] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [editandoId, setEditandoId] = useState(null);
  const [editForm, setEditForm] = useState({ nome: "", descricao: "" });
  const [novaForm, setNovaForm] = useState({ nome: "", descricao: "" });
  const [mostraNova, setMostraNova] = useState(false);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  const carregar = async () => {
    setCarregando(true);
    const { data } = await supabase.from("categorias").select("*").order("ordem");
    setCategorias(data ?? []);
    setCarregando(false);
  };

  useEffect(() => { carregar(); }, []);

  const salvarNova = async () => {
    const nome = novaForm.nome.trim();
    if (!nome) return;
    setSalvando(true);
    setErro("");
    const slug = gerarSlug(nome);
    const maxOrdem = categorias.reduce((m, c) => Math.max(m, c.ordem), 0);
    const { error } = await supabase.from("categorias").insert({
      slug,
      nome,
      descricao: novaForm.descricao.trim(),
      ordem: maxOrdem + 1,
    });
    if (error) {
      setErro(error.code === "23505"
        ? `Já existe uma categoria com o slug "${slug}". Escolha um nome diferente.`
        : error.message);
    } else {
      setNovaForm({ nome: "", descricao: "" });
      setMostraNova(false);
      invalidarCategorias();
      await carregar();
    }
    setSalvando(false);
  };

  const salvarEdicao = async (id) => {
    setSalvando(true);
    setErro("");
    const { error } = await supabase
      .from("categorias")
      .update({ nome: editForm.nome.trim(), descricao: editForm.descricao.trim() })
      .eq("id", id);
    if (error) {
      setErro(error.message);
    } else {
      setEditandoId(null);
      invalidarCategorias();
      await carregar();
    }
    setSalvando(false);
  };

  const toggleAtiva = async (cat) => {
    setErro("");
    await supabase.from("categorias").update({ ativa: !cat.ativa }).eq("id", cat.id);
    invalidarCategorias();
    await carregar();
  };

  const moverOrdem = async (cat, direcao) => {
    const idx = categorias.findIndex((c) => c.id === cat.id);
    const outro = categorias[idx + direcao];
    if (!outro) return;
    await Promise.all([
      supabase.from("categorias").update({ ordem: outro.ordem }).eq("id", cat.id),
      supabase.from("categorias").update({ ordem: cat.ordem }).eq("id", outro.id),
    ]);
    invalidarCategorias();
    await carregar();
  };

  const excluir = async (cat) => {
    setErro("");
    const { count } = await supabase
      .from("produtos")
      .select("*", { count: "exact", head: true })
      .eq("categoria", cat.slug);
    if (count > 0) {
      setErro(`"${cat.nome}" possui ${count} produto(s) e não pode ser excluída. Reclassifique os produtos antes.`);
      return;
    }
    if (!confirm(`Excluir permanentemente a categoria "${cat.nome}"?`)) return;
    await supabase.from("categorias").delete().eq("id", cat.id);
    invalidarCategorias();
    await carregar();
  };

  return (
    <div className="flex flex-col gap-8">
      <AdminTitulo
        titulo="Categorias"
        descricao="Gerencie as categorias exibidas no catálogo. A ordem aqui é a ordem exibida na loja."
      />

      {erro && (
        <div className="flex items-start justify-between gap-3 rounded-xl bg-red-50 p-4 text-sm text-red-700">
          <span>{erro}</span>
          <button onClick={() => setErro("")} className="shrink-0 underline">Fechar</button>
        </div>
      )}

      <div className={`${cardClass} p-0 overflow-hidden`}>
        <div className="flex items-center justify-between border-b border-cardBorder px-6 py-4">
          <h2 className="font-display text-xl font-semibold text-primary">
            {carregando ? "Carregando..." : `${categorias.length} categoria${categorias.length !== 1 ? "s" : ""}`}
          </h2>
          <button
            onClick={() => { setMostraNova(true); setEditandoId(null); }}
            className="btn-primary !py-2 text-xs"
          >
            <FontAwesomeIcon icon={faPlus} />
            Nova categoria
          </button>
        </div>

        {mostraNova && (
          <div className="border-b border-cardBorder bg-sand/40 px-6 py-5">
            <p className={`${labelClass} mb-3`}>Nova categoria</p>
            <div className="grid gap-3 sm:grid-cols-[1fr_1.5fr_auto]">
              <div>
                <label className={labelClass}>Nome *</label>
                <input
                  value={novaForm.nome}
                  onChange={(e) => setNovaForm((f) => ({ ...f, nome: e.target.value }))}
                  onKeyDown={(e) => e.key === "Enter" && salvarNova()}
                  placeholder="Ex: Doces"
                  className={`${inputClass} mt-1.5`}
                  autoFocus
                />
                {novaForm.nome && (
                  <p className="mt-1 text-[11px] text-primary/45">Slug: {gerarSlug(novaForm.nome)}</p>
                )}
              </div>
              <div>
                <label className={labelClass}>Descrição</label>
                <input
                  value={novaForm.descricao}
                  onChange={(e) => setNovaForm((f) => ({ ...f, descricao: e.target.value }))}
                  onKeyDown={(e) => e.key === "Enter" && salvarNova()}
                  placeholder="Breve descrição (opcional)"
                  className={`${inputClass} mt-1.5`}
                />
              </div>
              <div className="flex items-end gap-2">
                <button
                  onClick={salvarNova}
                  disabled={salvando || !novaForm.nome.trim()}
                  className="btn-primary !py-2.5 text-xs disabled:opacity-50"
                >
                  <FontAwesomeIcon icon={faCheck} />
                  Salvar
                </button>
                <button
                  onClick={() => setMostraNova(false)}
                  className="btn-outline !py-2.5 text-xs"
                >
                  <FontAwesomeIcon icon={faXmark} />
                </button>
              </div>
            </div>
          </div>
        )}

        {carregando ? (
          <p className="p-6 text-sm text-primary/60">Carregando categorias...</p>
        ) : categorias.length === 0 ? (
          <p className="p-6 text-sm text-primary/60">Nenhuma categoria cadastrada.</p>
        ) : (
          <div className="divide-y divide-cardBorder">
            {categorias.map((cat, idx) => (
              <div key={cat.id} className={`flex flex-wrap items-center gap-4 px-6 py-4 transition-colors ${!cat.ativa ? "opacity-50" : ""}`}>

                {/* Setas de ordem */}
                <div className="flex flex-col gap-0.5">
                  <button
                    onClick={() => moverOrdem(cat, -1)}
                    disabled={idx === 0}
                    aria-label="Mover para cima"
                    className="text-primary/30 transition-colors hover:text-primary disabled:opacity-0"
                  >
                    <FontAwesomeIcon icon={faChevronUp} className="text-[11px]" />
                  </button>
                  <button
                    onClick={() => moverOrdem(cat, 1)}
                    disabled={idx === categorias.length - 1}
                    aria-label="Mover para baixo"
                    className="text-primary/30 transition-colors hover:text-primary disabled:opacity-0"
                  >
                    <FontAwesomeIcon icon={faChevronDown} className="text-[11px]" />
                  </button>
                </div>

                {/* Nome e descrição */}
                <div className="min-w-0 flex-1">
                  {editandoId === cat.id ? (
                    <div className="flex flex-wrap gap-2">
                      <input
                        value={editForm.nome}
                        onChange={(e) => setEditForm((f) => ({ ...f, nome: e.target.value }))}
                        className={`${inputClass} !py-1.5 text-sm`}
                        placeholder="Nome"
                        autoFocus
                      />
                      <input
                        value={editForm.descricao}
                        onChange={(e) => setEditForm((f) => ({ ...f, descricao: e.target.value }))}
                        className={`${inputClass} !py-1.5 text-sm min-w-[12rem] flex-1`}
                        placeholder="Descrição"
                      />
                    </div>
                  ) : (
                    <>
                      <p className="font-medium text-primary">{cat.nome}</p>
                      <p className="text-xs text-primary/45">
                        {cat.slug}
                        {cat.descricao ? ` — ${cat.descricao}` : ""}
                      </p>
                    </>
                  )}
                </div>

                {/* Ações */}
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    onClick={() => toggleAtiva(cat)}
                    className={`rounded-full px-3 py-1 text-[11px] font-medium uppercase tracking-wide transition-colors ${
                      cat.ativa
                        ? "bg-olive/20 text-olive hover:bg-olive/30"
                        : "bg-primary/10 text-primary/50 hover:bg-primary/20"
                    }`}
                    title={cat.ativa ? "Clique para desativar" : "Clique para ativar"}
                  >
                    {cat.ativa ? "Ativa" : "Inativa"}
                  </button>

                  {editandoId === cat.id ? (
                    <>
                      <button
                        onClick={() => salvarEdicao(cat.id)}
                        disabled={salvando}
                        className="btn-primary !py-1.5 text-xs"
                        title="Salvar"
                      >
                        <FontAwesomeIcon icon={faCheck} />
                      </button>
                      <button
                        onClick={() => setEditandoId(null)}
                        className="btn-outline !py-1.5 text-xs"
                        title="Cancelar"
                      >
                        <FontAwesomeIcon icon={faXmark} />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          setEditandoId(cat.id);
                          setEditForm({ nome: cat.nome, descricao: cat.descricao ?? "" });
                          setMostraNova(false);
                        }}
                        className="btn-outline !py-1.5 text-xs"
                        title="Editar"
                      >
                        <FontAwesomeIcon icon={faPen} />
                      </button>
                      <button
                        onClick={() => excluir(cat)}
                        className="text-primary/30 transition-colors hover:text-terracotta"
                        title="Excluir"
                      >
                        <FontAwesomeIcon icon={faTrashCan} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
