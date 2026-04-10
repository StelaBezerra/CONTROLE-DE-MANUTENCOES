# Controle de Manutenções Terceirizadas com Supabase

Projeto em **Next.js** pronto para subir na **Vercel** com **Supabase integrado**.

## O que esta versão já entrega

- Supabase integrado para:
  - lojas
  - chamados
  - checklist por etapa
  - upload e remoção de PDFs
- status com cores:
  - azul = em andamento
  - amarelo = aguardando pagamento
  - verde = finalizado
- timeline visual por chamado
- gerenciamento de lojas expandindo na lateral
- remoção do bloco fixo de lojas
- correção do bug de status:
  - chamado finalizado não entra em aguardando pagamento
- remoção dos destaques rosas do layout

## Estrutura do banco

Use o arquivo:

```bash
supabase-schema.sql
```

Ele cria:
- tabela `stores`
- tabela `tickets`
- tabela `ticket_files`
- bucket `maintenance-pdfs`
- políticas de acesso para ambiente interno sem login

## Como configurar

### 1. Instale as dependências

```bash
npm install
```

### 2. Crie o arquivo `.env.local`

Copie do `.env.example` e preencha:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
```

> Se o seu projeto Supabase ainda usa a chave legada, você pode usar `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

### 3. Rode o SQL no Supabase

Abra o SQL Editor do Supabase e execute o conteúdo de:

```bash
supabase-schema.sql
```

### 4. Rode localmente

```bash
npm run dev
```

Abra:

```bash
http://localhost:3000
```

## Deploy na Vercel

Na Vercel, adicione as mesmas variáveis:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Depois faça o deploy normalmente.

## Observação de segurança

Esta versão foi preparada para ambiente interno sem login, então as policies do Supabase estão abertas para leitura e escrita.  
Se você quiser, a próxima etapa pode ser:
- autenticação por usuário
- restrição por loja
- permissões de administrador
