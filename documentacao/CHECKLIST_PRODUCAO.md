# Checklist de Producao

- [ ] Preencher `.env`
- [ ] Validar acesso SSH por chave
- [ ] Validar `docker compose config`
- [ ] Subir PostgreSQL e backend
- [ ] Aplicar migrations
- [ ] Validar `/api/health`
- [ ] Configurar dominio e DNS
- [ ] Configurar HTTPS
- [ ] Gerar certificado Let's Encrypt com `docker compose --profile tls run --rm certbot`
- [ ] Reiniciar Nginx apos certificado com `docker compose up -d nginx`
- [ ] Validar backup e restauracao
- [ ] Validar auth Supabase
- [ ] Validar RLS com usuarios distintos
- [ ] Validar integracao Pluggy real
