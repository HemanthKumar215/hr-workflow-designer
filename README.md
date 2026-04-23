# HR Workflow Designer

> **Tredence Analytics – Full Stack Engineering Intern Case Study**

A production-quality HR Workflow Designer built with **React + Vite + TypeScript + React Flow + Tailwind CSS v4**.

HR admins can visually create, configure, and simulate internal workflows such as **onboarding**, **leave approval**, and **document verification** — all in the browser with no backend required.

---

## 🚀 Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Then open **http://localhost:5173**

---

## 🏗️ Architecture

### Folder Structure

```
src/
├── components/
│   ├── Canvas/
│   │   ├── WorkflowCanvas.tsx       # React Flow instance, drop/key handlers
│   │   ├── NodeSidebar.tsx          # Draggable node palette
│   │   └── CustomNodes/
│   │       ├── StartNode.tsx        # Green — workflow entry
│   │       ├── TaskNode.tsx         # Blue  — human task
│   │       ├── ApprovalNode.tsx     # Amber — approval step
│   │       ├── AutomatedStepNode.tsx# Purple— system action
│   │       └── EndNode.tsx          # Rose  — workflow end
│   ├── NodeForms/
│   │   ├── NodeFormPanel.tsx        # Right panel — renders correct form
│   │   ├── StartNodeForm.tsx
│   │   ├── TaskNodeForm.tsx
│   │   ├── ApprovalNodeForm.tsx
│   │   ├── AutomatedStepNodeForm.tsx# Fetches actions from mock API
│   │   └── EndNodeForm.tsx
│   └── Sandbox/
│       ├── WorkflowSimulator.tsx    # Bottom toolbar + drawer modal
│       └── ExecutionLog.tsx         # Animated timeline
├── hooks/
│   ├── useWorkflowState.ts          # Core nodes/edges state + CRUD
│   ├── useNodeValidation.ts         # Stateful validation wrapper
│   └── useAutomations.ts            # Fetch + cache automation actions
├── services/
│   ├── api.ts                       # Clean abstraction (swap mock → real)
│   └── mockApi.ts                   # In-memory mock with BFS ordering
├── types/
│   ├── workflow.types.ts            # Graph, SimulationResult, ValidationError
│   └── node.types.ts               # Discriminated unions for all 5 node types
└── utils/
    ├── workflowValidator.ts          # Cycle detection (DFS), isolation checks
    └── workflowSerializer.ts         # JSON export / file import
```

---

## ✅ Features Implemented

| Feature | Status |
|---|---|
| React Flow canvas with 5 custom node types | ✅ |
| Drag from sidebar → drop onto canvas | ✅ |
| Click node to place at random position | ✅ |
| Connect nodes with edges | ✅ |
| Select node → right panel form appears | ✅ |
| Delete key / trash button removes nodes | ✅ |
| Start Node Form (title + dynamic metadata KV pairs) | ✅ |
| Task Node Form (title, description, assignee, due date, custom fields) | ✅ |
| Approval Node Form (role dropdown, auto-approve threshold) | ✅ |
| Automated Step Form (action from mock API, dynamic param inputs) | ✅ |
| End Node Form (message textarea + summary toggle) | ✅ |
| Mock GET /automations API | ✅ |
| Mock POST /simulate API (BFS topological execution) | ✅ |
| Pre-flight validation before simulation | ✅ |
| Cycle detection (DFS) | ✅ |
| Isolated node detection | ✅ |
| Execution log with animated timeline | ✅ |
| JSON tab showing raw simulation result | ✅ |
| Export workflow as JSON file | ✅ |
| Import workflow from JSON file | ✅ |
| Clear canvas | ✅ |
| React Flow MiniMap + Controls | ✅ |
| Dark professional UI | ✅ |

---

## 🔌 Mock API

### `GET /automations`
Returns available automated actions. Simulated in `src/services/mockApi.ts`.

```json
[
  { "id": "send_email",    "label": "Send Email",              "params": ["to", "subject", "body"] },
  { "id": "generate_doc",  "label": "Generate Document",       "params": ["template", "recipient"] },
  { "id": "notify_slack",  "label": "Send Slack Notification", "params": ["channel", "message"] },
  { "id": "create_ticket", "label": "Create JIRA Ticket",      "params": ["project", "summary", "assignee"] },
  { "id": "update_hris",   "label": "Update HRIS Record",      "params": ["employee_id", "field", "value"] }
]
```

### `POST /simulate`
Accepts nodes + edges, performs BFS topological ordering, returns:
```json
{
  "status": "success",
  "steps": [
    { "nodeId": "start-1", "nodeType": "start", "nodeLabel": "Workflow Start", "status": "completed", "message": "...", "timestamp": "..." }
  ],
  "validationErrors": [],
  "executionTimeMs": 800
}
```

---

## 🎨 Design Decisions

### Dark Theme
Professional dark palette (`#0f1117` base) with color-coded nodes by type. Chosen for reduced eye strain during extended design sessions and to feel like a premium tool (Figma, Linear, etc.).

### Node Color Coding
- 🟢 **Green** — Start (safe, beginning)
- 🔵 **Blue** — Task (active work)
- 🟡 **Amber** — Approval (attention required)
- 🟣 **Purple** — Automated (system/machine)
- 🔴 **Rose** — End (terminal state)

### Discriminated Union Types
All node data is typed as a discriminated union on `type`. This means adding a new node type is just:
1. Add to `node.types.ts` union
2. Add a `CustomNode` component
3. Add a `NodeForm` component
4. Register in `WorkflowCanvas.tsx` `nodeTypes` map

### API Abstraction
`src/services/api.ts` only exports `fetchAutomations()` and `simulateWorkflow()`. The mock can be swapped for a real backend by changing two function bodies — no consumer changes needed.

### Validation Strategy
Two-phase validation:
1. **Pre-flight** (`validateWorkflow`) — runs before simulation, blocks hard errors
2. **Server-side** (mock `/simulate`) — can return runtime errors per-step

---

## ⚠️ Known Limitations

- No undo/redo (would add with `useHistoryState` + snapshot stack)
- No backend persistence (by design — case study scope)
- Automated Step params are free-text (production would validate per action schema)
- No authentication

---

## 🔮 What I'd Add With More Time

- **Undo/Redo** — snapshot history with Ctrl+Z support
- **Node templates** — save/load pre-configured node sets
- **Conditional edges** — branch logic (if/else routing)
- **Real backend** — FastAPI + PostgreSQL for persistence
- **Storybook** — isolated component development
- **Playwright E2E tests** — drag-and-drop and simulation flows

---

## 🛠️ Tech Stack

| Tool | Version | Purpose |
|---|---|---|
| React | 19 | UI framework |
| Vite | 6 | Build tool |
| TypeScript | 5 | Type safety |
| @xyflow/react | latest | Workflow canvas |
| Tailwind CSS | v4 | Utility styling |
| lucide-react | latest | Icons |
