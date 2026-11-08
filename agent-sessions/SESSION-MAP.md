# Agent Setup & Session Map

## Agent Setup
- **Development Tool**: Google Antigravity Agentic IDE (macOS arm64) powered by Gemini 3.8 Flash (High reasoning capability).
- **Workflow & Environment**: Local project workspace using Node.js v26.7.0, Express.js REST + SSE stream, built-in SQLite persistence (`node:sqlite`), React 19, Vite, and Tailwind CSS.
- **Agent Capabilities Utilized**: Parallel workspace execution, continuous sub-process daemon monitoring, native Node test runner (`node:test`), and filesystem edits.

---

## Session Map

### 1. Initial Planning & Problem Decomposition
- **Location**: Step 1 to Step 15 of `session-transcript.jsonl`.
- **Focus**:
  - Analyzed the challenge definition and functional requirements.
  - Architected the dual-plane system:
    1. **Execution Plane**: Asynchronous background routing engine running with a 5–20 second delay distribution, exact matching on task required expertise against contributor skill tags, a 20% hanging request simulation edge case, and strict single-assignee constraint.
    2. **Control & Observability Plane**: Real-time operator dashboard via Server-Sent Events (SSE), immutable audit trail/timeline, and explicit intervention pathways (manual assign, cancel routing, recover & re-route, simulate contributor accept/decline).

### 2. Most Important Correction or Change of Direction
- **Location**: Step 40 to Step 55 of `session-transcript.jsonl` (Refining Race Condition Handling & Operator View Realism).
- **Key Insight & Pivot**:
  - *Initial approach*: When an operator intervened, the background timer was simply cleared and aborted silently.
  - *Correction/Realization*: In real-world distributed architectures, an operator can intervene while a background worker is already executing remotely. The outstanding request may still return seconds later!
  - *Implementation*: Rather than silently swallowing late responses, the engine detects that the task state changed, preserves the operator's decision, and logs an explicit `ROUTING_RESULT_DISCARDED` event in the audit trail. This makes race condition resolution visible and verifiable.
  - *Operational Uncertainty*: Rather than giving the operator an artificial cheat indicating "this request is programmed to hang", the UI presents authentic operational uncertainty: the operator sees elapsed time exceeding the standard 5–20s window without error signals, requiring human operational judgment to intervene.
  - *Server Restart Resilience*: Added `reconcileOnStartup()` so that restarting or refreshing the application preserves pending hanging requests and resumes interrupted background routing without data loss or orphan states.

### 3. Final Testing & Verification
- **Location**: Step 60 to Step 85 of `session-transcript.jsonl`.
- **Artifacts**: `server/tests/routing.test.mjs` and `server/tests/api.test.mjs`.
- **Verification Coverage**:
  - 17 automated tests verifying database seed integrity, normal matching within 5–20s, no-match failure handling, 20% hanging edge cases, operator intervention precedence, contributor acceptance/declines, recovery flows, and REST/SSE communication.

---

## Intentional Omissions & Trade-offs
1. **Sophisticated ML / Vector Recommendation Engine**:
   - Explicitly specified in the prompt: matching rules should remain clean and deterministic rather than building a heavy AI recommendation model. A direct skill-tag matching rule with load balancing and randomized selection was used.
2. **External Distributed Queue (Kafka / RabbitMQ / Redis)**:
   - For a self-contained assessment project, external message broker dependencies (e.g., Redis or Kafka) introduce setup friction. In-process timer jobs backed by persistent SQLite database state provide identical semantics, atomic state transitions, zero-dependency setup, and high portability.
3. **Multi-Tenant User Authentication**:
   - Left out to keep operator workflow exploration immediate with zero login gates. All operations represent the single operator role.

