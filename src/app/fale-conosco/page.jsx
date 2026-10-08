"use client";
import { useState } from "react";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { LOJA, whatsappLink } from "../../lib/loja";
import {
  faLocationDot,
  faPaperPlane,
} from "@fortawesome/free-solid-svg-icons";
import { faWhatsapp, faInstagram } from "@fortawesome/free-brands-svg-icons";

export default function FaleConosco() {
  const [form, setForm] = useState({ nome: "", email: "", telefone: "", mensagem: "" });

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = (e) => {
    e.preventDefault();
    const texto = `Olá! Meu nome é ${form.nome}.
${form.mensagem}

Contato: ${form.telefone || form.email}`;
    window.open(whatsappLink(texto), "_blank");
  };

  return (
    <div className="bg-light py-16 md:py-20">
      <div className="container-page">
        <div className="flex flex-col items-center text-center">
          <span className="eyebrow">Estamos aqui para ajudar</span>
          <h1 className="section-title mt-2">Fale Conosco</h1>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-10 md:grid-cols-[1fr_1.3fr]">
          <div className="flex flex-col gap-6">
            <div className="card-surface p-6">
              <h2 className="font-display text-lg text-primary">Contato direto</h2>
              <Link
                href={whatsappLink()}
                target="_blank"
                className="mt-4 flex items-center gap-3 text-primary/80 transition-colors duration-300 hover:text-terracotta"
              >
                <FontAwesomeIcon icon={faWhatsapp} className="text-xl text-olive" />
                {LOJA.whatsappExibicao}
              </Link>
              <p className="mt-4 flex items-start gap-3 text-primary/80">
                <FontAwesomeIcon icon={faLocationDot} className="mt-1 text-terracotta" />
                {LOJA.endereco}
              </p>
            </div>
            <div className="card-surface flex items-center gap-5 p-6">
              <Link href={LOJA.instagram} target="_blank" className="text-2xl text-primary transition-colors duration-300 hover:text-terracotta">
                <FontAwesomeIcon icon={faInstagram} />
              </Link>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="card-surface flex flex-col gap-4 p-8">
            <div>
              <label className="text-sm font-medium text-primary">Nome</label>
              <input
                required
                name="nome"
                value={form.nome}
                onChange={handleChange}
                type="text"
                className="mt-1 w-full rounded-lg border border-cardBorder bg-cream px-4 py-2.5 text-primary outline-none focus:border-gold"
              />
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-primary">E-mail</label>
                <input
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  type="email"
                  className="mt-1 w-full rounded-lg border border-cardBorder bg-cream px-4 py-2.5 text-primary outline-none focus:border-gold"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-primary">Telefone</label>
                <input
                  name="telefone"
                  value={form.telefone}
                  onChange={handleChange}
                  type="tel"
                  className="mt-1 w-full rounded-lg border border-cardBorder bg-cream px-4 py-2.5 text-primary outline-none focus:border-gold"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-primary">Mensagem</label>
              <textarea
                required
                name="mensagem"
                value={form.mensagem}
                onChange={handleChange}
                rows={5}
                className="mt-1 w-full rounded-lg border border-cardBorder bg-cream px-4 py-2.5 text-primary outline-none focus:border-gold"
              />
            </div>
            <button type="submit" className="btn-primary mt-2 self-start">
              Enviar pelo WhatsApp
              <FontAwesomeIcon icon={faPaperPlane} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
