# Garantia By Borges & Rangel

Aplicativo da família Borges & Rangel para organizar produtos, comprovantes e prazos de garantia.

## Desenvolvimento

Requer Bun. Execute `bun run dev` e abra o endereço exibido no terminal.

## Dados e privacidade

- Entre com a mesma conta Borges & Rangel usada nos outros aplicativos.
- Cadastros são guardados na tabela Supabase `warranty_products`, com RLS por usuário.
- Comprovantes ficam no bucket privado `warranty-receipts`; o app gera links temporários para abri-los.
- Use **Exportar backup** para guardar uma cópia JSON, incluindo os comprovantes, e **Importar backup** para adicionar os produtos a outra conta/aparelho.
- Os avisos de vencimento aparecem quando o app é aberto; esta versão não envia notificações em segundo plano.

A estrutura Supabase está em `supabase/migrations/20261031231236_warranty_products_and_receipts.sql`.

O site é estático e pode ser publicado no GitHub Pages em `/garantia/`.
