"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "../../../../config/supabase";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faPen, faTrash } from "@fortawesome/free-solid-svg-icons";

export default function AdminProdutos() {
  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadProdutos = async () => {
    const { data } = await supabase.from("produtos").select("*").order("created_at", { ascending: false });
    setProdutos(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    loadProdutos();
  }, []);

  const handleDelete = async (id) => {
    if (!confirm("Remover este produto? Essa ação não pode ser desfeita.")) return;
    const { error } = await supabase.from("produtos").delete().eq("id", id);
    if (error) {
      if (error.code === "23503") {
        alert(
          "Esse produto já foi comprado por algum cliente, então não pode ser excluído (isso apagaria o histórico dos pedidos). Use o botão de status para deixá-lo como Inativo — ele some da loja, mas o histórico continua intacto."
        );
      } else {
        alert("Não foi possível remover o produto: " + error.message);
      }
      return;
    }
    loadProdutos();
  };

  const toggleAtivo = async (produto) => {
    await supabase.from("produtos").update({ ativo: !produto.ativo }).eq("id", produto.id);
    loadProdutos();
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="section-title">Produtos</h1>
        <Link href="/admin/produtos/novo" className="btn-primary text-sm">
          <FontAwesomeIcon icon={faPlus} />
          Novo produto
        </Link>
      </div>

      {loading ? (
        <p className="mt-8 text-primary/60">Carregando...</p>
      ) : produtos.length === 0 ? (
        <p className="mt-8 text-primary/60">Nenhum produto cadastrado ainda.</p>
      ) : (
        <div className="mt-8 overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left">
            <thead>
              <tr className="border-b border-cardBorder text-xs uppercase tracking-wide text-primary/50">
                <th className="py-2">Foto</th>
                <th className="py-2">Produto</th>
                <th className="py-2">Preço</th>
                <th className="py-2">Status</th>
                <th className="py-2">Ações</th>
              </tr>
            </thead>
            <tbody>
              {produtos.map((p) => (
                <tr key={p.id} className="border-b border-cardBorder/60">
                  <td className="py-3">
                    <div className="relative h-12 w-12 overflow-hidden rounded-lg bg-cream">
                      {p.imagens?.[0] && (
                        <Image src={p.imagens[0]} alt={p.produto} fill sizes="48px" className="object-cover" />
                      )}
                    </div>
                  </td>
                  <td className="py-3 font-medium text-primary">{p.produto}</td>
                  <td className="py-3 text-terracotta">
                    {Number(p.valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </td>
                  <td className="py-3">
                    <button
                      onClick={() => toggleAtivo(p)}
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        p.ativo ? "bg-olive/20 text-olive" : "bg-primary/10 text-primary/50"
                      }`}
                    >
                      {p.ativo ? "Ativo" : "Inativo"}
                    </button>
                  </td>
                  <td className="py-3">
                    <div className="flex items-center gap-3">
                      <Link href={`/admin/produtos/${p.id}`} className="text-primary/60 hover:text-terracotta">
                        <FontAwesomeIcon icon={faPen} />
                      </Link>
                      <button onClick={() => handleDelete(p.id)} className="text-primary/60 hover:text-terracotta">
                        <FontAwesomeIcon icon={faTrash} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
