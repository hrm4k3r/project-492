export default function PaginaTexto({ eyebrow = "Institucional", titulo, atualizacao, children }) {
  return (
    <div className="bg-light">
      <section className="relative overflow-hidden bg-brand text-cream">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(201,163,106,0.2),transparent_65%)]" />
        <div className="container-page relative py-12 text-center md:py-16">
          <span className="eyebrow text-gold">{eyebrow}</span>
          <h1 className="mx-auto mt-4 max-w-3xl font-display text-4xl font-medium leading-[1.1] md:text-6xl">
            {titulo}
          </h1>
        </div>
      </section>

      <div className="container-page py-14 md:py-20">
        <article className="prose-policy mx-auto max-w-3xl">{children}</article>
        {atualizacao && (
          <p className="mx-auto mt-14 max-w-3xl border-t border-cardBorder pt-5 text-sm text-primary/50">
            Última atualização: {atualizacao}.
          </p>
        )}
      </div>
    </div>
  );
}
