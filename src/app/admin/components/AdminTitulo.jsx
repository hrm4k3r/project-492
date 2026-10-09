export default function AdminTitulo({ titulo, descricao, children }) {
  return (
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <h1 className="font-display text-4xl font-medium leading-tight text-primary md:text-5xl">{titulo}</h1>
        {descricao && <p className="mt-2 max-w-xl text-primary/60">{descricao}</p>}
      </div>
      {children && <div className="flex items-center gap-3">{children}</div>}
    </div>
  );
}
