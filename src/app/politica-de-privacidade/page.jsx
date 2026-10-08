import Link from "next/link";
import PaginaTexto from "../components/PaginaTexto";
import { LOJA, whatsappLink } from "../../lib/loja";

export const metadata = {
  title: "Política de Privacidade | Curadoria da Mesa",
  description: "Como a Curadoria da Mesa coleta, usa e protege os seus dados pessoais.",
};

export default function PoliticaDePrivacidade() {
  return (
    <PaginaTexto titulo="Política de Privacidade" atualizacao="outubro de 2026">
      <p>
        Esta Política explica como a {LOJA.nome} (CNPJ {LOJA.cnpj}, com
        endereço em {LOJA.endereco}) trata os dados pessoais de quem visita este
        site e de quem compra conosco, em conformidade com a Lei Geral de
        Proteção de Dados (Lei nº 13.709/2018, a LGPD).
      </p>

      <h2>1. Quais dados coletamos e para quê</h2>

      <h3>Cadastro</h3>
      <p>
        Nome, telefone, e-mail e senha. Usamos esses dados para criar e
        manter a sua conta, identificar você nos pedidos e entrar em contato
        sobre eles. A senha é guardada de forma protegida pelo serviço de
        autenticação e não é visível para nós.
      </p>

      <h3>Endereço de entrega</h3>
      <p>
        CEP, rua, número, complemento, bairro, cidade e estado. Usamos para
        calcular o frete e entregar o seu pedido.
      </p>

      <h3>Pedidos e pagamento</h3>
      <p>
        Produtos comprados, valores, forma de entrega, status do pedido e as
        informações do Pix gerado para o pagamento. O pagamento é feito no
        aplicativo do seu banco: <strong>não coletamos nem armazenamos dados de
        cartão ou de conta bancária</strong>.
      </p>

      <h3>Atendimento</h3>
      <p>
        Quando você fala com a gente pelo WhatsApp ou pelo Fale Conosco, usamos
        as informações que você nos envia (nome, contato e mensagem) para
        responder e resolver a sua solicitação.
      </p>

      <h3>Navegação</h3>
      <p>
        Este site guarda no seu navegador algumas informações necessárias para
        funcionar, como o conteúdo do carrinho, a sua confirmação de
        maioridade e a sessão de login. Veja mais no item 5.
      </p>

      <h2>2. Em que situações usamos seus dados</h2>
      <ul>
        <li>para executar a compra e entregar o pedido que você solicitou;</li>
        <li>para cumprir obrigações legais, fiscais e regulatórias;</li>
        <li>para prevenir fraudes e garantir a segurança do site;</li>
        <li>
          para enviar comunicações sobre novidades e promoções, somente se você
          autorizar, e você pode pedir para parar a qualquer momento.
        </li>
      </ul>

      <h2>3. Com quem compartilhamos</h2>
      <p>Não vendemos os seus dados. Compartilhamos somente o necessário com:</p>
      <ul>
        <li>
          <strong>Provedores de infraestrutura</strong> (hospedagem do site e
          banco de dados), que armazenam as informações para o site funcionar;
        </li>
        <li>
          <strong>Serviços de frete e transportadoras</strong>, que recebem nome,
          endereço, CEP e telefone para calcular e realizar a entrega;
        </li>
        <li>
          <strong>Serviço de consulta de CEP</strong>, que recebe apenas o CEP
          digitado para preencher o endereço;
        </li>
        <li>
          <strong>Autoridades públicas</strong>, quando houver obrigação legal ou
          ordem judicial.
        </li>
      </ul>
      <p>
        Alguns desses provedores podem ter servidores fora do Brasil. Nesses
        casos, buscamos fornecedores que adotem proteção compatível com a
        legislação brasileira.
      </p>

      <h2>4. Seus direitos</h2>
      <p>Pela LGPD, você pode, a qualquer momento, solicitar:</p>
      <ul>
        <li>a confirmação de que tratamos seus dados e o acesso a eles;</li>
        <li>a correção de dados incompletos, inexatos ou desatualizados;</li>
        <li>a anonimização, o bloqueio ou a eliminação de dados desnecessários;</li>
        <li>a portabilidade dos dados;</li>
        <li>informações sobre com quem compartilhamos seus dados;</li>
        <li>a revogação de consentimentos que você tenha dado.</li>
      </ul>
      <p>
        Para segurança de todos, podemos pedir informações para confirmar a sua
        identidade. Alguns dados precisam ser mantidos por obrigação legal (por
        exemplo, registros de pedidos), e informaremos quando isso acontecer.
      </p>

      <h2>5. Cookies e armazenamento no navegador</h2>
      <p>Utilizamos apenas o que é necessário para o funcionamento da loja:</p>
      <ul>
        <li>a sessão de login, para você continuar conectado;</li>
        <li>o carrinho, para você não perder os produtos escolhidos;</li>
        <li>a confirmação de maioridade, para não perguntar a cada visita.</li>
      </ul>
      <p>
        Você pode apagar esses dados nas configurações do navegador, mas
        algumas funções do site podem deixar de funcionar.
      </p>

      <h2>6. Por quanto tempo guardamos</h2>
      <p>
        Mantemos seus dados enquanto a sua conta estiver ativa e pelo tempo
        necessário para cumprir obrigações legais, fiscais e de defesa de
        direitos. Depois disso, eles são eliminados ou anonimizados.
      </p>

      <h2>7. Segurança</h2>
      <p>
        Adotamos medidas técnicas e organizacionais para proteger seus dados,
        como conexão segura (HTTPS) e controle de acesso restrito às
        informações dos pedidos. Nenhum sistema é totalmente imune a falhas,
        então também pedimos que você cuide da sua senha e não a compartilhe.
      </p>

      <h2>8. Público maior de idade</h2>
      <p>
        Este site vende bebidas alcoólicas e é destinado exclusivamente a
        maiores de 18 anos. Não coletamos intencionalmente dados de menores.
      </p>

      <h2>9. Fale com a gente sobre privacidade</h2>
      <p>
        Para exercer seus direitos ou tirar dúvidas sobre esta Política, fale
        com a gente pelo{" "}
        <Link href={whatsappLink("Olá! Tenho uma dúvida sobre privacidade e meus dados.")} target="_blank">WhatsApp</Link>{" "}
        ou pela página <Link href="/fale-conosco">Fale Conosco</Link>.
      </p>

      <h2>10. Alterações nesta Política</h2>
      <p>
        Podemos atualizar esta Política para refletir melhorias no site ou
        mudanças na lei. A data da última atualização fica sempre indicada ao
        final desta página.
      </p>
    </PaginaTexto>
  );
}
