# Plataforma de Gestão de Rotina de Equipe (ChefIA Remix)

## Estado Atual do Projeto

Este projeto é uma plataforma de gestão de rotina para equipes, permitindo o acompanhamento de atividades recorrentes em tempo real.

### Principais Alterações Recentes

#### 1. Estrutura de Dados e Segurança
- **Padronização de Funções (Roles):** O campo `role` na tabela `team_members` foi restrito via `CHECK constraint` aos valores `'diretor'` e `'membro'`.
- **Sistema de Aprovação:** Adicionado campo `status` em `team_members` (`'pendente'` ou `'aprovado'`). Novos usuários entram como `'pendente'`, exceto fundadores de empresas.
- **Row Level Security (RLS):** Ativado em todas as tabelas (`teams`, `team_members`, `activities`, `completions`, `reschedules`, `activity_logs`).
- **Isolamento de Equipe:** Implementada a função `auth_team_id()` (`SECURITY DEFINER`) para garantir que usuários só vejam/editem dados do seu próprio `team_id`.
- **Prevenção de Recursão:** Criada a função `is_director()` para checar permissões administrativas sem causar erros 500 de recursão infinita nas políticas de RLS.

#### 2. Fluxo de Cadastro
- **Criação de Empresa:** Agora os usuários podem escolher entre entrar em uma empresa existente (via convite) ou criar uma nova empresa.
- **RPC `criar_empresa_e_diretor`:** Criada uma função no banco de dados para garantir que a criação da empresa e a vinculação do diretor ocorram de forma atômica e segura.
- **Resolução de Condição de Corrida:** O fluxo de cadastro agora força a atualização do estado global do usuário (`refreshUser`) antes de redirecionar para o dashboard, evitando que o usuário caia em telas de "aguardando aprovação" por erro de sincronia.

#### 3. Frontend e Experiência do Usuário (UX)
- **Dashboard RBAC:** A visão do dashboard é filtrada automaticamente pelo papel do usuário. Diretores têm visão global da equipe, enquanto membros vêem apenas suas tarefas.
- **Atualização em Tempo Real:** Uso de Supabase Realtime para refletir mudanças de status e deleções de perfil instantaneamente.
- **Depuração:** Adicionados alertas e logs temporários para validar o sucesso das operações críticas de banco de dados no ambiente de produção.

---

## Estrutura do Banco de Dados (Lovable Cloud)

### Tabelas Principais
- `teams`: Armazena as empresas/equipes e seus códigos de convite.
- `team_members`: Vínculo entre usuários (auth.users) e equipes, contendo `role` e `status`.
- `activities`: Definição das tarefas e suas regras de recorrência (diária, semanal, mensal, única).
- `completions`: Registro de cada ocorrência concluída de uma atividade.
- `reschedules`: Registro de reprogramações de datas para ocorrências específicas.
- `activity_logs`: Logs de auditoria para ações na plataforma.

### Funções Auxiliares (PostgreSQL)
- `auth_team_id()`: Retorna o ID da equipe do usuário atual.
- `is_director()`: Valida se o usuário atual possui cargo de diretoria.
- `criar_empresa_e_diretor(user_id, team_name)`: Cria atomicamente uma nova empresa e define o criador como diretor aprovado.

---

## Tecnologias
- **Frontend:** TanStack Start (React 19, React Router, Vite).
- **Estilização:** Tailwind CSS v4.
- **Backend/Banco:** Lovable Cloud (Supabase).
- **Gerenciamento de Estado/Dados:** TanStack Query.
