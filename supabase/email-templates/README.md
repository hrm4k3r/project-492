# E-mails do sistema (Supabase Auth)

O Supabase envia o e-mail de confirmar cadastro e o de redefinir senha. Sem SMTP próprio
ele usa um envio de teste muito limitado (poucos e-mails por hora, vai para spam).
Por isso configure o Resend como SMTP, depois que o domínio estiver verificado.

## 1. Verificar o domínio no Resend

No painel do Resend, em **Domains**, adicione `curadoriadamesa.com.br` e crie no DNS
do domínio os registros que ele mostrar (SPF, DKIM). Espere o status virar **Verified**.

## 2. SMTP no Supabase

Em **Supabase → Authentication → Settings → SMTP Settings**, ative **Enable Custom SMTP**:

- **Sender name:** `Curadoria da Mesa`
- **Sender email:** o mesmo endereço do `RESEND_FROM_EMAIL` (ex.: `contato@curadoriadamesa.com.br`),
  sempre de um domínio verificado no Resend
- **Host:** `smtp.resend.com`
- **Port:** `465` (SSL) ou `587` (TLS)
- **Username:** `resend`
- **Password:** a API Key gerada no painel do Resend (nunca cole em chat ou no repositório)

## 3. Templates de e-mail

Em **Supabase → Authentication → Email Templates**, cole o conteúdo de cada
arquivo no template correspondente (o assunto sugerido está no comentário
no topo de cada arquivo):

- `confirmar-cadastro.html` → template **Confirm signup**
- `redefinir-senha.html` → template **Reset Password**

Os templates usam `{{ .ConfirmationURL }}`, que o Supabase substitui
automaticamente pelo link real.

## 4. Conferir

Em **Authentication → URL Configuration**, o **Site URL** deve ser
`https://www.curadoriadamesa.com.br` (o link do e-mail leva para ele).
Depois cadastre uma conta de teste: o e-mail deve chegar em poucos segundos e
aparecer em **Emails** no painel do Resend.
