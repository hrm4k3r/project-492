"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../../../config/supabase";
import { formatBRL } from "../../../lib/loja";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faTrashCan } from "@fortawesome/free-solid-svg-icons";
import AdminTitulo from "../components/AdminTitulo";
import { cardClass, inputClass, labelClass } from "../ui";

const vazio = { code: "", discount_type: "percent", discount_value: "", min_order_value: "" };

export default function AdminCupons() {
  const [cupons, setCupons] = useState([]);
  const [novo, setNovo] = useState(vazio);
  const [loading, setLoading] = useState(true);
  const [criando, setCriando] = useState(false);

  const carregar = async () => {
    const { data } = await supabase.from("coupons").select("*").order("created_at", { ascending: false });
    setCupons(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    carregar();
  }, []);

  const alternarAtivo = async (cupom) => {
    const { error } = await supabase.from("coupons").update({ active: !cupom.active }).eq("id", cupom.id);
    if (error) {
      alert("Não foi possível alterar o cupom: " + error.message);
      return;
    }
    setCupons((lista) => lista.map((c) => (c.id === cupom.id ? { ...c, active: !c.active } : c)));
  };

  const remover = async (cupom) => {
    if (!confirm(`Remover o cupom ${cupom.code}?`)) return;
    const { error } = await supabase.from("coupons").delete().eq("id", cupom.id);
    if (error) {
      alert("Não foi possível remover o cupom: " + error.message);
      return;
    }
    carregar();
  };

  const criar = async (e) => {
    e.preventDefault();
    setCriando(true);
    const { error } = await supabase.from("coupons").insert({
      code: novo.code.trim().toUpperCase(),
      discount_type: novo.discount_type,
      discount_value: Number(novo.discount_value),
      min_order_value: Number(novo.min_order_value) || 0,
    });
    setCriando(false);
    if (error) {
      alert(
        error.code === "23505"
          ? "Já existe um cupom com esse código."
          : "Não foi possível criar o cupom: " + error.message
      );
      return;
    }
    setNovo(vazio);
    carregar();
  };

  return (
    <div>
      <AdminTitulo
        titulo="Cupons"
        descricao="Códigos de desconto que o cliente digita no carrinho."
      />

      <p className="mt-6 max-w-2xl rounded-xl bg-sand p-4 text-sm leading-relaxed text-primary/75">
        O desconto de <strong>primeira compra</strong> é automático e não precisa de cupom. Para ligar,
        desligar ou mudar o percentual, use{" "}
        <Link href="/admin/configuracoes" className="font-medium text-terracotta underline">Configurações</Link>.
      </p>

      <form onSubmit={criar} className={`${cardClass} mt-6 grid items-end gap-4 sm:grid-cols-2 xl:grid-cols-[1.2fr_1fr_0.8fr_1fr_auto]`}>
        <div>
          <label htmlFor="code" className={labelClass}>Código</label>
          <input
            id="code" required value={novo.code} onChange={(e) => setNovo({ ...novo, code: e.target.value })}
            placeholder="BEMVINDO10" className={`${inputClass} mt-1.5 uppercase placeholder:normal-case`}
          />
        </div>
        <div>
          <label htmlFor="tipo" className={labelClass}>Tipo</label>
          <select
            id="tipo" value={novo.discount_type} onChange={(e) => setNovo({ ...novo, discount_type: e.target.value })}
            className={`${inputClass} mt-1.5`}
          >
            <option value="percent">Percentual (%)</option>
            <option value="fixed">Valor fixo (R$)</option>
          </select>
        </div>
        <div>
          <label htmlFor="valor" className={labelClass}>Valor</label>
          <input
            id="valor" required type="number" step="0.01" min="0" value={novo.discount_value}
            onChange={(e) => setNovo({ ...novo, discount_value: e.target.value })} className={`${inputClass} mt-1.5`}
          />
        </div>
        <div>
          <label htmlFor="minimo" className={labelClass}>Pedido mínimo (R$)</label>
          <input
            id="minimo" type="number" step="0.01" min="0" value={novo.min_order_value}
            onChange={(e) => setNovo({ ...novo, min_order_value: e.target.value })} className={`${inputClass} mt-1.5`}
          />
        </div>
        <button type="submit" disabled={criando} className="btn-primary !py-3 text-xs disabled:opacity-60">
          <FontAwesomeIcon icon={faPlus} />
          Criar cupom
        </button>
      </form>

      {loading ? (
        <p className="mt-8 text-primary/60">Carregando...</p>
      ) : cupons.length === 0 ? (
        <p className="mt-8 text-primary/60">Nenhum cupom criado ainda.</p>
      ) : (
        <div className="mt-6 flex flex-col gap-3">
          {cupons.map((cupom) => (
            <div key={cupom.id} className={`${cardClass} flex flex-wrap items-center justify-between gap-4 !py-4`}>
              <div>
                <p className="font-display text-2xl font-semibold tracking-wide text-primary">{cupom.code}</p>
                <p className="text-sm text-primary/60">
                  {cupom.discount_type === "percent"
                    ? `${cupom.discount_value}% de desconto`
                    : `${formatBRL(cupom.discount_value)} de desconto`}
                  {Number(cupom.min_order_value) > 0 && ` · pedido mínimo de ${formatBRL(cupom.min_order_value)}`}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => alternarAtivo(cupom)}
                  title={cupom.active ? "Clique para desativar" : "Clique para ativar"}
                  className={`rounded-full px-3 py-1 text-[11px] font-medium uppercase tracking-wide ${
                    cupom.active ? "bg-olive/20 text-olive" : "bg-primary/10 text-primary/50"
                  }`}
                >
                  {cupom.active ? "Ativo" : "Inativo"}
                </button>
                <button
                  onClick={() => remover(cupom)}
                  aria-label={`Remover cupom ${cupom.code}`}
                  className="text-primary/45 transition-colors hover:text-terracotta"
                >
                  <FontAwesomeIcon icon={faTrashCan} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
