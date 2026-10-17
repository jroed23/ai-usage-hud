# AI USAGE HUD — PROMPT MESTRE PARA DESENVOLVIMENTO DO APP

> **Documento vivo.** Este arquivo é atualizado a cada nova alteração de escopo, decisão ou progresso do projeto. Veja o [Histórico de atualizações](#histórico-de-atualizações) no final.

## Decisão de escopo (2026-10-16)

**Por ora, somente o provider Claude.** Cursor, Codex, Gemini e Copilot ficam fora do escopo; o usuário decidirá depois, com o app pronto, se implementa. A arquitetura de Providers continua modular (seções 6, 33), mas só `ClaudeProvider` será implementado. O README não deve listar os demais como "Available".

## Status atual

| Fase | Status |
|---|---|
| 1 — Research | ✅ Concluída para o escopo (Claude); demais providers adiados |
| 2 — Architecture | ✅ Tauri 2 + Rust + React + TS; ver `docs/architecture.md` |
| 3 — HUD | ✅ Código pronto (widget, transparência, drag, hover, 4 modos, tray); ⏳ validação visual manual |
| 4 — Providers | ✅ Somente Claude (via status line oficial) |
| 5 — Settings | ✅ General / Appearance / Providers / Privacy / About + Welcome |
| 6 — Testes | 🔄 22 testes TS + 3 Rust passando; faltam testes de UI e verificação manual |
| 7 — Open Source | 🔄 Docs, licença MIT, CI/release prontos; ⏳ repositório GitHub (requer login do usuário) |

---

Atue como um **arquiteto de software sênior, engenheiro de aplicações desktop, especialista em TypeScript, Rust/Tauri, React, Windows, integração com CLI/API, UX/UI e projetos Open Source**.

Quero que você desenvolva um produto real chamado:

# AI Usage HUD

O **AI Usage HUD** será um aplicativo desktop open source que permite ao usuário monitorar, em tempo real, o consumo/uso de diferentes ferramentas de Inteligência Artificial diretamente sobre a tela do computador.

O aplicativo deverá funcionar como um pequeno **HUD flutuante**, semelhante a uma marca d'água, que permanece visível sobre as demais janelas.

O usuário poderá escolher quais IAs deseja conectar e acompanhar.

---

## 1. CONCEITO DO PRODUTO

O aplicativo deve funcionar como um:

> **Universal AI Usage Monitor para Desktop**

O usuário instala o aplicativo e escolhe quais serviços deseja monitorar.

Exemplos:

- Claude / Claude Code
- Cursor
- OpenAI Codex
- Gemini / Gemini CLI
- GitHub Copilot
- outros provedores futuramente

A arquitetura deve ser criada desde o início para permitir adicionar novos provedores sem modificar o núcleo do aplicativo.

---

## 2. PRINCIPAL DIFERENCIAL

Não quero criar um aplicativo específico para uma única IA.

Quero criar uma arquitetura baseada em:

```text
AI Usage HUD
       │
       ├── Claude
       ├── Cursor
       ├── Codex
       ├── Gemini
       ├── GitHub Copilot
       └── Future Providers
```

Cada IA deverá ser implementada como um **Provider independente**.

```text
UsageProvider
│
├── ClaudeProvider
├── CursorProvider
├── CodexProvider
├── GeminiProvider
├── CopilotProvider
└── FutureProvider
```

---

## 3. EXPERIÊNCIA INICIAL DO USUÁRIO

Na primeira abertura do aplicativo, apresentar:

**Welcome to AI Usage HUD** — *Choose the AI services you want to monitor*

Mostrar uma interface visual com os provedores disponíveis.

```text
┌───────────────────────────────────────┐
│          AI USAGE HUD                 │
│                                       │
│  Select your AI tools                 │
│                                       │
│  ◉ Claude                             │
│  ○ Cursor                             │
│  ○ Codex                              │
│  ○ Gemini                             │
│  ○ GitHub Copilot                     │
│                                       │
│             [ Continue ]              │
└───────────────────────────────────────┘
```

O usuário poderá selecionar **uma ou várias IAs**.

---

## 4. PROVEDORES INICIAIS

### Claude
Monitorar, quando oficialmente disponível: Claude Code; uso da sessão; limite da sessão; tokens; janela/contexto; consumo semanal; modelo; status.

### Cursor
Investigar as APIs, CLI, documentação ou mecanismos oficialmente disponibilizados pelo Cursor. Mostrar somente métricas realmente disponíveis. Possíveis métricas: uso; requests; tokens; créditos; limite; modelo; período; status.

### OpenAI Codex
Investigar a forma oficial de obtenção das informações de uso. Mostrar consumo, tokens, limite, requests, modelo, período, status — somente quando oficialmente disponível.

### Gemini
Investigar: Gemini CLI; API oficial; ferramentas locais; mecanismos oficiais de uso. Mostrar somente métricas verificáveis.

### GitHub Copilot
Preparar arquitetura para: requests; premium requests; consumo; limites; período — quando disponibilizados oficialmente.

---

## 5. REGRA FUNDAMENTAL SOBRE INTEGRAÇÕES

- NUNCA invente uma API.
- NUNCA faça scraping de áreas privadas.
- NUNCA capture: senhas; cookies; tokens privados; sessões; teclas; conteúdo das conversas.
- Não utilizar engenharia reversa de autenticação.

Para cada Provider, investigar primeiro:

1. API oficial;
2. CLI oficial;
3. documentação oficial;
4. mecanismo local oficialmente suportado;
5. outras alternativas somente se forem legítimas, seguras e compatíveis com os termos aplicáveis.

Se uma métrica não puder ser obtida, mostrar:

> Data unavailable

ou:

> This provider does not currently expose this metric.

---

## 6. ARQUITETURA MODULAR

```typescript
interface UsageProvider {
  id: string;
  name: string;
  icon: string;

  connect(): Promise<void>;
  disconnect(): Promise<void>;
  getStatus(): Promise<ProviderStatus>;
  getUsage(): Promise<UsageData>;
  isAvailable(): Promise<boolean>;
}
```

Criar um registro `ProviderRegistry` que descubra os Providers disponíveis:

```text
ProviderRegistry
│
├── ClaudeProvider
├── CursorProvider
├── CodexProvider
├── GeminiProvider
└── CopilotProvider
```

Adicionar novos Providers futuramente sem modificar o núcleo.

---

## 7. MODELO UNIVERSAL DE USAGE

```typescript
UsageData {
  providerId
  providerName

  sessionUsage
  weeklyUsage
  monthlyUsage

  tokensUsed
  tokensRemaining

  requestsUsed
  requestsRemaining

  creditsUsed
  creditsRemaining

  contextUsed
  contextLimit

  resetDate
  model
  status
  lastUpdated
}
```

**IMPORTANTE:** nem todos os Providers terão todas essas propriedades. Portanto:

- não mostrar campos inexistentes;
- não apresentar zeros falsos;
- não inventar dados.

---

## 8. SISTEMA DE MÉTRICAS DINÂMICAS

O HUD deve entender que cada IA possui métricas diferentes:

| Provider | Exemplo |
|---|---|
| Claude | Session 42% · Weekly 28% |
| Cursor | Requests 245 / 500 |
| Codex | Tokens 125K / 300K |
| Gemini | Requests 82 / 100 |
| Copilot | Premium Requests 340 / 500 |

O layout deverá se adaptar automaticamente.

---

## 9. HUD FLUTUANTE

Pequeno widget flutuante: sempre no topo; transparente; discreto; pequeno; arrastável; multi-monitor; persistente; baixo consumo.

```text
   ◉        ou        [AI]
```

---

## 10. MULTIPROVIDER HUD

**Modo compacto** — apenas ícones (`◉ ◉ ◉ ◉`), cada um representando uma IA.

**Modo expandido:**

```text
Claude      42%
Cursor      68%
Codex       31%
Gemini      17%
```

O usuário poderá escolher o modo.

---

## 11. ÍCONES DOS PROVEDORES

Utilizar os **ícones/logos oficiais das marcas**, quando permitido pelas diretrizes de marca/licença. Criar um sistema `ProviderIcon` com assets separados:

```text
assets/providers/
├── claude.svg
├── cursor.svg
├── codex.svg
├── gemini.svg
├── copilot.svg
└── ...
```

- NÃO copiar assets de fontes não autorizadas.
- Utilizar assets oficiais; respeitar brand guidelines; verificar licença.
- Se um logo não puder ser redistribuído, usar ícone textual/genérico e documentar.

---

## 12. SELEÇÃO DE PROVIDERS

Tela **Your AI Providers** com cards:

```text
┌───────────────────────┐
│      [Claude Icon]    │
│       Claude          │
│       Connected       │
│        [✓]            │
└───────────────────────┘
```

Cada card: ícone; nome; status; conectar/desconectar; métricas disponíveis.

---

## 13. CONEXÃO

Botão **Connect** → **Connected ✓**.

Se necessário autenticação: OAuth oficial; API key oficial; CLI local; autenticação segura do SO. Nunca armazenar credenciais em texto puro.

---

## 14. STATUS DOS PROVIDERS

```text
CONNECTED
CONNECTING
DISCONNECTED
UNAVAILABLE
ERROR
AUTH_REQUIRED
DATA_UNAVAILABLE
```

Mostrar claramente o estado.

---

## 15. HOVER

Ao passar o mouse sobre um ícone, expandir um pequeno painel adaptativo ao Provider:

```text
Claude
Session   ████████░░ 42%
Weekly    ██████░░░░ 28%
Model     Claude
Updated   8 seconds ago
```

```text
Cursor
Requests  ███████░░░ 68%
Remaining 160
Reset     Tomorrow
```

---

## 16. CLI DETECTION

Detectar automaticamente ferramentas instaladas (Claude Code, Cursor, Codex, Gemini CLI). Instalação local **não** implica autenticação. Separar: `Installed` · `Connected` · `Active` · `Usage Available`.

---

## 17. DETECÇÃO DE ATIVIDADE

Detectar quando possível: aplicativo ativo; CLI em execução; sessão ativa; última atividade.

```text
Claude  ● Active
Cursor  ○ Idle
Codex   ○ Not running
```

Tratada separadamente do consumo.

---

## 18. ALWAYS ON TOP

O HUD permanece sobre navegador, VS Code, Cursor, terminal, explorador de arquivos, apps de escritório e outras janelas. Opção para desativar **Always on top** nas configurações.

---

## 19. DRAG & DROP

Arrastar um Provider individual ou o HUD inteiro. Posição salva automaticamente.

---

## 20. MULTIMONITOR

Suportar 1, 2 ou múltiplos monitores. Salvar `monitor`, `x`, `y`. Se o monitor não estiver disponível, reposicionar automaticamente.

---

## 21. MODOS DE VISUALIZAÇÃO

- **Minimal** — somente ícones.
- **Compact** — ícone + percentual.
- **Detailed** — ícone + métricas.
- **Expanded** — painel completo:

```text
┌────────────────────────────┐
│ AI USAGE                   │
│ Claude       42%           │
│ Cursor       68%           │
│ Codex        31%           │
│ Gemini       17%           │
│ Updated 10 seconds ago     │
└────────────────────────────┘
```

---

## 22. ALERTAS

Preparar arquitetura para alertas em 50% / 75% / 90% / 100% (ex.: *"Claude usage reached 90%."*). Não precisa de notificações avançadas no MVP.

---

## 23. SYSTEM TRAY

```text
AI Usage HUD
Show HUD
Hide HUD
Providers
    Claude ✓
    Cursor ✓
    Codex ✓
    Gemini ✓
Refresh
Settings
GitHub
About
Quit
```

---

## 24. CONFIGURAÇÕES

- **General:** iniciar com Windows; always on top; atualização automática; intervalo.
- **Appearance:** tema; transparência; tamanho; modo de visualização; animações.
- **Providers:** conectar; desconectar; ativar/desativar; prioridade.
- **Privacy:** logs; diagnóstico; telemetria.

---

## 25. PRIVACIDADE — Local First

- dados permanecem localmente;
- nenhuma conta própria; nenhum servidor próprio;
- nenhuma informação de uso enviada a terceiros.

Não coletar: prompts; respostas; conteúdo de arquivos; teclas; tela; senhas.

---

## 26. SEGURANÇA

Credenciais: Windows Credential Manager (ou equivalente seguro); OAuth oficial; mecanismos oficiais dos Providers.

Nunca usar `.env`, `config.json`, `localStorage` ou logs para armazenar secrets.

---

## 27. STACK

Avaliar Tauri, React, TypeScript, Rust. Prioridades: 1) desempenho; 2) baixo consumo; 3) segurança; 4) transparência; 5) integração Windows; 6) manutenção; 7) facilidade para Open Source.

