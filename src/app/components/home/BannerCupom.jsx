import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTag } from "@fortawesome/free-solid-svg-icons";

export default function BannerCupom() {
  return (
    <div className="bg-gold/20 px-4 py-3.5">
      <p className="mx-auto max-w-4xl text-center text-sm text-primary">
        <FontAwesomeIcon icon={faTag} className="mr-2 text-terracotta" />
        Primeira compra com <strong>10% de desconto</strong> — use o cupom{" "}
        <Link
          href="/carrinho"
          className="inline-block rounded bg-terracotta px-2 py-0.5 font-mono text-xs font-semibold tracking-widest text-cream transition-opacity hover:opacity-80"
        >
          BEMVINDO
        </Link>{" "}
        no carrinho.
      </p>
    </div>
  );
}
