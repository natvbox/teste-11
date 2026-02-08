 (cd "$(git rev-parse --show-toplevel)" && git apply --3way <<'EOF' 
diff --git a/DOCUMENTATION.md b/DOCUMENTATION.md
index 527584ffb17f6847d580f06190ae55e3ab89c26a..f2373326150e411b98ef17766e00d52e3238dc10 100644
--- a/DOCUMENTATION.md
+++ b/DOCUMENTATION.md
@@ -1,30 +1,30 @@
 # Documentação do Sistema Notifique-me
 
 ## Visão Geral
 
-O **Notifique-me** é um sistema completo de gerenciamento e envio de notificações push, desenvolvido com tecnologias modernas e arquitetura escalável. O sistema permite criar, agendar e enviar notificações para usuários específicos ou grupos, com suporte a imagens e vídeos.
+O **Notifique-me** é um sistema completo de gerenciamento e envio de notificações, desenvolvido com tecnologias modernas e arquitetura escalável. O sistema permite criar, agendar e enviar notificações para usuários específicos ou grupos, com suporte a imagens e vídeos.
 
 ## Funcionalidades Principais
 
 ### 1. Notificações Push (Web Push / PWA)
 
 O sistema utiliza a **Push API do navegador** em conjunto com o **Service Worker** (PWA) para receber e exibir notificações.
 
 **Características:**
 - Suporte a notificações em background via Service Worker
 - Exibição de notificações com ícone/badge e ações (abrir/fechar)
 
 ### 2. Sistema de Upload de Arquivos
 
 Sistema robusto para upload de imagens e vídeos com integração ao S3.
 
 **Características:**
 - Upload direto ao S3 via URLs pré-assinadas
 - Suporte a múltiplos formatos (JPEG, PNG, GIF, WebP, MP4, WebM, MOV)
 - Limite de 100MB por arquivo
 - Validação de tipo MIME
 - Associação de arquivos a notificações
 - Barra de progresso em tempo real
 
 **Arquivos principais:**
 - `server/routers/upload.ts` - API de upload
@@ -61,97 +61,105 @@ Sistema completo de gerenciamento de notificações com múltiplas opções.
 - Rastreamento de leitura
 - Estatísticas de entrega
 
 **Arquivos principais:**
 - `server/routers/notifications.ts` - API de notificações
 - `drizzle/schema.ts` - Schema do banco de dados
 
 ## Arquitetura do Sistema
 
 ### Stack Tecnológico
 
 **Frontend:**
 - React 19.2.1
 - TypeScript 5.9.3
 - Vite 5.4.11
 - TailwindCSS 4.1.14
 - Radix UI (componentes)
 - TanStack Query (gerenciamento de estado)
 - tRPC (comunicação type-safe)
 
 **Backend:**
 - Node.js 18
 - Express 4.21.2
 - tRPC 11.6.0
 - Drizzle ORM 0.44.5
-- MySQL 3.15.0
+- PostgreSQL (via `postgres` driver)
 
 **Infraestrutura:**
 - PWA (Service Worker + Push API)
 - AWS S3 (armazenamento de arquivos)
 - Banco de dados (SQL) via Drizzle
 
 ### Estrutura de Diretórios
 
 ```
 notifique-me-admin/
 ├── client/                    # Frontend React
 │   ├── public/               # Arquivos estáticos
 │   │   ├── manifest.json     # Manifest PWA
 │   │   ├── service-worker.js # Service Worker
 │   └── src/
 │       ├── components/       # Componentes React
 │       ├── hooks/           # Custom hooks
 │       └── lib/             # Bibliotecas e utilitários
 ├── server/                   # Backend Node.js
 │   ├── routers/             # Routers tRPC
 │   │   ├── notifications.ts
 │   │   ├── (push via Service Worker)
 │   │   ├── upload.ts
 │   │   ├── groups.ts
 │   │   └── files.ts
 │   └── _core/               # Core do servidor
 
 ├── drizzle/                # Schema e migrations
 │   ├── schema.ts
 │   └── migrations/
 └── shared/                 # Código compartilhado
 ```
 
 ## Configuração
 
 ### Variáveis de Ambiente
 
 Crie um arquivo `.env` na raiz do projeto:
 
 ```env
-# Database
-DB_HOST=localhost
-DB_PORT=3306
-DB_USER=root
-DB_PASSWORD=your-password
-DB_NAME=notifique_me
+# Database (PostgreSQL)
+DATABASE_URL=postgresql://user:password@localhost:5432/notifique_me
+
+# Server
+PORT=3000
+HOST=0.0.0.0
+NODE_ENV=development
+
+# Auth (local login)
+JWT_SECRET=sua_chave_secreta_aqui
+OWNER_OPEN_ID=seu_email@exemplo.com
+
+# CORS (produção)
+WEB_ORIGIN=https://seuapp.com
 
 # AWS S3
 AWS_ACCESS_KEY_ID=your-access-key
 AWS_SECRET_ACCESS_KEY=your-secret-key
 AWS_REGION=us-east-1
 AWS_S3_BUCKET=your-bucket
 ```
 
 ### Instalação
 
 ```bash
 # Instalar dependências do projeto principal
 npm install
 
 
 ```
 
 ### Desenvolvimento
 
 ```bash
 # Iniciar servidor de desenvolvimento
 npm run dev
 
 # Iniciar apenas o cliente
 npm run dev:client
@@ -166,52 +174,51 @@ npm run dev:server
 
 ```bash
 # Build do projeto
 npm run build
 
 
 ```
 
 ## Testes
 
 O sistema possui testes unitários abrangentes.
 
 ```bash
 # Executar todos os testes
 npm test
 
 # Executar testes em modo watch
 npm run test:watch
 
 # Executar testes com coverage
 npm run test:coverage
 ```
 
 **Arquivos de teste:**
 - `server/routers/upload.test.ts` - Testes de upload
-- `server/routers/scheduled-notifications.test.ts` - Testes de agendamento
-- `client/src/lib/pwa.test.ts` - Testes do PWA
+- `server/routers/notifications.test.ts` - Testes de notificações
 
 ## API Reference
 
 ### Notificações
 
 #### Criar Notificação
 ```typescript
 notifications.create({
   title: string,
   content: string,
   priority: 'normal' | 'important' | 'urgent',
   targetType: 'all' | 'users' | 'groups',
   targetIds: number[],
   imageUrl?: string,
   isScheduled: boolean,
   scheduledFor?: Date,
   recurrence: 'none' | 'daily' | 'weekly' | 'monthly'
 })
 ```
 
 #### Listar Notificações
 ```typescript
 notifications.list({
   limit: number,
   offset: number
@@ -219,54 +226,55 @@ notifications.list({
 ```
 
 ### Upload
 
 #### Obter URL de Upload
 ```typescript
 upload.getUploadUrl({
   filename: string,
   mimeType: string,
   fileSize: number,
   relatedNotificationId?: number
 })
 ```
 
 #### Confirmar Upload
 ```typescript
 upload.confirmUpload({
   fileId: number
 })
 ```
 
 ## Segurança
 
 ### Autenticação
 
-O sistema utiliza autenticação via Manus OAuth. Apenas usuários autenticados podem acessar as funcionalidades.
+O sistema utiliza autenticação local (login/senha) com sessão via cookie HTTPOnly. A integração com Manus OAuth não é usada neste projeto.
 
 ### Autorização
 
+- **Owner**: Acesso total e gerenciamento de tenants
 - **Admin**: Acesso completo a todas as funcionalidades
 - **User**: Acesso limitado a notificações e perfil próprio
 
 ### Validação
 
 Todas as entradas são validadas usando Zod schemas:
 - Tipos de arquivo permitidos
 - Tamanho máximo de arquivo (100MB)
 - Formato de dados
 - Permissões de acesso
 
 ## Monitoramento
 
 ### Logs
 
 O sistema registra logs detalhados:
 - Ações de usuários
 - Erros e exceções
 - Envio de notificações
 - Upload de arquivos
 
 ### Métricas
 
 Métricas disponíveis:
 - Taxa de entrega de notificações
 
EOF
)
