# Remix of ChefIA

Descritivo funcional — Plataforma de Gestão de Rotina de Equipe

1. Visão geral

Plataforma web para gestão da rotina de uma equipe: cadastro de membros, criação de atividades com diferentes recorrências, e um dashboard em tempo real que mostra o que está pendente, atrasado ou próximo do vencimento. Cada membro da equipe pode visualizar e concluir apenas as suas próprias atividades.

Objetivo principal: eliminar o controle manual de rotina (planilhas, lembretes avulsos) e centralizar em um painel único, atualizado em tempo real, com prioridade e responsabilidade claras por atividade.

2. Perfis de uso

Não há hierarquia de permissões complexa nesta primeira versão — todos os membros cadastrados têm acesso ao mesmo painel e podem:

Ver o dashboard geral (todas as atividades da equipe) ou filtrar para ver apenas as suas

Marcar suas próprias atividades como concluídas

Reprogramar a data de qualquer atividade

3. Módulos e funcionalidades

3.1 Cadastro de equipe

Cadastro de membro com: nome e função/cargo

Listagem de todos os membros, com contagem de atividades atribuídas a cada um

Remoção de membro

3.2 Cadastro de atividades

Campos da atividade:

Título (obrigatório)

Responsável (selecionado entre os membros cadastrados)

Prioridade: Alta / Média / Baixa

Tipo de recorrência, com campos específicos por tipo:

Diária — repete todos os dias

Semanal — repete uma vez por semana, em um dia da semana escolhido (domingo a sábado)

Mensal — repete uma vez por mês, em um dia do mês escolhido

Única — ocorre uma única vez, em uma data específica

Listagem de todas as atividades cadastradas, com prioridade, responsável, tipo de recorrência e opção de remover.

3.3 Dashboard em tempo real

O dashboard calcula, a cada momento, o status de cada atividade com base na data atual e organiza em:

Categoria Regra Atrasadas A ocorrência esperada já passou e não foi concluída Para hoje A ocorrência esperada é hoje e não foi concluída Próximos 7 dias A próxima ocorrência cai dentro dos próximos 7 dias Concluídas hoje Atividades cuja ocorrência de hoje já foi marcada como concluída

Regras importantes:

Cada tipo de recorrência gera uma "ocorrência atual" calculada automaticamente (ex: para uma atividade semanal com dia = quarta-feira, a ocorrência da semana corrente é sempre a quarta-feira daquela semana)

Concluir uma ocorrência não afeta as futuras — na próxima semana/mês/dia, a atividade volta a aparecer como pendente

O dashboard deve recalcular automaticamente em intervalos curtos (ex: a cada minuto), sem precisar de recarregar a página, e deve refletir instantaneamente ações de outros usuários (ex: se um colega concluir uma atividade em outro dispositivo, o painel atualiza sozinho)

Dentro de cada categoria, ordenar primeiro por prioridade (Alta > Média > Baixa) e depois por data

Cada item pendente exibe: título, responsável, tipo de recorrência, data da ocorrência, bandeira de prioridade, e duas ações:

Concluir — marca aquela ocorrência específica como feita

Reprogramar — abre um seletor de data para mover aquela ocorrência específica para uma nova data (sem alterar a recorrência das próximas ocorrências); atividades reprogramadas exibem um indicador visual de "reprogramada"

3.4 Filtro por responsável ("minhas atividades")

Um seletor no topo do dashboard permite alternar entre:

Toda a equipe — visão consolidada de todas as atividades

Um membro específico — visão restrita apenas às atividades daquele responsável, mantendo as mesmas categorias (atrasadas / hoje / próximas) e a ação de concluir

4. Modelo de dados sugerido

users

campo tipo observação id string/uuid chave primária name string obrigatório role string opcional (função/cargo)

activities

campo tipo observação id string/uuid chave primária title string obrigatório assigned_user_id referência a users.id priority enum: alta / media / baixa recurrence_type enum: diaria / semanal / mensal / unica weekday int (0–6) usado apenas se recurrence_type = semanal month_day int (1–28) usado apenas se recurrence_type = mensal due_date date usado apenas se recurrence_type = unica

completions (marca de conclusão por ocorrência)

campo tipo observação activity_id referência a activities.id occurrence_key string (data da ocorrência original, formato YYYY-MM-DD) completed_at timestamp

reschedules (reprogramações de ocorrências recorrentes)

campo tipo observação activity_id referência a activities.id original_occurrence_key string (YYYY-MM-DD) data original calculada pela recorrência new_date date nova data escolhida

Observação: para atividades do tipo "única", reprogramar altera diretamente o campo due_date, sem necessidade de registro em reschedules.

5. Requisitos técnicos

Banco de dados em tempo real, para que alterações feitas por um usuário (concluir, reprogramar, cadastrar) apareçam automaticamente nas telas de outros usuários sem recarregar a página (ex: Supabase Realtime, Firestore ou equivalente)

Responsivo, com uso confortável em desktop e celular

Sem necessidade de autenticação complexa nesta primeira versão (uso interno de equipe); estrutura preparada para adicionar login por usuário futuramente

Persistência permanente dos dados (não pode depender de armazenamento local do navegador)

6. Direção visual

Paleta: azul-marinho profundo como cor primária, âmbar como cor de destaque/ação, fundo em tom creme claro, com cores semânticas para status (vermelho para atrasado, âmbar para hoje/atenção, verde para concluído)

Tipografia limpa, sem serifa, hierarquia clara entre título, corpo e metadados

Elementos geométricos discretos (ex: forma hexagonal) podem ser usados como assinatura visual do cabeçalho

Prioridade visual: os itens mais urgentes (atrasados, alta prioridade) devem se destacar imediatamente ao abrir o painel, sem exigir cliques adicionais

7. Fora de escopo (nesta versão)

Autenticação/login individual

Notificações push ou por e-mail

Relatórios exportáveis (PDF/Excel)

Histórico/auditoria de alterações

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/f3d9822f-16ce-4d6d-a711-da5cf48ddee7).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
