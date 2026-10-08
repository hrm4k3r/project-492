"use client";
import { useState } from "react";
import { supabase } from "../../../config/supabase";

export default function AddressForm({ profileId, onSaved }) {
  const [form, setForm] = useState({
    cep: "", street: "", number: "", complement: "", neighborhood: "", city: "", state: "",
  });
  const [saving, setSaving] = useState(false);
  const [buscandoCep, setBuscandoCep] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleCepBlur = async () => {
    const cepLimpo = form.cep.replace(/\D/g, "");
    if (cepLimpo.length !== 8) return;
    setBuscandoCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setForm((f) => ({
          ...f,
          street: data.logradouro || f.street,
          neighborhood: data.bairro || f.neighborhood,
          city: data.localidade || f.city,
          state: data.uf || f.state,
        }));
      }
    } catch {
      // se a busca falhar, o usuário preenche manualmente
    }
    setBuscandoCep(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const { data, error } = await supabase
      .from("addresses")
      .insert({ ...form, profile_id: profileId })
      .select()
      .single();
    setSaving(false);
    if (!error) onSaved(data);
  };

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3 md:grid-cols-3">
      <input
        required name="cep" placeholder="CEP" value={form.cep}
        onChange={handleChange} onBlur={handleCepBlur}
        className="rounded-lg border border-cardBorder bg-cream px-3 py-2 text-sm outline-none focus:border-gold"
      />
      {buscandoCep && <span className="col-span-2 self-center text-xs text-primary/50">Buscando endereço...</span>}
      <input required name="street" placeholder="Rua" value={form.street} onChange={handleChange} className="col-span-2 rounded-lg border border-cardBorder bg-cream px-3 py-2 text-sm outline-none focus:border-gold" />
      <input required name="number" placeholder="Número" value={form.number} onChange={handleChange} className="rounded-lg border border-cardBorder bg-cream px-3 py-2 text-sm outline-none focus:border-gold" />
      <input name="complement" placeholder="Complemento" value={form.complement} onChange={handleChange} className="rounded-lg border border-cardBorder bg-cream px-3 py-2 text-sm outline-none focus:border-gold" />
      <input required name="neighborhood" placeholder="Bairro" value={form.neighborhood} onChange={handleChange} className="rounded-lg border border-cardBorder bg-cream px-3 py-2 text-sm outline-none focus:border-gold" />
      <input required name="city" placeholder="Cidade" value={form.city} onChange={handleChange} className="rounded-lg border border-cardBorder bg-cream px-3 py-2 text-sm outline-none focus:border-gold" />
      <input required name="state" placeholder="UF" maxLength={2} value={form.state} onChange={handleChange} className="rounded-lg border border-cardBorder bg-cream px-3 py-2 text-sm uppercase outline-none focus:border-gold" />
      <button type="submit" disabled={saving} className="btn-outline col-span-2 justify-center py-2 text-sm md:col-span-1">
        {saving ? "Salvando..." : "Salvar endereço"}
      </button>
    </form>
  );
}
