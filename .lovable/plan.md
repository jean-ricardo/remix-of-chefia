# Plan - Simplificação para Single-Tenant e Correção de Fluxo de Usuários

Este plano simplifica a plataforma para o modelo de uma única empresa, remove o fluxo de aprovação pendente e implementa a exclusão segura de usuários (incluindo autenticação) via servidor.

## Mudanças Técnicas

### 1. Banco de Dados (SQL Migration)
- Fixar a lógica em uma única equipe (`Empresa Principal`).
- Atualizar a função `is_master()` para identificar corretamente o usuário master.
- Simplificar as políticas de RLS para ignorar o status "pendente".
- Garantir que `auth_team_id()` sempre retorne a equipe principal.

### 2. Lógica de Autenticação (`src/lib/auth.tsx`)
- Atualizar `resolveCurrentUser` para vincular automaticamente qualquer novo usuário à equipe principal.
- Definir o primeiro usuário como 'Diretor' (Master) e os subsequentes como 'Membro'.
- Remover verificações de `pending` ou `mapped` que bloqueavam o acesso.

### 3. Guardas de Rota (`src/components/auth/RouteGuards.tsx`)
- Remover o redirecionamento para a tela de "Aguardando Aprovação".
- Permitir que usuários autenticados acessem a plataforma imediatamente após o cadastro.

### 4. Cadastro (`src/routes/cadastrar.tsx`)
- Pular a etapa de verificação de código de equipe (vincular ao ID fixo).
- Simplificar a criação do registro em `team_members` para garantir entrada imediata.

### 5. Gerenciamento de Equipe e Exclusão (`src/routes/equipe.tsx`)
- Criar logicamente a exclusão via servidor.
- `src/lib/team-admin.server.ts`: Helper usando `supabaseAdmin` para deletar o usuário do Supabase Auth.
- `src/lib/team-admin.functions.ts`: Função de servidor (`createServerFn`) que valida o acesso do administrador antes de executar a exclusão.
- Atualizar o handler em `equipe.tsx` para chamar essa nova função.

## Revisão de Segurança: RouteGuards.tsx Diff

Conforme solicitado, aqui está o diff planejado para o `RouteGuards.tsx`:

```tsx
<<<<
  if (user?.pending || !user?.mapped) return <PendingApprovalScreen />;
====
  // Removido o bloqueio de aprovação pendente.
  // Usuários não mapeados agora são auto-provisionados no AuthProvider.
  // if (user?.pending || !user?.mapped) return <PendingApprovalScreen />;
>>>>
```

O componente `PendingApprovalScreen` será mantido no arquivo para evitar erros de importação e permitir uso futuro se necessário, mas não será mais utilizado como barreira de entrada.

---

O usuário confirma que posso prosseguir com a aplicação?
