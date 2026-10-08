"use client";
import { useState } from "react";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLocationDot, faPaperPlane, faPlus } from "@fortawesome/free-solid-svg-icons";
import { faWhatsapp, faInstagram } from "@fortawesome/free-brands-svg-icons";
import { LOJA, whatsappLink, formatBRL } from "../../lib/loja";
import { useConfiguracoes } from "../../lib/useConfiguracoes";

const labelClass = "text-[11px] font-medium uppercase tracking-[0.18em] text-primary/60";
const inputClass =
  "mt-1.5 w-full rounded-lg border border-cardBorder bg-white px-4 py-3 text-primary outline-none transition-colors focus:border-gold";

export default function FaleConoscoConteudo() {
  const { freteGratisAcima, primeiraCompraPercent } = useConfiguracoes();
  const [form, setForm] = useState({ nome: "", email: "", telefone: "", mensagem: "" });

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = (e) => {
    e.preventDefault();
    const texto = `Olá! Meu nome é ${form.nome}.\n${form.mensagem}\n\nContato: ${form.telefone || form.email || "pelo WhatsApp"}`;
    window.open(whatsappLink(texto), "_blank");
  };

  const perguntas = [
    {
      p: "Como faço o pagamento?",
      r: "O pagamento é por Pix. Ao finalizar o pedido, mostramos um QR Code e o código copia e cola. Depois de pagar, envie o comprovante pelo WhatsApp para agilizar a confirmação.",
    },
    {
      p: "Como funciona a entrega?",
      r: `Entregamos para todo o Brasil. O frete é calculado pelo seu CEP direto no carrinho${
        freteGratisAcima > 0 ? `, e compras acima de ${formatBRL(freteGratisAcima)} têm frete grátis` : ""
      }.`,
    },
    {
      p: "Posso retirar o pedido na loja?",
      r: `Sim. Escolha "Retirar na loja" no carrinho, sem custo de frete. A loja fica em ${LOJA.endereco}. Combinamos o horário pelo WhatsApp depois da confirmação do pagamento.`,
    },
    primeiraCompraPercent > 0 && {
      p: "Tem desconto na primeira compra?",
      r: `Sim! Quem faz o primeiro pedido com a conta cadastrada ganha ${primeiraCompraPercent}% de desconto, aplicado automaticamente no carrinho.`,
    },
    {
      p: "Vocês vendem para menores de 18 anos?",
      r: "Não. A venda de bebidas alcoólicas é proibida para menores de 18 anos, e quem receber o pedido precisa ser maior de idade.",
    },
    {
      p: "Preciso trocar ou devolver um produto. E agora?",
      r: (
        <>
          Fale com a gente pelo WhatsApp com o número do pedido. Veja todos os detalhes na{" "}
          <Link href="/politica-de-troca-e-devolucao" className="font-medium text-terracotta underline">
            política de trocas e devoluções
          </Link>
          .
        </>
      ),
    },
  ].filter(Boolean);

  return (
    <div className="bg-light">
      <section className="relative overflow-hidden bg-brand text-cream">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(201,163,106,0.2),transparent_65%)]" />
        <div className="container-page relative py-12 text-center md:py-16">
          <span className="eyebrow text-gold">Estamos aqui para ajudar</span>
          <h1 className="mt-4 font-display text-4xl font-medium md:text-6xl">Atendimento</h1>
          <p className="mx-auto mt-4 max-w-xl text-cream/75">
            Dúvidas sobre um rótulo, um pedido ou uma harmonização? Fale com a curadoria.
          </p>
        </div>
      </section>

      <div className="container-page grid gap-10 py-14 md:grid-cols-[1fr_1.2fr] md:py-20">
        <div className="flex flex-col gap-6">
          <div className="card-surface p-6">
            <h2 className="font-display text-2xl font-semibold text-primary">Contato direto</h2>
            <Link
              href={whatsappLink("Olá! Gostaria de falar com a curadoria.")}
              target="_blank"
              className="btn-gold mt-5 w-full justify-center"
            >
              <FontAwesomeIcon icon={faWhatsapp} className="text-lg" />
              {LOJA.whatsappExibicao}
            </Link>
            <p className="mt-5 flex items-start gap-3 text-primary/75">
              <FontAwesomeIcon icon={faLocationDot} className="mt-1 text-terracotta" />
              {LOJA.endereco}
            </p>
            <Link
              href={LOJA.instagram}
              target="_blank"
              className="mt-4 flex items-center gap-3 text-primary/75 transition-colors hover:text-terracotta"
            >
              <FontAwesomeIcon icon={faInstagram} className="text-lg text-terracotta" />
              @cura.doriadamesa
            </Link>
          </div>

          <form onSubmit={handleSubmit} className="card-surface flex flex-col gap-5 p-6">
            <h2 className="font-display text-2xl font-semibold text-primary">Envie uma mensagem</h2>
            <div>
              <label htmlFor="nome" className={labelClass}>Nome</label>
              <input id="nome" required name="nome" value={form.nome} onChange={handleChange} type="text" className={inputClass} />
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="email" className={labelClass}>E-mail</label>
                <input id="email" name="email" value={form.email} onChange={handleChange} type="email" className={inputClass} />
              </div>
              <div>
                <label htmlFor="telefone" className={labelClass}>Telefone</label>
                <input id="telefone" name="telefone" value={form.telefone} onChange={handleChange} type="tel" className={inputClass} />
              </div>
            </div>
            <div>
              <label htmlFor="mensagem" className={labelClass}>Mensagem</label>
              <textarea id="mensagem" required name="mensagem" value={form.mensagem} onChange={handleChange} rows={4} className={inputClass} />
            </div>
            <button type="submit" className="btn-primary justify-center !py-4">
              Enviar pelo WhatsApp
              <FontAwesomeIcon icon={faPaperPlane} />
            </button>
            <p className="text-center text-xs text-primary/50">
              Ao enviar, abrimos o WhatsApp com a sua mensagem já escrita.
            </p>
          </form>
        </div>

        <div>
          <span className="eyebrow">Perguntas frequentes</span>
          <h2 className="mt-3 font-display text-4xl font-medium text-primary md:text-5xl">Tire suas dúvidas</h2>
          <div className="mt-8 divide-y divide-cardBorder border-y border-cardBorder">
            {perguntas.map((item) => (
              <details key={item.p} className="group py-1">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 font-display text-xl font-semibold text-primary [&::-webkit-details-marker]:hidden">
                  {item.p}
                  <FontAwesomeIcon
                    icon={faPlus}
                    className="shrink-0 text-sm text-terracotta transition-transform duration-300 group-open:rotate-45"
                  />
                </summary>
                <p className="pb-5 leading-relaxed text-primary/75">{item.r}</p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
