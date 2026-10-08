"use client";
import { useState } from "react";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faLocationDot,
  faClock,
  faPaperPlane,
} from "@fortawesome/free-solid-svg-icons";
import { faWhatsapp, faInstagram, faFacebook } from "@fortawesome/free-brands-svg-icons";

export default function FaleConosco() {
  const [form, setForm] = useState({ nome: "", email: "", telefone: "", mensagem: "" });

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = (e) => {
    e.preventDefault();
    const texto = `Olá! Meu nome é ${form.nome}.%0A${form.mensagem}%0A%0AContato: ${form.telefone || form.email}`;
    window.open(`https://wa.me/5535998647172?text=${texto}`, "_blank");
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
                href="https://wa.me/+553598647172"
                target="_blank"
                className="mt-4 flex items-center gap-3 text-primary/80 transition-colors duration-300 hover:text-terracotta"
              >
                <FontAwesomeIcon icon={faWhatsapp} className="text-xl text-olive" />
                +55 (35) 99864-7172
              </Link>
              <p className="mt-4 flex items-start gap-3 text-primary/80">
                <FontAwesomeIcon icon={faLocationDot} className="mt-1 text-terracotta" />
                Estrada Alagoa&ndash;Itamonte, KM 2, Bairro Prateado
              </p>
              <p className="mt-4 flex items-start gap-3 text-primary/80">
                <FontAwesomeIcon icon={faClock} className="mt-1 text-terracotta" />
                Segunda a sexta, das 8h às 18h
              </p>
            </div>
            <div className="card-surface flex items-center gap-5 p-6">
              <Link href="https://www.instagram.com/queijofazendasantoantonio/" target="_blank" className="text-2xl text-primary transition-colors duration-300 hover:text-terracotta">
                <FontAwesomeIcon icon={faInstagram} />
              </Link>
              <Link href="https://www.facebook.com/queijofazendasantoantonio" target="_blank" className="text-2xl text-primary transition-colors duration-300 hover:text-terracotta">
                <FontAwesomeIcon icon={faFacebook} />
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
