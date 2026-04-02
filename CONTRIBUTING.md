# 🤝 Guia de Contribuição - My Mercado

Obrigado por seu interesse em contribuir com o My Mercado! Este guia vai te ajudar a entender como fazer contribuições eficazes.

## 📚 Índice

- [Código de Conduta](#código-de-conduta)
- [Como Contribuir](#como-contribuir)
- [Setup de Desenvolvimento](#setup-de-desenvolvimento)
- [Padrões de Código](#padrões-de-código)
- [Commits](#commits)
- [Pull Requests](#pull-requests)
- [Testes](#testes)

---

## 🎯 Código de Conduta

- Seja respeitoso e inclusivo
- Aceite críticas construtivas
- Foque no que é melhor para a comunidade
- Mostre empatia com outros contribuidores

---

## 🚀 Como Contribuir

### 1. Encontre uma Issue

- Veja as issues abertas
- Escolha uma issue ou crie uma nova
- Comente na issue informando que vai trabalhar nela

### 2. Fork e Clone

```bash
# Fork do repositório
https://github.com/Bosguega/my_mercado/fork

# Clone seu fork
git clone https://github.com/SEU_USUARIO/my_mercado.git

# Entre no diretório
cd my_mercado

# Adicione remote upstream
git remote add upstream https://github.com/Bosguega/my_mercado.git
```

### 3. Crie uma Branch

```bash
# Sempre crie branches a partir da main
git checkout main
git pull upstream main

# Crie uma branch para sua feature
git checkout -b feat/minha-nova-feature
```

### 4. Desenvolva

- Siga os padrões de código
- Escreva testes
- Documente suas mudanças

### 5. Commit

```bash
# Adicione arquivos
git add .

# Commit com mensagem formatada
git commit -m "feat: adiciona nova funcionalidade"
```

### 6. Push e Pull Request

```bash
# Push para seu fork
git push origin feat/minha-nova-feature

# Crie um Pull Request no GitHub
```

---

## 💻 Setup de Desenvolvimento

### Pré-requisitos

- Node.js 20+
- npm ou pnpm
- Git

### Instalação

```bash
# Instale dependências
npm install

# Configure variáveis de ambiente
cp .env.example .env
# Edite .env com suas credenciais

# Inicie servidor de desenvolvimento
npm run dev
```

### Comandos Úteis

```bash
# Type check
npm run typecheck

# Lint
npm run lint

# Testes
npm run test          # Watch mode
npm run test:run      # Single run
npm run test:ui       # UI mode

# Build
npm run build

# Preview do build
npm run preview
```

---

## 📝 Padrões de Código

### TypeScript

- Use TypeScript strict mode
- Evite `any`, use tipos específicos
- Exporte tipos e interfaces quando necessário

### Componentes React

```tsx
// ✅ Bom
interface Props {
  title: string;
  count?: number;
}

export function MyComponent({ title, count = 0 }: Props) {
  return <div>{title} - {count}</div>;
}

// ❌ Evite
function MyComponent(props) {
  return <div>{props.title}</div>;
}
```

### Hooks

```tsx
// ✅ Bom
export function useShoppingList(userId: string) {
  // Lógica do hook
  return { items, addItem, removeItem };
}

// ❌ Evite hooks muito longos (>100 linhas)
```

### Services

```typescript
// ✅ Bom
export async function saveReceipt(receipt: Receipt): Promise<Receipt> {
  // Lógica de negócio
}

// ❌ Evite misturar UI com lógica de negócio
```

### Utils

```typescript
// ✅ Bom - Funções puras
export function formatDate(date: Date): string {
  return format(date, 'dd/MM/yyyy');
}

// ❌ Evite efeitos colaterais em utils
```

---

## 📋 Commits

### Formato

Seguimos o [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Tipos

| Tipo | Descrição |
|------|-----------|
| `feat` | Nova funcionalidade |
| `fix` | Correção de bug |
| `docs` | Documentação |
| `style` | Formatação, linting |
| `refactor` | Refatoração |
| `perf` | Performance |
| `test` | Testes |
| `build` | Build, dependências |
| `ci` | CI/CD |
| `chore` | Tarefas gerais |
| `revert` | Revert de commit |

### Exemplos

```bash
# Feature
feat(scanner): adiciona upload de QR Code

# Bug fix
fix(history): corrige paginação no histórico

# Refactor
refactor(shopping-list): extrai hook useShoppingListActions

# Docs
docs(readme): atualiza instruções de instalação

# Test
test(idGenerator): adiciona testes para generateId
```

---

## 🔀 Pull Requests

### Template

Preencha o template de PR:

- Descrição clara das mudanças
- Tipo de mudança (feature, fix, refactor, etc.)
- Issue relacionada
- Passos para testar
- Checklist de qualidade

### Checklist

- [ ] Código segue padrões do projeto
- [ ] `npm run typecheck` passa
- [ ] `npm run lint` passa
- [ ] `npm run test:run` passa
- [ ] Testes adicionados/atualizados
- [ ] Documentação atualizada
- [ ] Testado manualmente

### Review

- Todos os PRs precisam de pelo menos 1 aprovação
- Responda a todos os comentários
- Faça as mudanças solicitadas
- Mantenha o PR focado e pequeno

---

## 🧪 Testes

### Escrevendo Testes

```typescript
import { describe, it, expect } from "vitest";
import { generateId } from "../idGenerator";

describe("generateId", () => {
  it("deve gerar um ID único", () => {
    const id1 = generateId();
    const id2 = generateId();
    
    expect(id1).toBeDefined();
    expect(id1).not.toBe(id2);
  });
});
```

### Rodando Testes

```bash
# Watch mode (desenvolvimento)
npm run test

# Single run (CI/CD)
npm run test:run

# Com coverage
npm run test:run -- --coverage

# UI mode
npm run test:ui
```

### Cobertura

- Escreva testes para nova lógica
- Teste casos de borda
- Teste cenários de erro
- Mantenha cobertura > 80%

---

## 📞 Dúvidas?

- Abra uma issue
- Entre em contato com os mantenedores
- Consulte a documentação existente

---

## 🙏 Obrigado!

Toda contribuição é bem-vinda e apreciada! 🎉
