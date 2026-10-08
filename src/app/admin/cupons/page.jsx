"use client";
import { useEffect, useState } from "react";
import { supabase } from "../../../../config/supabase";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faTrash } from "@fortawesome/free-solid-svg-icons";

const emptyCoupon = { code: "", discount_type: "percent", discount_value: "", min_order_value: "" };

export default function AdminCupons() {
  const [cupons, setCupons] = useState([]);
  const [novo, setNovo] = useState(emptyCoupon);
  const [loading, setLoading] = useState(true);

  const loadCupons = async () => {
    const { data } = await supabase.from("coupons").select("*").order("created_at", { ascending: false });
    setCupons(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    loadCupons();
  }, []);

  const toggleAtivo = async (cupom) => {
    await supabase.from("coupons").update({ active: !cupom.active }).eq("id", cupom.id);
    loadCupons();
  };

  const deleteCupom = async (id) => {
    if (!confirm("Remover esse cupom?")) return;
    await supabase.from("coupons").delete().eq("id", id);
    loadCupons();
  };

  const addCupom = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from("coupons").insert({
      code: novo.code.toUpperCase(),
      discount_type: novo.discount_type,
      discount_value: Number(novo.discount_value),
      min_order_value: Number(novo.min_order_value) || 0,
    });
    if (error) {
      alert("Erro ao criar cupom: " + error.message);
      return;
    }
    setNovo(emptyCoupon);
    loadCupons();
  };

  return (
    <div>
      <h1 className="section-title">Cupons</h1>

      {loading ? (
        <p className="mt-8 text-primary/60">Carregando...</p>
      ) : (
        <div className="mt-8 flex flex-col gap-3">
          {cupons.map((cupom) => (
            <div key={cupom.id} className="card-surface flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <p className="font-display text-lg text-primary">{cupom.code}</p>
                <p className="text-sm text-primary/60">
                  {cupom.discount_type === "percent" ? `${cupom.discount_value}% de desconto` : `R$ ${cupom.discount_value} de desconto`}
                  {cupom.min_order_value > 0 && ` · pedido mínimo de R$ ${cupom.min_order_value}`}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => toggleAtivo(cupom)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${cupom.active ? "bg-olive/20 text-olive" : "bg-primary/10 text-primary/50"}`}
                >
                  {cupom.active ? "Ativo" : "Inativo"}
                </button>
                <button onClick={() => deleteCupom(cupom.id)} className="text-primary/50 hover:text-terracotta">
                  <FontAwesomeIcon icon={faTrash} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={addCupom} className="card-surface mt-6 flex flex-wrap items-end gap-3 p-4">
        <div>
          <label className="text-xs text-primary/60">Código</label>
          <input required value={novo.code} onChange={(e) => setNovo({ ...novo, code: e.target.value })} placeholder="BEMVINDO10" className="mt-1 w-40 rounded-lg border border-cardBorder px-3 py-2 text-sm uppercase outline-none focus:border-gold" />
        </div>
        <div>
          <label className="text-xs text-primary/60">Tipo</label>
          <select value={novo.discount_type} onChange={(e) => setNovo({ ...novo, discount_type: e.target.value })} className="mt-1 rounded-lg border border-cardBorder px-3 py-2 text-sm outline-none focus:border-gold">
            <option value="percent">Percentual (%)</option>
            <option value="fixed">Valor fixo (R$)</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-primary/60">Valor</label>
          <input required type="number" step="0.01" value={novo.discount_value} onChange={(e) => setNovo({ ...novo, discount_value: e.target.value })} className="mt-1 w-24 rounded-lg border border-cardBorder px-3 py-2 text-sm outline-none focus:border-gold" />
        </div>
        <div>
          <label className="text-xs text-primary/60">Pedido mínimo (R$)</label>
          <input type="number" step="0.01" value={novo.min_order_value} onChange={(e) => setNovo({ ...novo, min_order_value: e.target.value })} className="mt-1 w-28 rounded-lg border border-cardBorder px-3 py-2 text-sm outline-none focus:border-gold" />
        </div>
        <button type="submit" className="btn-outline text-sm">
          <FontAwesomeIcon icon={faPlus} />
          Criar cupom
        </button>
      </form>
    </div>
  );
}
