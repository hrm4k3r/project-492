import Image from "next/image";

export default function AuthShell({ titulo, subtitulo, children, rodape }) {
  return (
    <div className="grid min-h-[75vh] bg-light lg:grid-cols-[1fr_1.1fr]">
      <div className="relative hidden flex-col items-center justify-center overflow-hidden bg-brand px-12 text-center text-cream lg:flex">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_30%,rgba(201,163,106,0.22),transparent_65%)]" />
        <div className="relative">
          <Image src="/logo-creme.png" width={749} height={497} alt="Curadoria da Mesa" className="mx-auto h-auto w-56" priority />
          <span className="filete my-8" />
          <p className="mx-auto max-w-xs font-display text-3xl font-medium italic leading-snug">
            Grandes momentos começam com boas escolhas.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-center px-5 py-14">
        <div className="w-full max-w-md">
          <Image src="/emblema-marrom.png" width={246} height={233} alt="" className="mx-auto h-12 w-auto lg:hidden" />
          <h1 className="mt-4 text-center font-display text-4xl font-medium text-primary lg:mt-0 lg:text-left lg:text-5xl">
            {titulo}
          </h1>
          <p className="mt-2 text-center text-primary/65 lg:text-left">{subtitulo}</p>
          <div className="mt-8">{children}</div>
          <p className="mt-8 text-center text-sm text-primary/60 lg:text-left">{rodape}</p>
        </div>
      </div>
    </div>
  );
}
