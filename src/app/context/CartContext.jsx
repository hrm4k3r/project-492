"use client";
import { createContext, useContext, useEffect, useState } from "react";

const CartContext = createContext(null);
const STORAGE_KEY = "fazenda-cart";

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setItems(JSON.parse(stored));
    } catch {
      // localStorage indisponível (modo privado, etc.) — segue com carrinho vazio
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // ignora falha de escrita no localStorage
    }
  }, [items, loaded]);

  const addItem = (produto, quantidade = 1) => {
    setItems((current) => {
      const existing = current.find((i) => i.id === produto.id);
      if (existing) {
        return current.map((i) =>
          i.id === produto.id ? { ...i, quantidade: i.quantidade + quantidade } : i
        );
      }
      return [
        ...current,
        {
          id: produto.id,
          titulo: produto.produto,
          preco: Number(produto.valor),
          foto: produto.imagens?.[0],
          quantidade,
        },
      ];
    });
  };

  const removeItem = (id) => setItems((current) => current.filter((i) => i.id !== id));

  const updateQuantity = (id, quantidade) => {
    if (quantidade <= 0) {
      removeItem(id);
      return;
    }
    setItems((current) => current.map((i) => (i.id === id ? { ...i, quantidade } : i)));
  };

  const clearCart = () => setItems([]);

  const subtotal = items.reduce((sum, i) => sum + i.preco * i.quantidade, 0);
  const totalItens = items.reduce((sum, i) => sum + i.quantidade, 0);

  return (
    <CartContext.Provider
      value={{ items, addItem, removeItem, updateQuantity, clearCart, subtotal, totalItens, loaded }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart deve ser usado dentro de <CartProvider>");
  return ctx;
}
