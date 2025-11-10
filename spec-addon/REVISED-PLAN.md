# Cline Progressive Spec: Revised Implementation Plan

**Date:** 2025-11-10
**Version:** 2.0 (Revised after architecture exploration)
**Status:** Ready for Implementation

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Core Concept (Unchanged)](#core-concept-unchanged)
3. [Architecture Overview](#architecture-overview)
4. [Implementation Phases](#implementation-phases)
5. [Detailed Component Specifications](#detailed-component-specifications)
6. [Data Structures](#data-structures)
7. [gRPC Service Definitions](#grpc-service-definitions)
8. [Integration Points](#integration-points)
9. [User Experience Flows](#user-experience-flows)
10. [Storage Strategy](#storage-strategy)
11. [Testing Strategy](#testing-strategy)
12. [Timeline & Milestones](#timeline--milestones)
13. [Success Metrics](#success-metrics)

---

## Executive Summary

This revised plan maintains the core vision of "progressive formalization" but replaces the flawed MCP server approach with direct Cline service integration. Based on thorough codebase exploration, this plan provides concrete implementation details for building spec tracking as a first-class Cline feature.

### Key Changes from Original Plan:

| Original | Revised | Reason |
|----------|---------|--------|
| Phase 1: MCP Server POC | Phase 1: Core Service Integration | MCP servers cannot access conversation state or add UI |
| Message passing | gRPC with proto definitions | Cline uses gRPC for all extension ↔ webview communication |
| Semantic clustering (ML) | Heuristic-based triggers | Faster iteration, good enough for validation |
| SQLite storage | StateManager integration | Leverage Cline's existing state management |
| Gherkin-only | Multi-format specs | Different teams use different formats |

### Timeline:
- **Week 1-2**: Core service + storage (Backend foundation)
- **Week 3**: gRPC service + controller integration
- **Week 4**: UI components (Specs Panel)
- **Week 5**: Trigger system + automation
- **Week 6**: Polish + testing + documentation

---

## Core Concept (Unchanged)

The fundamental insight remains valid:

### The Problem: Vibe Coding → Complexity Hell

1. **Phase 1: Honeymoon** - AI generates code fast from loose descriptions
2. **Phase 2: Complexity Hell** - Bugs multiply, regressions appear, no source of truth
3. **Root Cause** - No formal specification, only implicit requirements in chat history

### The Solution: Progressive Formalization

Allow users to start with vibe coding, but **intelligently suggest formalization** when:
- Complexity increases (file size, cyclomatic complexity)
- Contradictions emerge (user corrects previous statements)
- Regressions occur (same file edited multiple times)
- User explicitly requests it

### The Magic: Gradual, Not Forced

- **Start**: 100% vibe mode (fast iteration)
- **Trigger**: System detects need for formalization
- **Suggest**: "Would you like to document requirements for this area?"
- **Formalize**: Extract specs from conversation, generate tests
- **Iterate**: Continue with specs as guard rails

---

## Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Cline Core (Existing)                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────────┐  │
│  │Controller│  │   Task   │  │ MessageStateHandler  │  │
│  └─────┬────┘  └─────┬────┘  └──────────┬───────────┘  │
└────────┼─────────────┼──────────────────┼──────────────┘
         │             │                  │
         │   ┌─────────▼──────────────────▼───┐
         │   │  NEW: SpecService             │
         │   │  ┌──────────────────────────┐ │
         └───┼─→│  SpecTracker             │ │
             │  │  - Track conversation    │ │
             │  │  - Monitor file changes  │ │
             │  │  - Detect triggers       │ │
             │  └──────────────────────────┘ │
             │  ┌──────────────────────────┐ │
             │  │  SpecGenerator           │ │
             │  │  - Extract requirements  │ │
             │  │  - Generate specs        │ │
             │  │  - Create tests          │ │
             │  └──────────────────────────┘ │
             │  ┌──────────────────────────┐ │
             │  │  SpecStorage             │ │
             │  │  - Persist specs         │ │
             │  │  - Load specs            │ │
             │  │  - Sync with StateManager│ │
             │  └──────────────────────────┘ │
             └─────────────┬─────────────────┘
                           │ gRPC
         ┌─────────────────▼─────────────────┐
         │      Webview (React)              │
         │  ┌────────────────────────────┐   │
         │  │  NEW: SpecsView            │   │
         │  │  - Display specs           │   │
         │  │  - Edit/create specs       │   │
         │  │  - Show triggers           │   │
         │  │  - Generate tests          │   │
         │  └────────────────────────────┘   │
         │  ┌────────────────────────────┐   │
         │  │  ChatView (Modified)       │   │
         │  │  + Trigger notifications   │   │
         │  │  + Quick actions           │   │
         │  └────────────────────────────┘   │
         └────────────────────────────────────┘
```

### Component Relationships

```
Controller
├── Hooks into Task lifecycle
│   ├── onTaskInit → SpecTracker.startTracking()
│   ├── onToolExecute → SpecTracker.recordAction()
│   └── onTaskComplete → SpecTracker.suggestExtraction()
└── Exposes gRPC services
    ├── GetSpecs
    ├── AddSpec
    ├── UpdateSpec
    ├── GenerateGherkin
    └── SubscribeToTriggers (streaming)

SpecTracker
├── Listens to MessageStateHandler
├── Monitors file changes via ToolExecutor
├── Calculates triggers
└── Emits events via gRPC stream

SpecsView (React)
├── Subscribes to trigger stream
├── Displays notifications
├── Allows manual spec creation
└── Shows spec status per file
```

---

## Implementation Phases

### Phase 1: Foundation (Week 1-2)

**Goal:** Core services working, specs can be created and stored

**Deliverables:**
- [ ] `SpecService` class with basic CRUD operations
- [ ] `SpecStorage` integration with StateManager
- [ ] Data models (Spec, Trigger, Requirement)
- [ ] Basic unit tests

**Files to create:**
```
src/services/specs/
├── SpecService.ts           # Main service class
├── types.ts                 # Type definitions
├── SpecStorage.ts           # Storage layer
└── __tests__/
    └── SpecService.test.ts
```

**Acceptance criteria:**
- Can create a spec programmatically
- Spec persists across extension reload
- Can retrieve specs by ID or file path
- State syncs with StateManager

---

### Phase 2: gRPC Integration (Week 3)

**Goal:** Extension backend can communicate with webview

**Deliverables:**
- [ ] Proto definitions for spec services
- [ ] gRPC service implementation
- [ ] Controller methods for spec operations
- [ ] Message handlers

**Files to create:**
```
proto/specs/
└── specs.proto              # gRPC service definition

src/core/controller/specs/
├── getSpecs.ts
├── addSpec.ts
├── updateSpec.ts
├── deleteSpec.ts
├── generateGherkin.ts
└── subscribeToTriggers.ts
```

**Acceptance criteria:**
- Webview can call GetSpecs and receive response
- Can add spec from webview
- Subscription stream works (can send trigger events)

---

### Phase 3: UI Components (Week 4)

**Goal:** Users can view and manage specs in the UI

**Deliverables:**
- [ ] SpecsView panel (main specs UI)
- [ ] SpecItem component (individual spec display)
- [ ] SpecEditor component (create/edit specs)
- [ ] TriggerBanner component (show suggestions)
- [ ] Navigation button in toolbar

**Files to create:**
```
webview-ui/src/components/specs/
├── SpecsView.tsx            # Main panel
├── SpecItem.tsx             # Individual spec
├── SpecEditor.tsx           # Edit form
├── TriggerBanner.tsx        # Notification banner
└── SpecStatusBadge.tsx      # Status indicator

webview-ui/src/hooks/
└── useSpecs.ts              # React hook for specs

webview-ui/src/context/
└── ExtensionStateContext.tsx  # Add specs state
```

**Acceptance criteria:**
- Specs panel visible via toolbar button
- Can view list of specs
- Can create new spec manually
- Can edit existing spec
- Can delete spec

---

### Phase 4: Tracker Integration (Week 5, Part 1)

**Goal:** System tracks conversations and file changes

**Deliverables:**
- [ ] SpecTracker class
- [ ] Integration with MessageStateHandler
- [ ] Integration with ToolExecutor (file changes)
- [ ] Conversation analysis (keyword-based)

**Files to create:**
```
src/services/specs/
├── SpecTracker.ts           # Main tracking logic
├── ConversationAnalyzer.ts  # Extract requirements
└── __tests__/
    └── SpecTracker.test.ts
```

**Acceptance criteria:**
- Tracker receives every message in conversation
- Tracker knows when files are modified
- Can extract basic requirements from keywords
- Can associate requirements with files

---

### Phase 5: Trigger System (Week 5, Part 2)

**Goal:** System detects when to suggest spec formalization

**Deliverables:**
- [ ] TriggerDetector class
- [ ] Heuristic-based triggers (complexity, frequency, keywords)
- [ ] Trigger notification in UI
- [ ] User can accept/dismiss suggestions

**Files to create:**
```
src/services/specs/triggers/
├── TriggerDetector.ts       # Main trigger logic
├── ComplexityTrigger.ts     # File complexity analysis
├── FrequencyTrigger.ts      # Modification frequency
├── KeywordTrigger.ts        # Bug/issue mentions
└── __tests__/
    └── TriggerDetector.test.ts
```

**Acceptance criteria:**
- Trigger fires when file > 300 lines
- Trigger fires when same file edited 3+ times
- Trigger fires when "bug" mentioned 3+ times
- User sees notification in chat
- User can click "Create spec" or "Dismiss"

---

### Phase 6: Spec Generation (Week 6, Part 1)

**Goal:** AI can generate specs from conversation

**Deliverables:**
- [ ] SpecGenerator class
- [ ] Conversation → Requirements extraction
- [ ] Requirements → Spec format (multi-format support)
- [ ] Integration with LLM

**Files to create:**
```
src/services/specs/
├── SpecGenerator.ts         # Main generation logic
├── formats/
│   ├── GherkinFormatter.ts  # Gherkin output
│   ├── UserStoryFormatter.ts # User story output
│   └── AcceptanceCriteriaFormatter.ts
└── __tests__/
    └── SpecGenerator.test.ts
```

**Acceptance criteria:**
- Can extract requirements from conversation history
- Can generate Gherkin format
- Can generate user story format
- Can generate acceptance criteria list
- User can choose format in settings

---

### Phase 7: Test Generation (Week 6, Part 2)

**Goal:** Can generate tests from specs

**Deliverables:**
- [ ] TestGenerator class
- [ ] Test framework detection
- [ ] Framework-specific test generation
- [ ] Integration with TerminalManager (run tests)

**Files to create:**
```
src/services/specs/
├── TestGenerator.ts         # Main generation logic
├── frameworks/
│   ├── JestTestGenerator.ts
│   ├── PytestTestGenerator.ts
│   └── GoTestGenerator.ts
└── __tests__/
    └── TestGenerator.test.ts
```

**Acceptance criteria:**
- Detects Jest/Vitest/pytest/Go test
- Generates appropriate test file
- Places test in correct directory
- User can run tests via terminal

---

## Detailed Component Specifications

### 1. SpecService

**Purpose:** Main service managing all spec operations

**Location:** `src/services/specs/SpecService.ts`

**Interface:**
```typescript
export class SpecService {
  private storage: SpecStorage;
  private tracker: SpecTracker;
  private generator: SpecGenerator;
  private testGenerator: TestGenerator;

  // CRUD operations
  async getSpecs(filter?: SpecFilter): Promise<Spec[]>;
  async getSpec(id: string): Promise<Spec | null>;
  async addSpec(spec: Omit<Spec, 'id'>): Promise<Spec>;
  async updateSpec(id: string, updates: Partial<Spec>): Promise<Spec>;
  async deleteSpec(id: string): Promise<void>;

  // Tracking
  startTracking(taskId: string): void;
  stopTracking(taskId: string): void;
  recordMessage(message: Message): void;
  recordFileChange(file: string, change: FileChange): void;

  // Generation
  async extractRequirements(conversationId: string): Promise<Requirement[]>;
  async generateSpec(requirements: Requirement[], format: SpecFormat): Promise<string>;
  async generateTests(specId: string): Promise<GeneratedTest>;

  // Triggers
  async detectTriggers(context: TaskContext): Promise<Trigger[]>;
  onTrigger(callback: (trigger: Trigger) => void): Disposable;
}
```

**Dependencies:**
- StateManager (for persistence)
- MessageStateHandler (for conversation access)
- LLM API (for generation)

**Error handling:**
- Wrap all operations in try-catch
- Log errors to output channel
- Show user-friendly errors in UI
- Graceful degradation if LLM unavailable

---

### 2. SpecStorage

**Purpose:** Persist specs to disk via StateManager

**Location:** `src/services/specs/SpecStorage.ts`

**Interface:**
```typescript
export class SpecStorage {
  private stateManager: StateManager;

  async loadSpecs(workspace?: string): Promise<Spec[]>;
  async saveSpec(spec: Spec): Promise<void>;
  async updateSpec(id: string, updates: Partial<Spec>): Promise<void>;
  async deleteSpec(id: string): Promise<void>;
  async searchSpecs(query: string): Promise<Spec[]>;
  async getSpecsByFile(filePath: string): Promise<Spec[]>;
}
```

**Storage schema:**
```json
{
  "cline.specs": {
    "global": [
      {
        "id": "spec-123",
        "title": "Authentication Requirements",
        "content": "...",
        "format": "gherkin",
        "files": ["src/auth/login.ts"],
        "createdAt": "2025-11-10T10:00:00Z",
        "updatedAt": "2025-11-10T11:00:00Z",
        "status": "active",
        "tags": ["auth", "security"]
      }
    ],
    "workspace-abc": [...]
  }
}
```

**File system backup:**
```
[globalStoragePath]/
└── specs/
    ├── global.json          # Global specs
    └── [workspaceId]/
        └── specs.json        # Workspace specs
```

---

### 3. SpecTracker

**Purpose:** Monitor conversations and code changes

**Location:** `src/services/specs/SpecTracker.ts`

**Interface:**
```typescript
export class SpecTracker {
  private messageHistory: Map<string, Message[]>;
  private fileChanges: Map<string, FileChange[]>;
  private requirements: Map<string, Requirement[]>;

  // Lifecycle
  startTracking(taskId: string): void;
  stopTracking(taskId: string): void;

  // Recording
  recordMessage(message: Message): void;
  recordFileChange(file: string, change: FileChange): void;

  // Analysis
  analyzeConversation(taskId: string): ConversationAnalysis;
  extractRequirements(messages: Message[]): Requirement[];
  detectContradictions(messages: Message[]): Contradiction[];

  // Queries
  getRequirementsByFile(file: string): Requirement[];
  getConversationContext(file: string): Message[];
  getFileModificationCount(file: string): number;
}
```

**How it works:**

1. **Hook into MessageStateHandler:**
   ```typescript
   // In Controller.initTask()
   messageStateHandler.onMessage((message) => {
     specService.recordMessage(message);
   });
   ```

2. **Hook into ToolExecutor:**
   ```typescript
   // In Task.executeTool()
   if (tool.name === 'edit' || tool.name === 'write') {
     specService.recordFileChange(tool.params.file, {
       type: 'edit',
       timestamp: Date.now()
     });
   }
   ```

3. **Extract requirements:**
   ```typescript
   function extractRequirements(messages: Message[]): Requirement[] {
     const requirements: Requirement[] = [];

     for (const msg of messages) {
       // Look for requirement indicators
       const matches = msg.content.match(/(should|must|needs to|when.*then|given.*expect)/gi);

       if (matches) {
         requirements.push({
           text: extractRequirementText(msg.content),
           source: 'conversation',
           messageId: msg.id,
           confidence: calculateConfidence(matches.length)
         });
       }
     }

     return requirements;
   }
   ```

---

### 4. TriggerDetector

**Purpose:** Detect when to suggest spec formalization

**Location:** `src/services/specs/triggers/TriggerDetector.ts`

**Interface:**
```typescript
export class TriggerDetector {
  private config: TriggerConfig;

  detectTriggers(context: TaskContext): Trigger[];

  // Individual trigger checks
  checkComplexity(file: string): Trigger | null;
  checkFrequency(file: string): Trigger | null;
  checkKeywords(messages: Message[]): Trigger | null;
  checkContradictions(messages: Message[]): Trigger | null;
}

export interface TriggerConfig {
  // File complexity
  maxLinesPerFile: number;           // Default: 300
  maxCyclomaticComplexity: number;   // Default: 10

  // Modification frequency
  maxModificationsPerTask: number;   // Default: 3

  // Keyword detection
  bugKeywords: string[];             // ['bug', 'issue', 'problem', 'broken']
  bugKeywordThreshold: number;       // Default: 3

  // Contradiction detection
  contradictionKeywords: string[];   // ['actually', 'wait', 'no', 'correction']
}
```

**Trigger types:**

```typescript
export interface Trigger {
  id: string;
  type: TriggerType;
  severity: 'info' | 'warning' | 'error';
  message: string;
  context: {
    files?: string[];
    messages?: string[];
    metrics?: Record<string, number>;
  };
  suggestedAction: {
    type: 'extract_spec' | 'review_requirements' | 'add_tests';
    description: string;
  };
  timestamp: number;
}

export type TriggerType =
  | 'complexity'       // File too complex
  | 'frequency'        // File modified too often
  | 'keywords'         // Too many bug mentions
  | 'contradiction'    // User corrected previous statement
  | 'manual';          // User explicitly requested
```

**Example trigger detection:**

```typescript
function checkComplexity(file: string): Trigger | null {
  const content = fs.readFileSync(file, 'utf-8');
  const lines = content.split('\n').length;

  if (lines > this.config.maxLinesPerFile) {
    return {
      type: 'complexity',
      severity: 'warning',
      message: `${file} has ${lines} lines (threshold: ${this.config.maxLinesPerFile})`,
      context: {
        files: [file],
        metrics: { lines, threshold: this.config.maxLinesPerFile }
      },
      suggestedAction: {
        type: 'extract_spec',
        description: 'Consider documenting the requirements for this complex file'
      },
      timestamp: Date.now()
    };
  }

  return null;
}
```

---

### 5. SpecGenerator

**Purpose:** Generate specs from requirements

**Location:** `src/services/specs/SpecGenerator.ts`

**Interface:**
```typescript
export class SpecGenerator {
  private llmProvider: LLMProvider;
  private formatters: Map<SpecFormat, SpecFormatter>;

  async generateSpec(
    requirements: Requirement[],
    format: SpecFormat,
    context?: GenerationContext
  ): Promise<string>;

  async improveSpec(
    existingSpec: string,
    feedback: string
  ): Promise<string>;
}

export interface GenerationContext {
  conversationHistory?: Message[];
  relatedFiles?: string[];
  existingSpecs?: Spec[];
  examples?: Example[];
}
```

**Formats:**

```typescript
export type SpecFormat =
  | 'gherkin'              // Given-When-Then scenarios
  | 'user-story'           // As a X, I want Y, so that Z
  | 'acceptance-criteria'  // Checklist of criteria
  | 'free-form';           // Markdown doc

export interface SpecFormatter {
  format(requirements: Requirement[], context?: GenerationContext): string;
}
```

**Example: Gherkin formatter**

```typescript
class GherkinFormatter implements SpecFormatter {
  format(requirements: Requirement[]): string {
    const feature = this.extractFeature(requirements);
    const scenarios = this.groupIntoScenarios(requirements);

    return `
Feature: ${feature.name}
  ${feature.description}

${scenarios.map(s => this.formatScenario(s)).join('\n\n')}
    `.trim();
  }

  private formatScenario(scenario: Scenario): string {
    return `
  Scenario: ${scenario.name}
    Given ${scenario.given}
    When ${scenario.when}
    Then ${scenario.then}
    `.trim();
  }
}
```

**LLM prompt for spec generation:**

```typescript
const prompt = `
You are helping extract formal specifications from a conversation.

Context:
- User and AI discussed implementing a feature
- The conversation is informal and may contain vague descriptions
- Your job is to create a clear, testable specification

Conversation:
${conversationHistory.map(m => `${m.role}: ${m.content}`).join('\n')}

Requirements extracted:
${requirements.map((r, i) => `${i + 1}. ${r.text}`).join('\n')}

Task:
Generate a ${format} specification that captures these requirements.

Guidelines:
- Be specific and testable
- Include edge cases if mentioned
- Use concrete examples
- Avoid ambiguous language
`;
```

---

### 6. TestGenerator

**Purpose:** Generate tests from specs

**Location:** `src/services/specs/TestGenerator.ts`

**Interface:**
```typescript
export class TestGenerator {
  async detectFramework(workspace: string): Promise<TestFramework>;

  async generateTests(
    spec: Spec,
    framework: TestFramework
  ): Promise<GeneratedTest>;

  async suggestTestLocation(
    sourceFile: string,
    framework: TestFramework
  ): Promise<string>;
}

export interface GeneratedTest {
  framework: TestFramework;
  filePath: string;
  content: string;
  runCommand: string;
}

export type TestFramework =
  | 'jest'
  | 'vitest'
  | 'mocha'
  | 'pytest'
  | 'go'
  | 'junit';
```

**Framework detection:**

```typescript
async function detectFramework(workspace: string): Promise<TestFramework> {
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(workspace, 'package.json'), 'utf-8')
  );

  const deps = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies
  };

  if (deps['jest']) return 'jest';
  if (deps['vitest']) return 'vitest';
  if (deps['mocha']) return 'mocha';

  // Check for Python
  if (fs.existsSync(path.join(workspace, 'requirements.txt'))) {
    const reqs = fs.readFileSync(path.join(workspace, 'requirements.txt'), 'utf-8');
    if (reqs.includes('pytest')) return 'pytest';
  }

  // Check for Go
  if (fs.existsSync(path.join(workspace, 'go.mod'))) {
    return 'go';
  }

  // Default to jest for JS projects
  return 'jest';
}
```

**Test generation prompt:**

```typescript
const prompt = `
Generate ${framework} tests for the following specification:

${spec.content}

Guidelines:
- Use best practices for ${framework}
- Include setup/teardown if needed
- Test both happy path and edge cases
- Use clear test descriptions
- Add appropriate assertions

Output only the test code, no explanations.
`;
```

---

## Data Structures

### Core Types

```typescript
// src/services/specs/types.ts

export interface Spec {
  id: string;
  title: string;
  content: string;
  format: SpecFormat;
  status: SpecStatus;
  files: string[];           // Associated source files
  tests?: TestInfo[];        // Associated tests
  tags: string[];
  metadata: {
    createdAt: number;
    updatedAt: number;
    createdBy: 'user' | 'ai';
    source?: string;         // e.g., "task-123"
    version: number;
  };
}

export type SpecFormat = 'gherkin' | 'user-story' | 'acceptance-criteria' | 'free-form';
export type SpecStatus = 'draft' | 'active' | 'archived' | 'implemented';

export interface Requirement {
  id: string;
  text: string;
  source: 'conversation' | 'user' | 'extracted';
  messageId?: string;        // Link to conversation message
  confidence: number;        // 0-1 (for AI-extracted)
  files: string[];           // Related files
}

export interface Trigger {
  id: string;
  type: TriggerType;
  severity: 'info' | 'warning' | 'error';
  message: string;
  context: TriggerContext;
  suggestedAction: SuggestedAction;
  timestamp: number;
  dismissed?: boolean;
}

export interface TriggerContext {
  files?: string[];
  messages?: string[];
  metrics?: Record<string, number>;
  taskId?: string;
}

export interface SuggestedAction {
  type: 'extract_spec' | 'review_requirements' | 'add_tests' | 'refactor';
  description: string;
  autoApply?: boolean;
}

export interface TestInfo {
  filePath: string;
  framework: TestFramework;
  status: 'passing' | 'failing' | 'not-run';
  lastRun?: number;
}

export interface ConversationAnalysis {
  requirements: Requirement[];
  contradictions: Contradiction[];
  fileReferences: Map<string, number>;  // file -> mention count
  complexity: number;                    // 0-1 score
}

export interface Contradiction {
  messageIds: [string, string];  // [original, contradiction]
  description: string;
  severity: 'minor' | 'major';
}
```

---

## gRPC Service Definitions

### Proto Definition

**File:** `proto/specs/specs.proto`

```protobuf
syntax = "proto3";

package specs;

service SpecService {
  // CRUD operations
  rpc GetSpecs(GetSpecsRequest) returns (GetSpecsResponse);
  rpc GetSpec(GetSpecRequest) returns (GetSpecResponse);
  rpc AddSpec(AddSpecRequest) returns (AddSpecResponse);
  rpc UpdateSpec(UpdateSpecRequest) returns (UpdateSpecResponse);
  rpc DeleteSpec(DeleteSpecRequest) returns (DeleteSpecResponse);

  // Generation
  rpc ExtractRequirements(ExtractRequirementsRequest) returns (ExtractRequirementsResponse);
  rpc GenerateSpec(GenerateSpecRequest) returns (stream GenerateSpecChunk);
  rpc GenerateTests(GenerateTestsRequest) returns (stream GenerateTestsChunk);

  // Triggers
  rpc SubscribeToTriggers(Empty) returns (stream TriggerEvent);
  rpc DismissTrigger(DismissTriggerRequest) returns (Empty);

  // Analysis
  rpc AnalyzeConversation(AnalyzeConversationRequest) returns (AnalyzeConversationResponse);
}

message Spec {
  string id = 1;
  string title = 2;
  string content = 3;
  string format = 4;
  string status = 5;
  repeated string files = 6;
  repeated TestInfo tests = 7;
  repeated string tags = 8;
  SpecMetadata metadata = 9;
}

message SpecMetadata {
  int64 created_at = 1;
  int64 updated_at = 2;
  string created_by = 3;
  string source = 4;
  int32 version = 5;
}

message TestInfo {
  string file_path = 1;
  string framework = 2;
  string status = 3;
  int64 last_run = 4;
}

message GetSpecsRequest {
  optional string workspace = 1;
  optional string filter = 2;
}

message GetSpecsResponse {
  repeated Spec specs = 1;
}

message AddSpecRequest {
  Spec spec = 1;
}

message AddSpecResponse {
  Spec spec = 1;
}

message GenerateSpecRequest {
  repeated string message_ids = 1;  // Messages to analyze
  string format = 2;                // gherkin, user-story, etc.
}

message GenerateSpecChunk {
  string content = 1;
  bool is_complete = 2;
}

message TriggerEvent {
  string id = 1;
  string type = 2;
  string severity = 3;
  string message = 4;
  TriggerContext context = 5;
  SuggestedAction suggested_action = 6;
  int64 timestamp = 7;
}

message TriggerContext {
  repeated string files = 1;
  repeated string messages = 2;
  map<string, double> metrics = 3;
}

message SuggestedAction {
  string type = 1;
  string description = 2;
}

message Empty {}
```

---

## Integration Points

### 1. Controller Integration

**File:** `src/core/controller/index.ts`

**Hook points:**

```typescript
// In Controller class

async initTask(task?: string, images?: string[], mode?: Mode) {
  // ... existing code ...

  // NEW: Initialize spec tracking for this task
  this.specService.startTracking(this.task.taskId);

  this.task.on('message', (msg) => {
    this.specService.recordMessage(msg);
  });

  this.task.on('tool_executed', (tool, result) => {
    if (['edit', 'write', 'notebook_edit'].includes(tool.name)) {
      this.specService.recordFileChange(tool.params.file_path, {
        type: tool.name,
        timestamp: Date.now()
      });
    }
  });

  // ... existing code ...
}

async clearTask() {
  if (this.task) {
    // NEW: Stop tracking and check for triggers
    const triggers = await this.specService.detectTriggers({
      taskId: this.task.taskId,
      modifiedFiles: this.task.modifiedFiles,
      conversation: this.task.messageHistory
    });

    if (triggers.length > 0) {
      await this.suggestSpecFormalization(triggers);
    }

    this.specService.stopTracking(this.task.taskId);
  }

  // ... existing code ...
}

private async suggestSpecFormalization(triggers: Trigger[]) {
  // Send triggers to webview
  await this.postMessageToWebview({
    type: 'spec_triggers',
    triggers
  });

  // Wait for user response (or timeout after 30s)
  const response = await this.waitForWebviewResponse('spec_trigger_response', 30000);

  if (response?.action === 'create_spec') {
    const requirements = await this.specService.extractRequirements(this.task!.taskId);
    const spec = await this.specService.generateSpec(requirements, response.format);

    await this.postMessageToWebview({
      type: 'spec_generated',
      spec
    });
  }
}
```

### 2. Task Integration

**File:** `src/core/task/index.ts`

**Emit events:**

```typescript
// In Task class

async executeTool(tool: Tool) {
  // ... existing code ...

  const result = await this.toolExecutor.execute(tool);

  // NEW: Emit event for spec tracking
  this.emit('tool_executed', tool, result);

  return result;
}

async addMessage(message: Message) {
  // ... existing code ...

  this.messageStateHandler.addMessage(message);

  // NEW: Emit event for spec tracking
  this.emit('message', message);

  // ... existing code ...
}
```

### 3. StateManager Integration

**File:** `src/core/storage/StateManager.ts`

**Add spec state:**

```typescript
// In StateManager class

async loadState(): Promise<void> {
  // ... existing code ...

  // NEW: Load specs
  const specsJson = await this.globalState.get('cline.specs');
  if (specsJson) {
    this.state.specs = JSON.parse(specsJson);
  }

  // ... existing code ...
}

async setState(updates: Partial<GlobalState>): Promise<void> {
  // ... existing code ...

  // NEW: Save specs
  if (updates.specs !== undefined) {
    await this.globalState.update('cline.specs', JSON.stringify(updates.specs));
  }

  // ... existing code ...
}
```

---

## User Experience Flows

### Flow 1: Manual Spec Creation

```
1. User clicks "Specs" button in toolbar
2. SpecsView opens (similar to Settings view)
3. User clicks "New Spec" button
4. SpecEditor modal opens
5. User fills in:
   - Title
   - Description
   - Format (dropdown: Gherkin, User Story, etc.)
   - Associated files (file picker)
   - Tags
6. User clicks "Save"
7. Spec appears in SpecsView list
8. gRPC: addSpec() called
9. Backend saves to StateManager
10. Confirmation shown
```

### Flow 2: Triggered Spec Suggestion

```
1. User: "Fix the login bug"
2. AI: [starts fixing]
3. AI: [modifies login.ts for 3rd time]
4. SpecTracker detects: frequency trigger
5. TriggerDetector creates trigger event
6. gRPC: stream emits TriggerEvent
7. Webview receives event
8. TriggerBanner appears in ChatView:
   "This file has been modified 3 times. Would you like to document its requirements?"
   [Create Spec] [Dismiss]
9a. User clicks [Create Spec]:
    - SpecEditor opens with pre-filled requirements
    - User reviews/edits
    - Clicks Save
10a. Spec created, trigger dismissed

9b. User clicks [Dismiss]:
    - Trigger dismissed
    - Banner disappears
```

### Flow 3: Spec Extraction from Conversation

```
1. User: "Extract specs from our login discussion"
2. AI: "I'll analyze the conversation..."
3. gRPC: ExtractRequirements() called
4. Backend:
   - Finds messages mentioning "login"
   - Extracts requirements using keywords
   - Groups by feature
5. AI: "I found 5 requirements:
   1. User must enter email and password
   2. Password must be at least 8 characters
   3. Show error on invalid credentials
   4. Redirect to dashboard on success
   5. Support 'Remember me' checkbox

   Would you like me to create a spec? [Yes] [Edit first] [No]"
6. User: [Yes]
7. AI: "Which format? [Gherkin] [User Story] [Acceptance Criteria]"
8. User: [Gherkin]
9. gRPC: GenerateSpec() stream
10. Backend: Calls LLM with prompt
11. Stream chunks of Gherkin back to webview
12. Webview shows streaming result
13. When complete, opens SpecEditor with generated content
14. User reviews, edits if needed, saves
15. Spec created
```

### Flow 4: Test Generation

```
1. User opens spec in SpecsView
2. Clicks "Generate Tests" button
3. gRPC: GenerateTests() stream
4. Backend:
   - Detects test framework (Jest)
   - Generates test file content
   - Suggests file location: src/auth/__tests__/login.test.ts
5. Webview shows preview:
   "I'll create: src/auth/__tests__/login.test.ts

   [Preview of test code]

   [Create File] [Change Location] [Cancel]"
6. User: [Create File]
7. Backend writes test file
8. Webview shows:
   "Test created! Run with: npm test
   [Run Tests] [Close]"
9. User: [Run Tests]
10. Terminal executes: npm test
11. Results shown in terminal
```

### Flow 5: Post-Task Spec Suggestion

```
1. User: "Done with this task"
2. AI: [completes task]
3. Controller.clearTask() called
4. SpecService.detectTriggers() runs
5. Finds: Modified 5 files, 0 specs exist
6. Creates trigger: "Document changes?"
7. AI: "Task complete! I modified these areas:
   - Authentication (login.ts, auth.ts)
   - User profile (profile.ts)

   Would you like to document the requirements? [Yes] [No]"
8. User: [Yes]
9. AI extracts specs for each area
10. Shows in SpecsView
11. User reviews and saves
```

---

## Storage Strategy

### Location

```
[globalStoragePath]/
├── specs/
│   ├── global.json              # User-created global specs
│   └── workspaces/
│       └── [workspaceId]/
│           ├── specs.json        # Workspace specs
│           └── extracted/        # Auto-extracted specs
│               ├── task-123.json
│               └── task-124.json
```

### Global vs Workspace Specs

**Global specs:**
- Created by user manually
- Apply across all workspaces
- Example: "All passwords must be hashed with bcrypt"

**Workspace specs:**
- Specific to one codebase
- Extracted from conversations about that codebase
- Example: "Login redirects to /dashboard"

### StateManager Schema

```typescript
interface GlobalState {
  // ... existing fields ...

  specs: {
    global: Spec[];
    workspaces: {
      [workspaceId: string]: {
        specs: Spec[];
        triggers: Trigger[];
        settings: SpecSettings;
      };
    };
  };
}

interface SpecSettings {
  enabled: boolean;
  autoDetectTriggers: boolean;
  triggerConfig: TriggerConfig;
  defaultFormat: SpecFormat;
  storageMode: 'local' | 'repo';
  specDirectory: string;  // If storageMode === 'repo'
}
```

### Sync Strategy

1. **On extension activate:**
   - Load specs from StateManager
   - Initialize SpecService

2. **On spec create/update/delete:**
   - Update in-memory cache
   - Save to StateManager (async)
   - Broadcast to webview

3. **On workspace change:**
   - Load workspace-specific specs
   - Unload previous workspace specs

---

## Testing Strategy

### Unit Tests

**Test files to create:**

```
src/services/specs/__tests__/
├── SpecService.test.ts
├── SpecStorage.test.ts
├── SpecTracker.test.ts
├── SpecGenerator.test.ts
├── TestGenerator.test.ts
└── TriggerDetector.test.ts
```

**Key test scenarios:**

**SpecService:**
- ✓ Can create spec
- ✓ Can update spec
- ✓ Can delete spec
- ✓ Can retrieve specs by file
- ✓ Can search specs

**SpecTracker:**
- ✓ Records messages correctly
- ✓ Records file changes
- ✓ Extracts requirements from keywords
- ✓ Associates requirements with files
- ✓ Detects file modification count

**TriggerDetector:**
- ✓ Fires on file > 300 lines
- ✓ Fires on 3+ modifications
- ✓ Fires on 3+ bug keywords
- ✓ Fires on contradiction keywords
- ✓ Doesn't fire false positives

**SpecGenerator:**
- ✓ Generates Gherkin format
- ✓ Generates user story format
- ✓ Generates acceptance criteria
- ✓ Handles empty requirements
- ✓ Includes examples from conversation

**TestGenerator:**
- ✓ Detects Jest framework
- ✓ Detects pytest framework
- ✓ Generates correct test structure
- ✓ Suggests correct test location
- ✓ Provides run command

### Integration Tests

**Test scenarios:**

1. **End-to-end spec creation:**
   - Start task
   - Send messages
   - Trigger spec suggestion
   - Accept suggestion
   - Verify spec created
   - Verify spec persisted

2. **Trigger detection:**
   - Modify file 3 times
   - Verify trigger fires
   - Dismiss trigger
   - Verify not shown again

3. **Spec generation:**
   - Create conversation with requirements
   - Extract requirements
   - Generate spec
   - Verify format correct
   - Verify content matches requirements

4. **Test generation:**
   - Create spec
   - Generate tests
   - Verify test file created
   - Verify test runs successfully

### Manual Testing Checklist

- [ ] Specs panel opens from toolbar
- [ ] Can create spec manually
- [ ] Can edit spec
- [ ] Can delete spec
- [ ] Trigger appears after 3 file modifications
- [ ] Can accept trigger and create spec
- [ ] Can dismiss trigger
- [ ] Spec extraction works from conversation
- [ ] Gherkin generation produces valid syntax
- [ ] Test generation creates runnable tests
- [ ] Specs persist across extension reload
- [ ] Workspace-specific specs isolated correctly

---

## Timeline & Milestones

### Week 1: Foundation

**Monday-Tuesday: Data models & storage**
- [ ] Define types in `types.ts`
- [ ] Implement SpecStorage
- [ ] Unit tests for storage
- [ ] Integration with StateManager

**Wednesday-Thursday: SpecService**
- [ ] Implement CRUD operations
- [ ] Unit tests
- [ ] Error handling

**Friday: Review & adjust**
- [ ] Code review
- [ ] Fix issues
- [ ] Update documentation

**Deliverable:** Can create/read/update/delete specs programmatically

---

### Week 2: Tracking & Analysis

**Monday-Tuesday: SpecTracker**
- [ ] Implement tracking logic
- [ ] Message recording
- [ ] File change recording
- [ ] Unit tests

**Wednesday-Thursday: ConversationAnalyzer**
- [ ] Keyword-based extraction
- [ ] Requirement grouping
- [ ] File association
- [ ] Unit tests

**Friday: Integration**
- [ ] Integrate with MessageStateHandler
- [ ] Integrate with Task
- [ ] Test end-to-end

**Deliverable:** System tracks conversations and extracts basic requirements

---

### Week 3: gRPC & Backend Services

**Monday-Tuesday: Proto definitions**
- [ ] Write specs.proto
- [ ] Generate TypeScript types
- [ ] Define all RPC methods

**Wednesday-Thursday: gRPC handlers**
- [ ] Implement GetSpecs
- [ ] Implement AddSpec
- [ ] Implement UpdateSpec
- [ ] Implement DeleteSpec
- [ ] Implement SubscribeToTriggers

**Friday: Controller integration**
- [ ] Add spec methods to Controller
- [ ] Test gRPC communication
- [ ] Error handling

**Deliverable:** Backend and frontend can communicate via gRPC

---

### Week 4: UI Components

**Monday-Tuesday: SpecsView**
- [ ] Main panel component
- [ ] Spec list display
- [ ] Navigation integration
- [ ] Styling

**Wednesday: SpecItem & SpecEditor**
- [ ] Individual spec component
- [ ] Editor modal
- [ ] Form validation
- [ ] Save/cancel logic

**Thursday: TriggerBanner**
- [ ] Notification component
- [ ] Action buttons
- [ ] Dismiss logic
- [ ] Styling

**Friday: Polish & test**
- [ ] UI polish
- [ ] Responsive design
- [ ] Manual testing
- [ ] Bug fixes

**Deliverable:** Full UI for viewing and managing specs

---

### Week 5: Trigger System & Generation

**Monday-Tuesday: TriggerDetector**
- [ ] Implement trigger checks
- [ ] Configuration management
- [ ] Unit tests
- [ ] Integration with SpecTracker

**Wednesday: SpecGenerator**
- [ ] Implement generation logic
- [ ] Multi-format support
- [ ] LLM integration
- [ ] Streaming support

**Thursday: End-to-end trigger flow**
- [ ] Wire up trigger detection
- [ ] Wire up spec generation
- [ ] Test full flow
- [ ] Bug fixes

**Friday: TestGenerator (basic)**
- [ ] Framework detection
- [ ] Basic test generation
- [ ] Unit tests

**Deliverable:** System can detect triggers and generate specs automatically

---

### Week 6: Polish & Documentation

**Monday: TestGenerator (complete)**
- [ ] All frameworks supported
- [ ] Test file creation
- [ ] Run command generation
- [ ] Integration with terminal

**Tuesday-Wednesday: Bug fixes & polish**
- [ ] Fix all known bugs
- [ ] Performance optimization
- [ ] Error handling improvements
- [ ] UI polish

**Thursday: Documentation**
- [ ] User guide
- [ ] Developer docs
- [ ] API documentation
- [ ] README updates

**Friday: Final testing & release prep**
- [ ] Full manual test pass
- [ ] Update changelog
- [ ] Prepare demo
- [ ] Tag release

**Deliverable:** Production-ready feature

---

## Success Metrics

### Technical Metrics

**Week 2:**
- [ ] Can track 100% of conversation messages
- [ ] Can detect file changes with <100ms latency
- [ ] Can extract requirements with >50% accuracy

**Week 4:**
- [ ] UI loads in <500ms
- [ ] All gRPC calls complete in <100ms
- [ ] Zero React errors in console

**Week 6:**
- [ ] All unit tests passing (target: 80% coverage)
- [ ] All integration tests passing
- [ ] Zero critical bugs
- [ ] <10 known minor bugs

### User Experience Metrics

**Week 4:**
- [ ] Can create manual spec in <30 seconds
- [ ] Can view all specs with 1 click
- [ ] Trigger notification appears within 1 second

**Week 6:**
- [ ] Spec extraction from conversation takes <10 seconds
- [ ] Spec generation produces usable output 80% of time
- [ ] Test generation produces runnable tests 70% of time

### Validation Metrics (Post-Release)

**Month 1:**
- [ ] 5+ users test the feature
- [ ] 3+ positive feedback responses
- [ ] <5 bug reports
- [ ] Feature used in at least 20% of tasks

**Month 3:**
- [ ] 50+ specs created across all users
- [ ] 10+ tests generated from specs
- [ ] Users report reduced regression bugs
- [ ] Feature adoption >30% of tasks

---

## Assumptions & Design Choices

See [ASSUMPTIONS.md](./ASSUMPTIONS.md) for detailed assumptions and design choices made during implementation.

---

## Appendix

### A. Configuration

**VS Code settings:**

```json
{
  "cline.specs.enabled": true,
  "cline.specs.autoDetectTriggers": true,
  "cline.specs.defaultFormat": "gherkin",
  "cline.specs.storageMode": "local",
  "cline.specs.triggerConfig": {
    "maxLinesPerFile": 300,
    "maxModificationsPerTask": 3,
    "bugKeywordThreshold": 3
  }
}
```

### B. Dependencies

**New dependencies to add:**

```json
{
  "dependencies": {
    // For complexity analysis
    "typescript": "^5.0.0",
    "esprima": "^4.0.1",

    // For test framework detection
    "find-up": "^6.0.0"
  },
  "devDependencies": {
    // For testing
    "@types/esprima": "^4.0.3"
  }
}
```

### C. Future Enhancements (Post-MVP)

**Phase 2 (Month 2-3):**
- [ ] Semantic similarity (embeddings)
- [ ] Advanced contradiction detection
- [ ] Spec diffing (version comparison)
- [ ] Spec templates library

**Phase 3 (Month 4-6):**
- [ ] Team-shared specs (cloud sync)
- [ ] Spec coverage visualization
- [ ] Integration with Jira/Azure DevOps
- [ ] Compliance reporting

**Phase 4 (Month 6+):**
- [ ] AI-powered spec suggestions during planning
- [ ] Automatic test execution after spec changes
- [ ] Spec-driven code generation
- [ ] Enterprise analytics dashboard

---

## Conclusion

This revised plan addresses all architectural issues identified in the critique while maintaining the core vision of "progressive formalization." The implementation is straightforward, leverages existing Cline patterns, and can be completed in 6 weeks.

**Key advantages over original plan:**
- ✅ No MCP server complexity
- ✅ Proper gRPC communication
- ✅ Integrated with existing state management
- ✅ Simpler heuristics for faster validation
- ✅ Clear UI/UX flows
- ✅ Concrete implementation details

**Next step:** Begin implementation following this plan.

---

**Document version:** 2.0
**Last updated:** 2025-11-10
**Status:** Ready for implementation
