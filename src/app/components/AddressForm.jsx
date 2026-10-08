"use client";
import { useState } from "react";
import { supabase } from "../../../config/supabase";

const inputClass =
  "w-full rounded-lg border border-cardBorder bg-white px-3 py-2.5 text-sm outline-none transition-colors focus:border-gold";

export default function AddressForm({ profileId, onSaved }) {
  const [form, setForm] = useState({
    cep: "", street: "", number: "", complement: "", neighborhood: "", city: "", state: "",
  });
  const [saving, setSaving] = useState(false);
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [erro, setErro] = useState("");

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
    setErro("");
    setSaving(true);
    const { data, error } = await supabase
      .from("addresses")
      .insert({ ...form, state: form.state.toUpperCase(), profile_id: profileId })
      .select()
      .single();
    setSaving(false);
    if (error) {
      setErro("Não foi possível salvar o endereço. Confira os dados e tente novamente.");
      return;
    }
    onSaved(data);
  };

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3 md:grid-cols-3">
      <input
        required name="cep" placeholder="CEP" value={form.cep} inputMode="numeric" autoComplete="postal-code"
        onChange={handleChange} onBlur={handleCepBlur} className={inputClass}
      />
      <span className="col-span-1 self-center text-xs text-primary/50 md:col-span-2">
        {buscandoCep ? "Buscando endereço..." : "Preenchemos o restante pelo CEP"}
      </span>
      <input required name="street" placeholder="Rua" value={form.street} onChange={handleChange} className={`col-span-2 md:col-span-3 ${inputClass}`} />
      <input required name="number" placeholder="Número" value={form.number} onChange={handleChange} className={inputClass} />
      <input name="complement" placeholder="Complemento" value={form.complement} onChange={handleChange} className={`col-span-1 md:col-span-2 ${inputClass}`} />
      <input required name="neighborhood" placeholder="Bairro" value={form.neighborhood} onChange={handleChange} className={`col-span-2 md:col-span-1 ${inputClass}`} />
      <input required name="city" placeholder="Cidade" value={form.city} onChange={handleChange} className={inputClass} />
      <input required name="state" placeholder="UF" maxLength={2} value={form.state} onChange={handleChange} className={`uppercase ${inputClass}`} />
      {erro && <p className="col-span-2 text-sm text-terracotta md:col-span-3">{erro}</p>}
      <button type="submit" disabled={saving} className="btn-primary col-span-2 justify-center !py-3 text-xs md:col-span-3">
        {saving ? "Salvando..." : "Salvar endereço"}
      </button>
    </form>
  );
}
