# PallBridge 360 — projeto web

Site em React + Vite, com identidade visual lilás/rosa e áreas separadas para doente, cuidador e profissional.

## O que está incluído
- Página inicial responsiva e navegação.
- Registo e início de sessão via Supabase Auth.
- Formulário de bem-estar para doente.
- Registo de bem-estar/dificuldades para cuidador.
- Área de notas para profissional.
- Histórico dos registos do próprio utilizador.
- Esquema SQL inicial com Row Level Security (RLS).

## 1. Executar localmente
Instalar Node.js LTS. Na pasta do projeto:

```bash
npm install
cp .env.example .env
npm run dev
```

Sem configurar Supabase, o site apresenta a página inicial e os formulários de autenticação ficam desativados.

## 2. Configurar autenticação e base de dados
1. Criar um projeto em https://supabase.com/.
2. No Supabase, abrir **SQL Editor** e executar `supabase/schema.sql`.
3. Em **Project Settings → API**, copiar Project URL e anon/public key.
4. Preencher `.env` com `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
5. Em **Authentication → URL Configuration**, configurar o URL local e, depois, o domínio publicado.
6. Confirmar que a confirmação de email está configurada de acordo com a política pretendida.

**Não colocar a chave `service_role` no frontend.** A anon/public key é a chave própria para frontend com RLS corretamente configurado.

## 3. Papéis e validação
Por segurança, qualquer conta nova é criada inicialmente com o papel `patient`, independentemente do perfil escolhido no formulário. Para validar um cuidador ou profissional, um administrador deve alterar o papel no painel Supabase depois de confirmar a identidade e autorização. Não conceder papel profissional apenas com base na escolha do utilizador.

## 4. Publicar online
Depois de testar:
1. Criar um repositório Git privado no GitHub e enviar os ficheiros.
2. Criar um projeto em https://vercel.com/ e importar o repositório.
3. Definir as duas variáveis de ambiente `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
4. Publicar e configurar o domínio em Vercel e Supabase Auth.

Também pode ser publicado em Netlify ou outro alojamento estático compatível com Vite.

## 5. Muito importante — dados de saúde
Este projeto é um ponto de partida técnico, não um dispositivo médico nem um sistema clínico certificado. **Não utilizar dados reais ou identificáveis de doentes nesta versão.** Antes de produção são necessários, no mínimo:
- avaliação de impacto sobre proteção de dados (DPIA/AIPD), base legal e consentimentos adequados;
- revisão de segurança independente e testes de RLS;
- gestão de permissões por equipa e associação explícita doente-cuidador-profissional;
- registos de auditoria, política de retenção, exportação e apagamento;
- cópias de segurança, gestão de incidentes e contratos adequados com fornecedores;
- validação clínica, acessibilidade e testes com utilizadores.

A partilha de processos clínicos entre perfis não está ativada neste starter. O profissional apenas pode guardar notas próprias, sem acesso aos registos de outros utilizadores.
