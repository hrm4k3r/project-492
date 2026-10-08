import Link from "next/link";
import PaginaTexto from "../components/PaginaTexto";
import { LOJA, whatsappLink } from "../../lib/loja";

export const metadata = {
  title: "Trocas e Devoluções | Curadoria da Mesa",
  description: "Como funcionam cancelamentos, arrependimento, trocas e devoluções na Curadoria da Mesa.",
};

export default function PoliticaDeTrocaDevolucao() {
  return (
    <PaginaTexto titulo="Política de Trocas e Devoluções" atualizacao="outubro de 2026">
      <p>
        Na {LOJA.nome}, cada produto é escolhido com cuidado. Se algo não sair
        como o esperado, queremos resolver com você de forma simples e rápida.
        Veja abaixo como funcionam cancelamentos, arrependimento, trocas e
        devoluções.
      </p>

      <h2>Cancelamento antes do envio</h2>
      <p>
        Você pode cancelar o pedido enquanto ele ainda não tiver sido
        despachado, com reembolso integral do valor pago. Para isso, fale com a
        gente o quanto antes pelo{" "}
        <Link href={whatsappLink("Olá! Gostaria de cancelar um pedido.")} target="_blank">WhatsApp</Link>{" "}
        ou pelo <Link href="/fale-conosco">Fale Conosco</Link>, informando o
        número do pedido.
      </p>
      <p>
        Antes de finalizar a compra, confira os produtos, as quantidades, o
        valor do frete e o endereço de entrega. Em caso de dúvida, chame a
        curadoria: ficaremos felizes em ajudar.
      </p>

      <h2>Direito de arrependimento</h2>
      <p>
        Em compras feitas pelo site, você pode desistir do pedido em até{" "}
        <strong>7 (sete) dias corridos</strong> a contar da data de recebimento,
        conforme o Código de Defesa do Consumidor.
      </p>
      <p>Para a devolução, o produto deve estar:</p>
      <ul>
        <li>lacrado e sem sinais de uso ou consumo;</li>
        <li>na embalagem original, sem violação do lacre;</li>
        <li>acompanhado da nota fiscal, quando houver.</li>
      </ul>

      <h2>Produto com problema</h2>
      <p>
        Se o produto chegar com avaria, vazamento, diferente do que você pediu
        ou em quantidade diferente, avise a gente assim que perceber.
        Bebidas e alimentos têm prazo de validade e exigem cuidados de
        conservação, por isso quanto antes você avisar, mais rápido conseguimos
        resolver. O prazo legal para reclamar de vícios em produtos não
        duráveis é de 30 dias.
      </p>
      <p>Para agilizar, envie:</p>
      <ul>
        <li>o número do pedido;</li>
        <li>fotos da caixa e da embalagem de transporte;</li>
        <li>fotos do produto e do rótulo, mostrando o problema.</li>
      </ul>
      <p>
        Confirmado o problema, você poderá escolher entre a troca por outro
        produto ou o reembolso, sem custo para você.
      </p>

      <h2>Como o reembolso é feito</h2>
      <p>
        Como os pagamentos são feitos por Pix, o reembolso é feito por Pix, para
        a conta do mesmo titular que realizou o pagamento. Ele acontece depois
        que recebermos e conferirmos o produto devolvido (ou, no caso de
        cancelamento antes do envio, assim que o cancelamento for confirmado).
      </p>

      <h2>Entrega e maioridade</h2>
      <p>
        Nossos produtos incluem bebidas alcoólicas e a venda é proibida para
        menores de 18 anos. Na entrega, a pessoa que receber o pedido deve ser
        maior de idade. Como muitos produtos são de vidro, as embalagens são
        reforçadas, mas pedimos que confira o pedido no momento do recebimento.
      </p>

      <h2>Retirada na loja</h2>
      <p>
        Pedidos com retirada na loja ({LOJA.endereco}) seguem as mesmas regras
        de cancelamento, arrependimento e produto com problema. Confira o pedido
        no momento da retirada.
      </p>

      <h2>Precisa de ajuda?</h2>
      <p>
        Fale com a curadoria pelo{" "}
        <Link href={whatsappLink("Olá! Preciso de ajuda com um pedido.")} target="_blank">WhatsApp {LOJA.whatsappExibicao}</Link>{" "}
        ou pela página <Link href="/fale-conosco">Fale Conosco</Link>. Será um
        prazer atender você.
      </p>
    </PaginaTexto>
  );
}
