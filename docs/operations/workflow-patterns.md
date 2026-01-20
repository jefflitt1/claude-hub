# Advanced AI Workflow Patterns

Source: Tomasz Tunguz research on AI workflows (2025-2026)

## The Architect/Implementer Pattern
Split AI coding into two sessions:
1. **Architect** - Generate PRD, create roadmap, user approves
2. **Implementer** - Test-first development, AI executes with structure

## Test-First AI Development
1. Generate requirements (ChatPRD or similar)
2. AI creates test cases BEFORE code
3. AI implements against tests

## Three Workflow Types
| Type | Best For |
|------|----------|
| **Deterministic** | Consistent processes (same steps every time) |
| **Deterministic + AI** | Most enterprise work (AI enhances, humans control) |
| **Fully Agentic** | Unpredictable inputs (support, security response) |

## Unified Meta-Tools > Fragmented Tools
Consolidating tools into unified interfaces:
- Reduces tokens 41%
- Improves success 8% (87% to 94%)
- Enables 30% cache hits
- Reduces tool calls 70%

## Parallelization Patterns
- Subagents for parallel research
- Different models "debate" approaches
- Break massive refactors into trackable units

## Trust & Verification
1. Default to AI search first
2. Consult traditional sources when questionable
3. Ask: "What am I missing from this summary?"
