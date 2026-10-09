"use client";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "../../../../config/supabase";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUpload, faTrashCan, faSpinner } from "@fortawesome/free-solid-svg-icons";
import { CATEGORIAS, SUGESTOES_PAIS, SUGESTOES_ESTILO } from "../../../lib/loja";
import { cardClass, inputClass, labelClass } from "../ui";

function Secao({ titulo, descricao, children }) {
  return (
    <section className={cardClass}>
      <h2 className="font-display text-2xl font-semibold text-primary">{titulo}</h2>
      {descricao && <p className="mt-1 text-sm text-primary/55">{descricao}</p>}
      <div className="mt-5 flex flex-col gap-5">{children}</div>
    </section>
  );
}

function Campo({ label, htmlFor, children }) {
  return (
    <div>
      <label htmlFor={htmlFor} className={labelClass}>{label}</label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

export default function ProductForm({ initialData, onSubmit, submitLabel }) {
  const [form, setForm] = useState({
    produto: initialData?.produto ?? "",
    shortdescription: initialData?.shortdescription ?? "",
    valor: initialData?.valor ?? "",
    imagens: initialData?.imagens ?? [],
    ativo: initialData?.ativo ?? true,
    categoria: initialData?.categoria ?? "",
    marca: initialData?.marca ?? "",
    pais: initialData?.pais ?? "",
    estilo: initialData?.estilo ?? "",
    peso_kg: initialData?.peso_kg ?? 0.5,
    altura_cm: initialData?.altura_cm ?? 10,
    largura_cm: initialData?.largura_cm ?? 15,
    comprimento_cm: initialData?.comprimento_cm ?? 15,
  });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({ ...form, [name]: type === "checkbox" ? checked : value });
  };

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setUploading(true);
    setError("");

    for (const file of files) {
      const path = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, "")}`;
      const { error: uploadError } = await supabase.storage.from("produtos").upload(path, file);

      if (uploadError) {
        setError("Erro ao enviar imagem: " + uploadError.message);
        break;
      }

      const { data } = supabase.storage.from("produtos").getPublicUrl(path);
      setForm((f) => ({ ...f, imagens: [...f.imagens, data.publicUrl] }));
    }

    setUploading(false);
    e.target.value = "";
  };

  const removeImage = (url) => {
    setForm((f) => ({ ...f, imagens: f.imagens.filter((img) => img !== url) }));
  };

  const makeCover = (url) => {
    setForm((f) => ({ ...f, imagens: [url, ...f.imagens.filter((img) => img !== url)] }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (form.imagens.length === 0) {
      setError("Adicione pelo menos uma foto do produto.");
      return;
    }

    setSaving(true);
    await onSubmit({
      ...form,
      valor: Number(form.valor),
      categoria: form.categoria || null,
      marca: form.marca.trim() || null,
      pais: form.pais.trim() || null,
      estilo: form.estilo.trim() || null,
      peso_kg: Number(form.peso_kg),
      altura_cm: Number(form.altura_cm),
      largura_cm: Number(form.largura_cm),
      comprimento_cm: Number(form.comprimento_cm),
    });
    setSaving(false);
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-6 xl:grid-cols-[1.35fr_1fr] xl:items-start">
      <div className="flex flex-col gap-6">
        <Secao titulo="Informações" descricao="O que o cliente vê no catálogo e na página do produto.">
          <Campo label="Nome do produto" htmlFor="produto">
            <input id="produto" required name="produto" value={form.produto} onChange={handleChange} className={inputClass} />
          </Campo>
          <Campo label="Descrição curta" htmlFor="shortdescription">
            <input
              id="shortdescription"
              name="shortdescription"
              value={form.shortdescription}
              onChange={handleChange}
              placeholder='Ex: "IPA belga encorpada, notas cítricas"'
              className={inputClass}
            />
          </Campo>
          <div className="grid gap-5 sm:grid-cols-2">
            <Campo label="Preço (R$)" htmlFor="valor">
              <input
                id="valor" required type="number" step="0.01" min="0"
                name="valor" value={form.valor} onChange={handleChange} className={inputClass}
              />
            </Campo>
            <Campo label="Categoria" htmlFor="categoria">
              <select id="categoria" required name="categoria" value={form.categoria} onChange={handleChange} className={inputClass}>
                <option value="">Selecione...</option>
                {CATEGORIAS.map((c) => (
                  <option key={c.slug} value={c.slug}>{c.nome}</option>
                ))}
              </select>
            </Campo>
          </div>
        </Secao>

        <Secao
          titulo="Detalhes para os filtros"
          descricao='Opcionais. Escreva sempre do mesmo jeito (ex: "Bélgica", nunca "belgica") para o filtro da loja agrupar certo.'
        >
          <div className="grid gap-5 sm:grid-cols-3">
            <Campo label="Marca" htmlFor="marca">
              <input id="marca" name="marca" value={form.marca} onChange={handleChange} className={inputClass} />
            </Campo>
            <Campo label="País de origem" htmlFor="pais">
              <input id="pais" name="pais" value={form.pais} onChange={handleChange} list="sugestoes-pais" className={inputClass} />
              <datalist id="sugestoes-pais">
                {SUGESTOES_PAIS.map((p) => <option key={p} value={p} />)}
              </datalist>
            </Campo>
            <Campo label="Estilo / tipo" htmlFor="estilo">
              <input id="estilo" name="estilo" value={form.estilo} onChange={handleChange} list="sugestoes-estilo" className={inputClass} />
              <datalist id="sugestoes-estilo">
                {SUGESTOES_ESTILO.map((s) => <option key={s} value={s} />)}
              </datalist>
            </Campo>
          </div>
        </Secao>

        <Secao titulo="Peso e dimensões" descricao="Da embalagem já pronta para envio. Afeta direto o valor do frete calculado.">
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
            <Campo label="Peso (kg)" htmlFor="peso_kg">
              <input id="peso_kg" required type="number" step="0.01" min="0.01" name="peso_kg" value={form.peso_kg} onChange={handleChange} className={inputClass} />
            </Campo>
            <Campo label="Altura (cm)" htmlFor="altura_cm">
              <input id="altura_cm" required type="number" step="1" min="2" name="altura_cm" value={form.altura_cm} onChange={handleChange} className={inputClass} />
            </Campo>
            <Campo label="Largura (cm)" htmlFor="largura_cm">
              <input id="largura_cm" required type="number" step="1" min="2" name="largura_cm" value={form.largura_cm} onChange={handleChange} className={inputClass} />
            </Campo>
            <Campo label="Comprimento (cm)" htmlFor="comprimento_cm">
              <input id="comprimento_cm" required type="number" step="1" min="2" name="comprimento_cm" value={form.comprimento_cm} onChange={handleChange} className={inputClass} />
            </Campo>
          </div>
        </Secao>
      </div>

      <div className="flex flex-col gap-6 xl:sticky xl:top-8">
        <Secao titulo="Fotos" descricao="A primeira foto é a capa. Fotos em pé (formato de garrafa) ficam melhores.">
          <div className="grid grid-cols-3 gap-3">
            {form.imagens.map((img, i) => (
              <div key={img} className="group relative aspect-[4/5] overflow-hidden rounded-lg border border-cardBorder bg-sand">
                <Image src={img} alt={`Foto ${i + 1}`} fill sizes="140px" className="object-cover" />
                {i === 0 && (
                  <span className="absolute left-1.5 top-1.5 rounded-full bg-primary/90 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-gold">
                    Capa
                  </span>
                )}
                <div className="absolute inset-x-0 bottom-0 flex justify-between gap-1 bg-gradient-to-t from-primary/80 to-transparent p-1.5 opacity-100 md:opacity-0 md:transition-opacity md:group-hover:opacity-100">
                  {i !== 0 ? (
                    <button type="button" onClick={() => makeCover(img)} className="rounded bg-cream/90 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                      Tornar capa
                    </button>
                  ) : (
                    <span />
                  )}
                  <button
                    type="button"
                    onClick={() => removeImage(img)}
                    aria-label="Remover foto"
                    className="flex h-6 w-6 items-center justify-center rounded bg-cream/90 text-xs text-terracotta"
                  >
                    <FontAwesomeIcon icon={faTrashCan} />
                  </button>
                </div>
              </div>
            ))}
            <label className="flex aspect-[4/5] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-primary/30 text-primary/55 transition-colors hover:border-gold hover:text-terracotta">
              <FontAwesomeIcon icon={uploading ? faSpinner : faUpload} className={uploading ? "animate-spin" : ""} />
              <span className="text-[11px]">{uploading ? "Enviando..." : "Adicionar fotos"}</span>
              <input type="file" accept="image/*" multiple onChange={handleUpload} disabled={uploading} className="hidden" />
            </label>
          </div>
        </Secao>

        <Secao titulo="Visibilidade">
          <label className="flex cursor-pointer items-start gap-3 text-sm text-primary">
            <input
              type="checkbox" name="ativo" checked={form.ativo} onChange={handleChange}
              className="mt-0.5 h-4 w-4 accent-[#5A2A14]"
            />
            <span>
              <span className="block font-medium">Produto ativo</span>
              <span className="text-primary/55">Quando desmarcado, ele some da loja, mas continua no histórico dos pedidos.</span>
            </span>
          </label>
        </Secao>

        {error && <p className="rounded-xl bg-gold/20 p-3.5 text-sm text-terracotta">{error}</p>}

        <div className="flex items-center gap-3">
          <button type="submit" disabled={saving || uploading} className="btn-primary flex-1 justify-center !py-4 disabled:opacity-60">
            {saving ? "Salvando..." : submitLabel}
          </button>
          <Link href="/admin/produtos" className="btn-outline !py-4">Cancelar</Link>
        </div>
      </div>
    </form>
  );
}
