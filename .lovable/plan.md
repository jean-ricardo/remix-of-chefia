# Plano de Acesso Direto para Novos Membros

O objetivo é permitir que o Diretor envie um link geral da plataforma e que novos usuários se cadastrem preenchendo e-mail, telefone, nome e senha, sendo vinculados automaticamente à equipe sem a necessidade de verificação de e-mail.

## Mudanças Necessárias

### 1. Ajustes no Banco de Dados (Supabase)
- Garantir que a tabela `team_members` suporte o campo `telefone` (já existente como `telefone` em alguns lugares e `telefone` no schema).
- A regra de "único time" (Single-Tenant) já está aplicada no código (`MAIN_TEAM_ID`).

### 2. Tela de Equipe (`src/routes/equipe.tsx`)
- Adicionar um novo botão "Copiar Link de Convite" que copia o link direto para `/cadastrar`.
- Manter o convite por e-mail como opcional, mas priorizar o compartilhamento de link.

### 3. Tela de Cadastro (`src/routes/cadastrar.tsx`)
- Garantir que todos os campos (Nome, E-mail, WhatsApp/Telefone, Senha) estejam visíveis e funcionais.
- Confirmar que o fluxo de `signUp` do Supabase e o `INSERT` em `team_members` estão corretos.
- Remover qualquer bloqueio de "pendente" se o usuário vier via link direto (ou deixar como "Membro" ativo imediatamente conforme solicitado).

### 4. Configuração de Autenticação
- Confirmar que `auto_confirm_email` está ativado no backend (já solicitado anteriormente).

### 5. Lógica de Vínculo (`src/lib/auth.tsx`)
- Ajustar `resolveCurrentUser` para garantir que novos usuários sejam mapeados corretamente para o time principal com cargo "Membro" se não houver um convite prévio.

## Passos Técnicos

1.  **Interface de Equipe**:
    - Adicionar seção "Compartilhar Link" com o URL `/cadastrar`.
2.  **Fluxo de Cadastro**:
    - Ajustar `src/routes/cadastrar.tsx` para definir `cargo_principal: 'Membro'` e `role: 'membro'` por padrão.
    - Garantir que o campo WhatsApp mapeie para a coluna correta no banco.
3.  **Segurança e Acesso**:
    - Remover verificações de "pendente" que possam barrar o acesso imediato.
