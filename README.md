# Copinha 13 Loucos

Site de inscrições da Copinha de futsal de base, com Vite e Supabase. A página usa o logotipo dourado enviado para o campeonato. O código está pronto para ser importado como um projeto Vite na Vercel.

## Fluxos

- **Representante adulto** · Entra com Google ou como visitante. Preenche o nome da equipe, seu nome, WhatsApp com DDD e a relação de atletas, com nome completo e ano de nascimento. Cada acesso tem uma inscrição. O representante pode adicionar e remover atletas, salvar a relação até o prazo e consultar a situação depois do encerramento.
- **Visitante** · O Supabase cria uma sessão anônima no navegador. O botão **Vincular Google** preserva a inscrição ao conectar uma conta Google que ainda esteja livre no projeto. Se o visitante sair ou apagar os dados do navegador antes de vincular a conta, perde o acesso a essa sessão.
- **Organização** · O administrador master define o prazo, consulta os elencos e contatos, filtra equipes e marca **Confirmada**, **Pendente de envio de autorizações** ou **Inapta**. O painel sinaliza nomes e anos iguais em equipes diferentes para conferência de possíveis homônimos.
- **Autorizações** · A entrega é feita fora do site. Uma inscrição nova começa como pendente. Se uma equipe confirmada mudar o elenco ou o nome da equipe, a inscrição volta a pendente para nova conferência. Alterar só o contato do representante preserva o status.

São aceitos de 5 a 15 atletas por equipe, dos anos de 2011 a 2014, com até dois de 2011. A data inicial é **10/12/2026 às 23h59**, no horário de Brasília. O prazo é conferido pelo banco em cada gravação. Elencos e contatos ficam acessíveis apenas ao titular da inscrição e à organização.

## Configurar o Supabase

1. Crie um projeto e execute o arquivo `supabase/migrations/20261124000000_inscricoes.sql` inteiro no **SQL Editor**. Ele instala as tabelas, as permissões e as funções de gravação. Execute a migração uma vez em cada ambiente.
2. Em **Authentication**, habilite a entrada anônima e a vinculação manual de identidades. Habilite também o provedor **Google**.
3. No Google Cloud, configure a tela de consentimento e crie um cliente OAuth do tipo **Aplicativo da Web**. Em URI de redirecionamento autorizada, coloque o **Callback URL** apresentado pelo provedor Google no painel do Supabase. Guarde o Client ID e Client Secret na configuração do provedor do Supabase.
4. Em **Authentication → URL Configuration**, coloque a URL de produção da Vercel como **Site URL** e inclua a mesma URL com a barra final em **Redirect URLs**. Para testes locais, adicione também `http://localhost:5173/`. Use os endereços dos ambientes que realmente serão usados. Se o app OAuth do Google estiver em modo de teste, adicione as contas que vão testar ou publique o app OAuth antes das inscrições.
5. A entrada de visitantes aceita Cloudflare Turnstile. Para ativá-lo, crie um widget para o domínio, configure sua chave secreta em **Authentication → Bot and Abuse Protection** do Supabase e coloque a chave pública do widget em `VITE_TURNSTILE_SITE_KEY`. Mantenha as duas configurações sincronizadas.

[Login com Google](https://supabase.com/docs/guides/auth/social-sign-in/auth-google) · [Entrada anônima](https://supabase.com/docs/guides/auth/auth-anonymous) · [URLs de redirecionamento](https://supabase.com/docs/guides/auth/redirect-urls) · [Turnstile](https://supabase.com/docs/guides/auth/auth-captcha)

## Publicar na Vercel

1. Extraia o ZIP e envie o conteúdo da pasta do projeto para um repositório. Importe esse repositório na Vercel, com a raiz apontando para a pasta que contém o `package.json`. O projeto já define **Vite**, `npm run build` e saída em `dist`.
2. Nas variáveis de ambiente do projeto, adicione `VITE_SUPABASE_URL` com a URL do projeto e `VITE_SUPABASE_PUBLISHABLE_KEY` com a chave pública `sb_publishable_…` do Supabase. Use apenas chaves públicas em variáveis `VITE_`. Se usar Turnstile, adicione a chave pública do widget.
3. Faça o deploy e confirme as URLs em **Authentication → URL Configuration** no Supabase. Se alterar as variáveis na Vercel, inicie um novo deploy.

[Vite na Vercel](https://vercel.com/docs/frameworks/frontend/vite) · [Variáveis de ambiente](https://vercel.com/docs/environment-variables/managing-environment-variables)

## Liberar o administrador master

Primeiro entre com sua conta Google no site. Em seguida, abra **Authentication → Users** no Supabase, confirme o e-mail da conta e copie seu **User UID**. No SQL Editor, substitua o valor de exemplo pelo UID copiado.

```sql
insert into copinha_private.organizers (user_id)
values ('COLE-AQUI-O-USER-UID') on conflict do nothing;
```

Reabra a **Área da organização**. O acesso é conferido pelo UID no banco e exige uma sessão identificada. Para revogar, remova apenas o UID dessa tabela privada.

## Rodar localmente

Requer Node.js 22.12 ou superior. Para testar com o Supabase, copie `.env.example` para `.env.local` e preencha as chaves públicas. Sem elas, o site roda como uma prévia com dados fictícios e memória temporária.

```sh
npm ci
npm run dev
npm run build
```

## Atualizar uma instalação que já está no ar

1. No Supabase existente, execute **somente** `supabase/migrations/20261124010000_logos_e_pagina_publica.sql` no **SQL Editor**, uma vez. O script inicial de inscrições já aplicado deve permanecer no histórico. Para uma instalação nova, execute os dois arquivos em ordem.
2. Atualize o mesmo repositório conectado à Vercel, incluindo `src`, os arquivos de `public` e a migração. O push na branch de produção deve iniciar o deploy. A atualização usa as mesmas variáveis de ambiente e o mesmo projeto do Supabase.
3. Entre como master e salve o número que deseja publicar em **Área da organização → Contato público**. A seção Sobre já identifica Felipe Ferreira. O botão do WhatsApp só aparece quando você salva um contato oficial.
4. Abra **Área da organização → Patrocinadores** para adicionar ou remover marcas. A migração já inclui a Adega 13 Alta. O rodapé alterna automaticamente quando há duas ou mais marcas. Os controles permitem pausar e navegar.
5. Verifique na página pública se apenas as equipes confirmadas estão aparecendo e se o PDF abre ou baixa.

A logo da equipe é opcional. O formulário aceita **PNG, JPG e JPEG de até 5 MB**, confere o arquivo e reprocessa a imagem para até 320 px. O servidor limita o dado gravado a 512 KB, verifica formato e aplica as mesmas permissões e o mesmo prazo da inscrição. Alterar ou remover a logo de uma equipe confirmada faz a inscrição voltar a pendente para a organização aprovar o material público. A lista pública entrega apenas o nome e a logo das equipes confirmadas.

A seção **Sobre** resume o regulamento anexado e disponibiliza o PDF original, identificado como minuta.
