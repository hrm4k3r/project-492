# E-mails do sistema (Supabase Auth)

## Remetente a configurar (depois que o Resend verificar o domínio)

Em **Supabase → Authentication → Settings → SMTP Settings**:

- **Sender name:** `Queijo Fazenda Santo Antônio`
- **Sender email:** `naoresponda@queijofazendasantoantonio.com.br`
- **Host:** `smtp.resend.com`
- **Port:** `465` (SSL) ou `587` (TLS)
- **Username:** `resend`
- **Password:** a API Key gerada no painel do Resend

## Templates de e-mail

Em **Supabase → Authentication → Email Templates**, cole o conteúdo de cada
arquivo no template correspondente (o assunto sugerido está no comentário
no topo de cada arquivo):

- `confirmar-cadastro.html` → template **Confirm signup**
- `redefinir-senha.html` → template **Reset Password**

Os templates usam `{{ .ConfirmationURL }}`, que o Supabase substitui
automaticamente pelo link real.
