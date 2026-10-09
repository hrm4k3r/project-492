"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../../../config/supabase";
import ProductForm from "../../components/ProductForm";
import AdminTitulo from "../../components/AdminTitulo";

export default function EditarProduto() {
  const { id } = useParams();
  const router = useRouter();
  const [produto, setProduto] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from("produtos").select("*").eq("id", id).maybeSingle();
      setProduto(data);
      setLoading(false);
    }
    load();
  }, [id]);

  const handleSubmit = async (form) => {
    const { error } = await supabase.from("produtos").update(form).eq("id", id);
    if (!error) {
      router.push("/admin/produtos");
    } else {
      alert("Erro ao salvar produto: " + error.message);
    }
  };

  if (loading) return <p className="text-primary/60">Carregando...</p>;
  if (!produto) return <p className="text-primary/60">Produto não encontrado.</p>;

  return (
    <div>
      <AdminTitulo titulo="Editar produto" descricao={produto.produto} />
      <div className="mt-8">
        <ProductForm initialData={produto} onSubmit={handleSubmit} submitLabel="Salvar alterações" />
      </div>
    </div>
  );
}