Se Tauri for a melhor escolha: **Tauri + Rust + React + TypeScript**.

---

## 28. PERFORMANCE

Baixo uso de CPU e RAM; polling inteligente; evitar processos e chamadas desnecessárias; suspender atividades quando não necessárias.

---

## 29. CACHE

```text
Provider → UsageService → Cache → HUD
```

Evitar chamadas repetitivas. Mostrar `Last updated: 8s`.

---

## 30. ERROR HANDLING

Cada Provider falha isoladamente. Se Claude estiver com erro (`Claude unavailable`), Cursor, Codex, Gemini e Copilot continuam funcionando.

```text
ClaudeProvider ❌
CursorProvider ✓
CodexProvider ✓
GeminiProvider ✓
```

---

## 31. OPEN SOURCE

Criar: `README.md`, `LICENSE` (avaliar MIT), `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, `CHANGELOG.md`.

---

## 32. ESTRUTURA

```text
ai-usage-hud/
├── src/
│   ├── components/
│   ├── providers/
│   │   ├── claude/
│   │   ├── cursor/
│   │   ├── codex/
│   │   ├── gemini/
│   │   └── copilot/
│   ├── services/
│   │   ├── usage/
│   │   ├── auth/
│   │   ├── storage/
│   │   └── detection/
│   ├── stores/
│   ├── hooks/
│   ├── types/
│   └── utils/
├── src-tauri/
├── assets/
│   └── providers/
├── tests/
├── docs/
├── .github/
│   ├── workflows/
│   ├── ISSUE_TEMPLATE/
│   └── pull_request_template.md
├── README.md
├── LICENSE
├── SECURITY.md
├── CONTRIBUTING.md
└── CHANGELOG.md
```

Adaptar conforme necessário.

---

## 33. SISTEMA DE PLUGINS FUTURO

Permitir que a comunidade crie Providers via **Provider SDK** (`community-provider/ → AI Usage HUD`). Documentar como criar um novo Provider:

```typescript
class NewAIProvider implements UsageProvider {
   ...
}
```

Um dos principais diferenciais do projeto.

---

## 34. PROVIDER MARKETPLACE — FUTURO

Não implementar agora. Arquitetura preparada para `AI Usage HUD → Provider Directory → Install Provider` (ex.: DeepSeek, Grok, Perplexity, Mistral, Amazon Q, Windsurf, Roo Code, Cline, Aider, Continue).

---

## 35. DASHBOARD FUTURO

Preparar para apresentar percentuais por provider, total de tokens, requests e "most used". Não implementar tudo no MVP.

---

## 36. HISTÓRICO FUTURO

Preparar armazenamento local de uso diário/semanal/mensal para gráficos futuros.

---

## 37. DESIGN

Premium; minimalista; moderno; tecnológico; extremamente discreto. Inspiração: HUD, widgets macOS, Fluent Design, Glassmorphism, utilitários profissionais. Interface leve.

---

## 38. IDENTIDADE

**Nome:** AI Usage HUD
**Subtítulo:** *Monitor your AI usage. Anywhere. In real time.*

Deixar claro: **Independent open-source project.** Não sugerir vínculo oficial com Anthropic, OpenAI, Cursor, Google ou qualquer provedor.

---

## 39. BRAND ASSETS

Estrutura `ProviderBrandAssets` — cada Provider com: nome; ícone; cor (quando permitido); URL oficial; documentação; status. Não usar logos de maneira que implique endosso.

---

## 40. TESTES

ProviderRegistry; UsageProvider; UsageService; cache; atualização; estados; conexão; desconexão; armazenamento; posição; multi-monitor; cálculo de percentual; UI; falha individual de Provider.

Testar especialmente: **Claude falha → Cursor continua → Codex continua.**

---

## 41. GITHUB

Repositório `ai-usage-hud` (ou nome semelhante). Configurar Git, commits organizados, README, Issues, PRs, GitHub Actions, releases.

---

## 42. CI/CD

- `.github/workflows/ci.yml` — install; lint; test; build.
- `.github/workflows/release.yml` — build Windows; instalador; artefatos; GitHub Release.

---

## 43. README

Título, tagline *"Monitor your AI usage directly from your desktop."*, lista de features e tabela:

| Provider | Status | Metrics |
|---|---|---|
| Claude | … | … |
| Cursor | … | … |
| Codex | … | … |
| Gemini | … | … |
| Copilot | … | … |

NÃO marcar como "Available" algo sem integração realmente funcional.

---

## 44. DOCUMENTAÇÃO

`docs/`: `architecture.md`, `providers.md`, `security.md`, `privacy.md`, `development.md`, `creating-a-provider.md`, `troubleshooting.md`.

---

## 45. ROADMAP

- **v0.1** — HUD; Claude; arquitetura Provider.
- **v0.2** — Cursor; Codex.
- **v0.3** — Gemini; Copilot.
- **v0.4** — histórico; alertas.
- **v1.0** — Provider SDK; comunidade; marketplace futuro.

Ajustar conforme a realidade do desenvolvimento.

---

## 46. REGRA CRÍTICA SOBRE MÉTRICAS

NÃO padronizar artificialmente todas as IAs em "créditos". Criar `UsageMetric` universal, podendo representar:

```text
tokens
requests
credits
context
premium_requests
session_limit
weekly_limit
monthly_limit
```

O HUD mostra apenas o que o Provider realmente fornece.

---

## 47. EXPERIÊNCIA IDEAL

Usuário trabalhando no Cursor; no canto da tela `◉ ◉ ◉`. Ao passar o mouse:

```text
┌────────────────────────────┐
│ AI USAGE                   │
│ 🟠 Claude       42%         │
│ 🔵 Cursor       68%         │
│ 🟣 Codex        31%         │
│ 🔴 Gemini       17%         │
│ Updated 6 seconds ago      │
└────────────────────────────┘
```

Ele pode clicar, expandir, arrastar, esconder e alterar quais IAs aparecem.

---

## 48. PRINCÍPIO DE UX

O usuário não deve precisar abrir navegador, dashboard, terminal ou página de conta para descobrir seu consumo, **quando essa informação puder ser obtida de forma oficial e segura**.

> **Bring AI usage information to the user's desktop.**

---

## 49. MVP REAL

### Core
- [ ] Windows
- [ ] HUD
- [ ] transparência
- [ ] always-on-top
- [ ] drag & drop
- [ ] persistência
- [ ] multi-monitor
- [ ] hover
- [ ] painel
- [ ] system tray
- [ ] configurações
- [ ] atualização automática

### Architecture
- [ ] Provider system
- [ ] UsageService
- [ ] ProviderRegistry
- [ ] cache
- [ ] error isolation

### Providers
Implementar primeiro os Providers que puderem obter dados de forma oficial e segura. Não criar integrações fictícias.

### Open Source
- [ ] GitHub
- [ ] MIT
- [ ] README
- [ ] documentation
- [ ] tests
- [ ] GitHub Actions
- [ ] release

---

## 50. PROCESSO DE EXECUÇÃO

1. **FASE 1 — RESEARCH:** investigar APIs, CLIs, métricas, autenticação, limitações, termos e integração local de Claude, Cursor, Codex, Gemini e Copilot. Não implementar com base em suposições.
2. **FASE 2 — ARCHITECTURE:** stack; Provider architecture; Usage model; armazenamento; autenticação; comunicação Rust/React; overlay.
3. **FASE 3 — HUD:** widget; transparência; drag; hover; painel; always-on-top.
4. **FASE 4 — PROVIDERS:** implementar os possíveis, cada um independente.
5. **FASE 5 — SETTINGS:** providers; aparência; atualização; startup; posição; comportamento.
6. **FASE 6 — TESTES:** integração; UI; performance; erros; multi-monitor.
7. **FASE 7 — OPEN SOURCE:** documentação; licença; GitHub; CI/CD; release.

---

## 51. NÃO PARE NO PROTÓTIPO

Produto funcional: **pesquisar → arquitetar → desenvolver → testar → corrigir → documentar → criar Git → publicar no GitHub → gerar build.**

Não parar para pedir autorização a cada etapa. Pedir intervenção somente quando indispensável: autenticação; credenciais; acesso ao GitHub; publicação; decisão que não possa ser determinada tecnicamente.

---

## 52. RELATÓRIO FINAL

- **Produto:** funcionalidades; arquitetura; stack.
- **Providers:** método de integração; métricas; autenticação; limitações; status.
- **Segurança:** armazenamento; credenciais; privacidade.
- **GitHub:** URL; branch; versão; release.
- **Build:** como gerar; como instalar; localização do instalador.
- **Próxima versão:** 10 melhorias prioritárias.

---

## OBJETIVO FINAL

```text
                 AI USAGE HUD
                      │
        ┌─────────────┼─────────────┐
        │             │             │
      Claude        Cursor        Codex
        │             │             │
      Gemini       Copilot       Future AI
        │             │             │
        └─────────────┼─────────────┘
                      │
                Universal HUD
                      │
                 Desktop User
