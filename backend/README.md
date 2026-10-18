# Backend Barbearia Gold — desenvolvimento

API Node.js + SQLite para autenticação, catálogo e reservas. Pix ainda não integrado.

## Executar localmente
1. Instale Node.js 20+.
2. Entre em `backend` e execute `npm install`.
3. Copie `.env.example` para `.env` e configure um segredo JWT forte e credenciais do administrador.
4. Execute `npm start`.
5. Consulte `http://localhost:3000/health`.

## Rotas
- POST /api/register, POST /api/login
- GET /api/services, GET /api/professionals
- POST /api/bookings, GET /api/bookings/mine
- GET /api/admin/bookings, PATCH /api/admin/bookings/:id

## Limitações antes de produção
- Ainda não há frontend conectado à API nem compilação Android.
- Reservas são pendentes até confirmação manual por administrador; sem Pix.
- Validar concorrência com testes de carga, regras de folgas, feriados, cancelamentos, fuso horário e disponibilidade antes de operar.
- Não expor o servidor sem HTTPS, backups, monitoramento e revisão de segurança.
- O código não foi executado ou testado nesta entrega.
