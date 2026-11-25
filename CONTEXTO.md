# Contexto do projeto — Copinha 13 Loucos

Site em português para inscrições e divulgação de um torneio gratuito de futsal de base em Itaquaquecetuba. A página inicial apresenta a competição, as equipes confirmadas, os patrocinadores, o contato da organização e um resumo da minuta do regulamento. O PDF está em [public/regulamento.pdf](public/regulamento.pdf).

## Arquitetura e mapa do código

O projeto usa JavaScript com módulos ES, HTML e CSS. O Vite empacota a aplicação, o Supabase fornece autenticação e PostgreSQL, e a Vercel serve o build estático. O navegador chama o Supabase diretamente pela biblioteca `@supabase/supabase-js`.

| Arquivo | Responsabilidade |
| --- | --- |
| [index.html](index.html) | Documento inicial e ponto de montagem da aplicação. |
| [src/main.js](src/main.js) | Estado da interface, navegação, eventos, sessão, rascunho, formulários e atualização dos dados públicos. |
| [src/views.js](src/views.js) | Templates da página inicial, formulário da equipe e painel da organização. |
| [src/public-content.js](src/public-content.js) | Equipes confirmadas, seção Sobre, contatos e carrossel de patrocinadores. |
| [src/data.js](src/data.js) | Cliente Supabase com PKCE, consultas, chamadas RPC e dados de demonstração. |
| [src/format.js](src/format.js) | Formatação de telefone e prazo, escape de HTML e validação de rascunhos. |
| [src/logo.js](src/logo.js) | Validação e redimensionamento das imagens enviadas pelo navegador. |
| [src/style.css](src/style.css) e [src/icons.js](src/icons.js) | Estilos da interface e ícones. |
| [supabase/migrations/](supabase/migrations/) | Evolução do esquema, das permissões e das regras de gravação. |

## Fluxos e regras de negócio

- **Inscrição.** O representante adulto entra com Google ou como visitante. Cada UID tem uma inscrição com nome da equipe, nome e WhatsApp do representante, elenco e, opcionalmente, logo e perfis de Instagram da equipe e do representante. O visitante pode vincular uma conta Google disponível para preservar o acesso à inscrição. A sessão anônima depende dos dados do navegador até ser vinculada.
- **Rascunho.** O formulário guarda dados em `localStorage` sob a chave `copinha:registration-draft`. O rascunho contém dados pessoais do representante e dos atletas e tem prioridade sobre a inscrição carregada para preencher o formulário.
- **Elenco.** São aceitos de 5 a 15 atletas. O banco usa a lista configurável `tournament_settings.birth_years`, inicialmente de 2011 a 2014. O limite de dois nascidos em 2011 continua fixo quando esse ano é aceito. Nome normalizado e ano identificam duplicatas dentro da equipe. O painel sinaliza coincidências entre equipes para conferência.
- **Prazo e situação.** O prazo inicial é 10/12/2026 às 23h59min59s no horário de Brasília. O banco valida o prazo ao gravar. Após o encerramento, o representante pode consultar a inscrição. As situações são `pending`, `confirmed` e `ineligible`. A inscrição começa pendente, e mudanças no elenco, no nome da equipe ou na logo fazem uma confirmação voltar a pendente. As autorizações são entregues fora do site.
- **Organização.** O administrador master pode editar os dados e o elenco da equipe mesmo após o prazo, com a situação atual preservada. Também consulta contatos, filtra equipes, muda situações, define prazo e anos aceitos, edita contatos públicos e gerencia patrocinadores. O acesso depende de uma sessão identificada e de um UID cadastrado em `copinha_private.organizers`.
- **Visibilidade pública.** A RPC `confirmed_teams_with_roster` fornece identificador, nome e logo das equipes confirmadas e os nomes dos seus atletas. Clicar na equipe abre um modal com a lista rolável. Os anos de nascimento, os contatos e os registros completos da inscrição ficam restritos ao titular e à organização via políticas de RLS.
- **Imagens.** Para logos, o navegador aceita PNG/JPEG de até 2 MB e redimensiona para até 320 px. O banco valida o formato e limita o dado armazenado a 512 KB. A Adega 13 Alta é cadastrada pela migração inicial de patrocinadores e usa o arquivo em `public/sponsors/`.

## Banco e migrações

As tabelas principais são `registrations` (uma linha por titular, com elenco em JSONB), `tournament_settings` (registro único de ID 1) e `sponsors`. As gravações passam por RPCs. Inscrições e configurações usam `revision` para detectar edições concorrentes.

Em uma instalação nova, aplique os seis arquivos em ordem. Em um ambiente existente, confira quais já foram aplicados e execute as migrações pendentes na mesma ordem.

| Migração | Mudança |
| --- | --- |
| `20261124000000_inscricoes.sql` | Inscrições, configurações, administradores, RLS e RPCs iniciais. |
| `20261124010000_logos_e_pagina_publica.sql` | Logos, equipes confirmadas, contato público e patrocinadores. |
| `20261124020000_contatos_e_nome_atleta.sql` | Contatos adicionais e revisão da validação de nomes de atletas. |
| `20261124030000_rpc_logo_instagram.sql` | RPC de inscrição com logo e os dois perfis de Instagram. |
| `20261124040000_anos_nascimento.sql` | Anos de nascimento configuráveis e validação da inscrição pela lista vigente. |
| `20261125000000_edicao_admin_e_elencos_publicos.sql` | Edição administrativa, validação de elenco compartilhada e consulta pública dos nomes dos atletas. |

O formulário do representante chama `save_registration_with_instagram`, que passa por `save_registration_with_logo` e `save_registration`. O formulário da organização chama `admin_edit_registration`. Ambos usam a mesma validação de elenco no banco. Mudanças nas regras do elenco também devem considerar a validação em `src/format.js` e a exibição em `src/views.js`.

## Desenvolvimento e publicação

É necessário Node.js 22.12 ou superior. Os scripts do projeto são:

```sh
npm ci
npm run dev
npm run build
npm run preview
```

Sem as duas variáveis do Supabase, a aplicação abre em modo de demonstração com equipes fictícias e alterações em memória. O rascunho continua usando o armazenamento do navegador. Para usar o banco localmente, copie [.env.example](.env.example) para `.env.local` e preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`. A variável `VITE_TURNSTILE_SITE_KEY` é opcional e depende da configuração correspondente no Supabase. Variáveis `VITE_*` chegam ao navegador e devem conter apenas valores públicos.

No Supabase, configure o provedor Google, a entrada anônima, a vinculação manual de identidades e as URLs de redirecionamento dos ambientes usados. O [README.md](README.md) detalha a configuração de autenticação e o cadastro do master. A Vercel executa `npm run build`, publica `dist` e exige as duas variáveis do Supabase no build.

## Divergências encontradas

- A página inicial e a seção Sobre anunciam atletas de 2012 a 2015, com até dois de 2011. A configuração inicial da migração aceita 2011 a 2014. O formulário usa a lista configurada, enquanto esses textos públicos são fixos.
- O README descreve a instalação e a atualização com até duas migrações. O frontend atual depende também das migrações posteriores.
- A análise considera o código versionado. O estado do banco e da implantação em produção ainda precisa ser verificado no ambiente correspondente.
