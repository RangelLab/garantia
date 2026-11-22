# Garantia By BoRan Studio

Aplicativo da BoRan Studio para organizar produtos, comprovantes e prazos de garantia.

## Desenvolvimento

Requer Node.js. Execute `npm run dev` e abra o endereço exibido no terminal.

## Dados e privacidade

- O Garantia usa conta, senha e sessões próprias, independentes dos demais aplicativos BoRan Studio.
- Dados de conta e produtos ficam no schema Supabase `garantia` (`accounts`, `profiles`, `sessions`, `email_tokens`, `auth_rate_limits` e `products`).
- O cadastro, a confirmação de e-mail e a recuperação de senha usam a Edge Function `garantia-api` e o Resend.
- Comprovantes ficam no bucket privado `warranty-receipts`; o app gera links temporários para abri-los.
- Use **Exportar backup** para guardar uma cópia JSON, incluindo os comprovantes, e **Importar backup** para adicionar os produtos a outra conta/aparelho.
- Os avisos de vencimento aparecem quando o app é aberto; esta versão não envia notificações em segundo plano.

A tabela antiga `public.warranty_products` foi copiada para `garantia.products`, preservando os IDs dos registros. Ela permanece como cópia de segurança durante a validação; o Dashboard já consulta o novo schema.

O site é estático e é publicado pelo Cloudflare Pages; configure `GARANTIA_PUBLIC_URL` na Edge Function com a URL pública efetiva do app para que os links de confirmação e recuperação de senha retornem ao endereço correto.