```

**Open Source + Local First + Modular + Extensível + Leve + Privacidade em primeiro lugar.**

---

## Achados da Fase 1 — Research

*Pesquisa de 2026-10-16. Apenas fontes oficiais contam como "confirmado"; o restante está marcado como não verificado.*

| Provider | Mecanismo oficial | Métricas | Auth | Veredito |
|---|---|---|---|---|
| **Claude** | Status line do Claude Code: o CLI envia JSON via stdin a um script configurado ([docs](https://code.claude.com/docs/en/statusline)) | `rate_limits.five_hour` e `seven_day` (`used_percentage` 0–100, `resets_at` epoch), `context_window.*`, modelo, custo. `rate_limits` só para assinantes Pro/Max, após a 1ª resposta da sessão, e cada janela pode faltar | Nenhuma extra (local) | ✅ **Viável**. Implementar primeiro |
| **Cursor** | Analytics API (somente Enterprise, chave admin, Basic Auth). Não há API oficial para usuário individual | Métricas por time/usuário (edits, DAU, modelos…). Gasto: só `cost_cents` do Bugbot | Chave de API admin | ⚠️ **Limitado**. Útil só para times Enterprise. Spend API do Admin existe mas a doc está defasada |
| **Codex** | Não confirmado. `/status` e SDK/App Server/`codex exec` existem, mas as páginas lidas não documentam limites de uso nem local de sessões | Desconhecidas oficialmente | — | ❓ **Pendente**. Ler a referência do App Server e o repositório `openai/codex` |
| **Gemini** | `/stats model` mostra tokens e "quota information" (interativo). Telemetria OpenTelemetry existe | Conteúdo exato da quota não documentado; sem modo programático documentado | Login Google ou API key | ❓ **Pendente**. Verificar telemetria e headless mode |
| **Copilot** | REST: `GET /users/{username}/settings/billing/premium_request/usage` e `GET /organizations/{org}/settings/billing/premium_request/usage` ([docs](https://docs.github.com/en/rest/billing/usage)) | Premium requests por modelo/produto, últimos 24 meses | Token GitHub (escopos não listados) | ⚠️ **Parcial**. Usuário: só planos comprados pelo próprio usuário. Desde 01/06/2026 o Copilot migra para cobrança por uso, o que pode invalidar premium requests |

### Conclusões

1. **Claude é o único provider com integração local, oficial e sem credenciais** — o HUD pode registrar-se como status line (ou usar um wrapper) e ler o JSON. Ponto de atenção: o status line é configurado por usuário e o JSON só chega enquanto o Claude Code roda; o HUD precisará de um relay local (arquivo/pipe) escrito pelo script.
2. **Cursor, Codex e Gemini não têm métricas de consumo individual confirmadas.** Até a verificação, o HUD mostrará *Data unavailable* (regra da seção 5).
3. **Copilot** exige token GitHub guardado no Credential Manager; escopos e comportamento sob cobrança por uso precisam de validação.
4. Fontes de terceiros citaram um endpoint OAuth não documentado do Claude (`/api/oauth/usage`) — **descartado**: viola a regra de não usar tokens/APIs privadas.

### Pendências da Fase 1
- [ ] Codex: ler docs do App Server/SDK/`codex exec` e do repo oficial.
- [ ] Gemini: ler docs de Telemetry, Headless e Quota and pricing.
- [ ] Cursor: confirmar Admin API de spend e se há algo para planos individuais.
- [ ] Copilot: confirmar escopos do token e efeito da cobrança por uso.
- [ ] Brand guidelines e licenças de logos de cada marca.

---

## Histórico de atualizações

| Data | Alteração |
|---|---|
| 2026-10-07 | Criação do documento a partir do prompt mestre. |
| 2026-10-16 | Início da Fase 1: pesquisa de integrações oficiais; Claude confirmado, Cursor/Copilot parciais, Codex/Gemini pendentes. |
| 2026-10-16 | Instalados Rust 1.99 e VS Build Tools 2022 (aprovado pelo usuário). Implementados: backend Rust (relay da status line, conexão/desconexão segura de `~/.claude/settings.json`, tray), frontend (HUD, hover, settings, welcome), `ProviderRegistry`, `UsageService`, `ClaudeProvider`. Criados README, LICENSE (MIT), CONTRIBUTING, CODE_OF_CONDUCT, SECURITY, CHANGELOG, `docs/*`, CI e release. Testes: 22 TS + 3 Rust passando. Bug achado por teste e corrigido (valor 0 em settings virava padrão). |
| 2026-10-16 | Build de release OK: instaladores NSIS (1,27 MB) e MSI (1,80 MB) em `src-tauri/target/release/bundle/`. Relay testado de ponta a ponta (snapshot sem `cwd`). App abre com ~26 MB (processo principal) + WebView2. Pendente: validação visual/manual do HUD e publicação no GitHub (aguardando confirmação do usuário; `gh` logado como `jroed23`). |
| 2026-10-16 | **Bug de integração achado**: o HUD continuava em "—" com o Claude logado. Causa 1 (corrigida no código, ainda sem release): caminho do exe gravado com `` na status line; o Git Bash do Claude Code consome as barras (doc oficial) -> agora `relay_command` usa `/` (teste unitário, 5 testes Rust). Causa 2 (aberta): mesmo uma status line trivial (`--settings` temporário que só grava um arquivo) **não executou** nas abas do terminal embutido do app Claude desktop (CLI 2.1.302), embora a doc diga que roda ao iniciar a sessão; hipótese: ambiente `claude-desktop` ou renderer. Pendente: testar em um Windows Terminal/PowerShell comum fora do app. `settings.json` do usuário ajustado manualmente para `/`. |
| 2026-10-16 | **Publicado**: repositório agora **público** (https://github.com/jroed23/ai-usage-hud), tag `v0.1.0` e **GitHub Release v0.1.0** publicada (https://github.com/jroed23/ai-usage-hud/releases/tag/v0.1.0) com instaladores NSIS e MSI gerados pelo GitHub Actions (CI verde). Builds sem assinatura de código. |
| 2026-10-16 | **Análise de segurança** (`docs/security-review.md`): sem segredos/dados pessoais hard-coded; `pnpm audit` e `cargo audit` sem vulnerabilidades. Corrigidos: (alto) erro de leitura do `~/.claude/settings.json` era tratado como arquivo vazio e podia sobrescrevê-lo; (médio) raiz não-objeto causava panic e escrita não atômica; permissões Tauri excessivas removidas; CI com token somente-leitura. 4 testes Rust. Instância de depuração (porta 9222) encerrada. |
| 2026-10-16 | Pernas do mascote corrigidas (54 px como no original; viewBox 447x279; ícone do app regenerado). App **instalado** via NSIS silencioso em `%LOCALAPPDATA%AI Usage HUD` (por usuário) e **atalho criado na área de trabalho** + menu Iniciar. Claude reconectado com o caminho do exe instalado. Teste com o CLI: `claude -p` não executa a status line; o `claude` interativo (v2.1.98) está em primeiro uso (tema/login) e não foi concluído, pois o login é do usuário: **ainda sem dados reais**. |
| 2026-10-16 | Ícone do HUD trocado para o mascote do Claude Code (SVG recriado da imagem enviada; também ícone do app/tray; ver `docs/brand-assets.md`: marca da Anthropic, verificar diretrizes antes de tornar público). Interação alterada para **arrastar o ícone + clicar para abrir/fechar** as porcentagens (limiar de 4 px separa arrasto de clique). Painel agora se ajusta para não sair da tela e volta à posição original ao fechar. Claude **conectado de verdade** (backup `settings.json.ai-usage-hud.bak` criado). Nenhum dado real recebido ainda: o app desktop do Claude parece não executar a status line; precisa do CLI `claude`. Instaladores regenerados. |
| 2026-10-16 | Repositório **privado** criado e publicado: https://github.com/jroed23/ai-usage-hud (branch `main`, 2 commits). Link do tray apontado para ele. Sem release ainda. |
| 2026-10-16 | **Validação na tela** (captura + DevTools remoto): HUD abre no canto superior direito, chip do Claude e painel de hover renderizam, janela de Configurações abre. Bug encontrado e corrigido: `open_settings` era comando síncrono e travava a thread principal ao criar a janela (agora `async`). Estado conectado (métricas reais) ainda não validado: exige Connect, que altera `~/.claude/settings.json`. |
| 2026-10-16 | Escopo reduzido a **somente Claude**; demais providers adiados. Ambiente verificado: Node 24, pnpm, git, gh e WebView2 presentes; **Rust e MSVC Build Tools ausentes** (necessários para Tauri). |
