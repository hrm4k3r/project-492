"use client";
import { useRouter } from "next/navigation";
import { supabase } from "../../../../../config/supabase";
import ProductForm from "../../components/ProductForm";

export default function NovoProduto() {
  const router = useRouter();

  const handleSubmit = async (form) => {
    const { error } = await supabase.from("produtos").insert(form);
    if (!error) {
      router.push("/admin/produtos");
    } else {
      alert("Erro ao criar produto: " + error.message);
    }
  };

  return (
    <div>
      <h1 className="section-title">Novo produto</h1>
      <div className="mt-8">
        <ProductForm onSubmit={handleSubmit} submitLabel="Criar produto" />
      </div>
    </div>
  );
}
