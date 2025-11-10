# Assumptions and Design Choices

**Document Version:** 1.0
**Date:** 2025-11-10
**Project:** Cline Progressive Spec

---

## Table of Contents

1. [Core Assumptions](#core-assumptions)
2. [Technical Decisions](#technical-decisions)
3. [UX Decisions](#ux-decisions)
4. [Storage Decisions](#storage-decisions)
5. [Scope Decisions](#scope-decisions)
6. [Performance Assumptions](#performance-assumptions)
7. [Future Considerations](#future-considerations)

---

## Core Assumptions

### 1. Users Want Progressive, Not Forced, Formalization

**Assumption:**
Developers resist upfront specification but welcome it when complexity emerges.

**Rationale:**
- Modern AI tools prioritize speed over structure
- Specs feel like overhead when prototyping
- But become essential when maintaining/scaling
- "Progressive formalization" strikes the balance

**Implications:**
- Default: specs disabled, vibe mode only
- Triggers must be opt-in or dismissible
- Never block workflow for spec creation
- Show value through suggestions, not requirements

**Risk if wrong:**
Users ignore the feature entirely if it feels pushy.

**Mitigation:**
- Make triggers informational, not blocking
- Track dismissal patterns
- Adjust sensitivity based on user behavior

---

### 2. Conversation History Contains Implicit Requirements

**Assumption:**
Users naturally express requirements in conversation, even informally.

**Examples:**
- "The login should redirect to /dashboard"
- "Make sure passwords are at least 8 characters"
- "When the user clicks submit, validate the form"

**Rationale:**
- Users describe what they want, even if vague
- Keywords like "should", "must", "when...then" indicate requirements
- AI already interprets these; we just need to extract them

**Implications:**
- Keyword-based extraction is sufficient for MVP
- Don't need ML/embeddings initially
- Focus on clear requirement indicators

**Risk if wrong:**
Extraction produces garbage or misses requirements.

**Mitigation:**
- Show extracted requirements for user review
- Allow manual editing before spec creation
- Track extraction accuracy and iterate

---

### 3. File Complexity is a Good Trigger Indicator

**Assumption:**
When files grow large or complex, specs become valuable.

**Metrics:**
- Lines of code > 300
- Cyclomatic complexity > 10
- Modified 3+ times in one task

**Rationale:**
- Large files are hard to reason about
- Frequent modifications suggest unclear requirements
- Complexity makes regressions more likely

**Implications:**
- Use static analysis for triggers
- Don't need runtime analysis
- Simple metrics are sufficient

**Risk if wrong:**
False positives annoy users; false negatives miss opportunities.

**Mitigation:**
- Make thresholds configurable
- Track trigger accuracy
- Allow dismissal with "don't show again for this file"

---

### 4. Users Understand Gherkin (or can learn it quickly)

**Assumption:**
Given-When-Then format is intuitive enough for most developers.

**Rationale:**
- Widely used in BDD (Behavior-Driven Development)
- Clear structure (precondition, action, result)
- Human-readable, even for non-technical stakeholders

**Alternative considered:**
Free-form text, but that's less structured and harder to convert to tests.

**Implications:**
- Gherkin is default format
- Provide examples/templates
- Show format in UI for education

**Risk if wrong:**
Users find Gherkin confusing or overly formal.

**Mitigation:**
- Support multiple formats (user story, acceptance criteria, free-form)
- Auto-detect user's preference from edits
- Provide format conversion

---

### 5. Test Frameworks Can Be Auto-Detected

**Assumption:**
We can reliably detect Jest, pytest, Go test, etc. from project files.

**Detection strategy:**
- Check package.json for dependencies
- Check for test file patterns (*.test.ts, *_test.go)
- Check for config files (jest.config.js, pytest.ini)

**Rationale:**
- Most projects have clear test framework indicators
- Heuristics are sufficient (don't need 100% accuracy)

**Implications:**
- Can suggest correct test structure
- Can provide run commands
- Don't need user to specify framework

**Risk if wrong:**
Generate tests in wrong format, frustrating users.

**Mitigation:**
- Show detected framework in UI
- Allow manual override
- Provide "couldn't detect" fallback (ask user)

---

### 6. Specs Should Be Stored Locally by Default

**Assumption:**
Users want specs in extension storage, not committed to repo.

**Rationale:**
- Not all teams want specs in version control
- Specs may be personal notes/reminders
- Repo-committed specs require team buy-in

**Implications:**
- Store in `.cline/` directory (gitignored)
- Provide "commit to repo" option as opt-in
- Sync with StateManager for persistence

**Risk if wrong:**
Users expect specs in repo and are confused by local storage.

**Mitigation:**
- Clear documentation on storage modes
- Setting to switch to repo mode
- Auto-detect if `specs/` directory exists

---

### 7. LLM Can Generate Useful Specs from Requirements

**Assumption:**
Given extracted requirements, an LLM can produce well-structured specs.

**Rationale:**
- LLMs excel at structured text generation
- Gherkin/user stories have clear patterns
- Can use few-shot examples for guidance

**Implications:**
- Use streaming for real-time feedback
- Show confidence/quality indicator
- Always allow user editing

**Risk if wrong:**
Generated specs are low quality, users lose trust.

**Mitigation:**
- Show as draft, not final
- Provide editing tools inline
- Iterate on prompts based on feedback
- Allow regeneration with different approach

---

## Technical Decisions

### Decision 1: Direct Extension Integration (Not MCP Server)

**Decision:** Build as Cline service, not MCP server

**Alternatives considered:**
1. MCP server (original plan)
2. Separate VS Code extension
3. Modification of Cline core

**Chosen:** #3 - Modification of Cline core

**Rationale:**
- MCP servers cannot access conversation state
- MCP servers cannot add UI panels
- MCP servers cannot hook into task lifecycle
- Direct integration is simpler and more powerful

**Trade-offs:**
- ✅ Full access to Cline internals
- ✅ Can add UI components
- ✅ Can hook into events
- ❌ Requires modifying Cline source
- ❌ Harder to distribute separately

**Future consideration:**
If Cline team rejects integration, can still fork as separate extension.

---

### Decision 2: gRPC for Extension ↔ Webview Communication

**Decision:** Use gRPC (existing Cline pattern), not custom messages

**Alternatives considered:**
1. VS Code message passing API
2. Custom JSON protocol
3. REST API

**Chosen:** gRPC (following Cline's existing approach)

**Rationale:**
- Cline already uses gRPC everywhere
- Type-safe with proto definitions
- Supports streaming (for real-time updates)
- Versioned APIs

**Trade-offs:**
- ✅ Consistent with Cline architecture
- ✅ Type safety
- ✅ Streaming support
- ❌ Requires proto definitions
- ❌ More boilerplate than simple messages

**Implementation notes:**
- Define services in `proto/specs/specs.proto`
- Generate TypeScript types
- Implement handlers in `src/core/controller/specs/`

---

### Decision 3: StateManager for Persistence (Not Separate DB)

**Decision:** Use Cline's StateManager, not SQLite/file system directly

**Alternatives considered:**
1. SQLite database
2. Direct file system writes
3. VS Code workspace state
4. StateManager (existing Cline system)

**Chosen:** #4 - StateManager

**Rationale:**
- Cline already has robust state management
- Async persistence built-in
- Handles multi-workspace scenarios
- Syncs with VS Code's state

**Trade-offs:**
- ✅ Leverage existing infrastructure
- ✅ Consistent with other Cline features
- ✅ Battle-tested
- ❌ Less control over storage format
- ❌ Tied to VS Code's state API

**Storage structure:**
```
globalState['cline.specs'] = {
  global: Spec[],
  workspaces: {
    [id]: { specs: Spec[], triggers: Trigger[] }
  }
}
```

---

### Decision 4: Heuristic-Based Triggers (Not ML)

**Decision:** Use keyword matching and static analysis, not machine learning

**Alternatives considered:**
1. OpenAI embeddings + clustering
2. Custom ML model
3. Rule-based heuristics
4. Hybrid (heuristics + ML)

**Chosen:** #3 - Rule-based heuristics for MVP

**Rationale:**
- Faster development (no model training)
- Instant results (no API latency)
- Easy to debug and tune
- Good enough for validation

**Heuristics:**
- **Keywords:** "should", "must", "when...then", "bug", "issue"
- **Complexity:** Lines > 300, cyclomatic complexity > 10
- **Frequency:** File modified 3+ times
- **Contradictions:** "actually", "wait", "no", "correction"

**Trade-offs:**
- ✅ Fast and simple
- ✅ No external dependencies
- ✅ Easy to tune
- ❌ May miss nuanced requirements
- ❌ Higher false positive rate

**Future enhancement:**
Add embeddings in Phase 2 if heuristics prove insufficient.

---

### Decision 5: Multi-Format Specs (Not Gherkin-Only)

**Decision:** Support Gherkin, user stories, acceptance criteria, free-form

**Alternatives considered:**
1. Gherkin only (original plan)
2. Free-form only
3. Multi-format (chosen)

**Chosen:** #3 - Multi-format

**Rationale:**
- Different teams have different preferences
- Some projects don't use BDD
- Flexibility increases adoption

**Formats:**
1. **Gherkin:** Given-When-Then scenarios
2. **User Story:** As a [role], I want [feature], so that [benefit]
3. **Acceptance Criteria:** Bulleted list of criteria
4. **Free-form:** Markdown document

**Trade-offs:**
- ✅ More flexible
- ✅ Wider adoption
- ❌ More code to maintain
- ❌ Format conversion complexity

**Implementation:**
- Abstract SpecFormatter interface
- One formatter per format
- User selects in settings or per-spec

---

### Decision 6: Framework-Specific Test Generation

**Decision:** Detect framework and generate appropriate tests

**Alternatives considered:**
1. Generic test structure
2. Framework-specific (chosen)
3. No test generation (manual only)

**Chosen:** #2 - Framework-specific

**Rationale:**
- Tests must match project's existing setup
- Each framework has different conventions
- Generated tests should be runnable immediately

**Supported frameworks (MVP):**
- Jest (JavaScript/TypeScript)
- Pytest (Python)
- Go test (Go)
- Vitest (JavaScript/TypeScript)

**Detection:**
- Check package.json dependencies
- Check for config files
- Check existing test patterns

**Trade-offs:**
- ✅ Generated tests work immediately
- ✅ Follow project conventions
- ❌ More complex implementation
- ❌ Must support multiple frameworks

**Future frameworks:**
- JUnit (Java)
- RSpec (Ruby)
- PHPUnit (PHP)

---

## UX Decisions

### Decision 1: Opt-In Triggers (Not Automatic)

**Decision:** Show trigger notifications, don't auto-create specs

**Alternatives considered:**
1. Auto-create specs on trigger
2. Show notification, require action (chosen)
3. Silent suggestions (badge only)

**Chosen:** #2 - Show notification, require user action

**Rationale:**
- Respects user agency
- Avoids disrupting flow
- Allows dismissal if timing is bad
- Users learn to trust the system

**UI:**
- Banner appears in chat view
- "Would you like to create a spec?"
- [Create Spec] [Dismiss] [Settings]
- Dismissal is remembered per file

**Trade-offs:**
- ✅ Non-intrusive
- ✅ User maintains control
- ❌ Some users may ignore all triggers
- ❌ Requires manual action

**Tuning:**
- Track dismissal rate
- If >80% dismissed, reduce sensitivity
- If <10% dismissed, increase sensitivity

---

### Decision 2: Specs Panel (Not Inline in Chat)

**Decision:** Dedicated panel for specs, not mixed with chat

**Alternatives considered:**
1. Inline in chat (like todo items)
2. Separate panel (chosen)
3. Sidebar view
4. Separate webview

**Chosen:** #2 - Separate panel (like Settings/History)

**Rationale:**
- Specs are persistent, chat is ephemeral
- Need dedicated space for management
- Can show list, details, edit form
- Follows existing Cline patterns

**UI structure:**
```
Toolbar: [Chat] [History] [MCP] [Settings] [Specs]

         [Specs Panel]
         ├── Spec list
         ├── Spec details
         ├── Edit form
         └── Generation tools
```

**Trade-offs:**
- ✅ Clear separation of concerns
- ✅ Room for rich UI
- ✅ Consistent with Cline UX
- ❌ Requires navigation to view
- ❌ Can't see specs while chatting

**Compromise:**
- Show spec count badge on toolbar
- Show inline notification when trigger fires
- Link from notification to panel

---

### Decision 3: Streaming Spec Generation

**Decision:** Stream generated content in real-time

**Alternatives considered:**
1. Show loading spinner, then result
2. Stream character-by-character (chosen)
3. Stream section-by-section

**Chosen:** #2 - Stream character-by-character

**Rationale:**
- Faster perceived performance
- User sees progress
- Can stop if going wrong direction
- Matches modern AI UX expectations

**Implementation:**
- gRPC streaming RPC
- Webview updates on each chunk
- Show "Stop generating" button

**Trade-offs:**
- ✅ Better UX
- ✅ Shows progress
- ✅ Can cancel mid-generation
- ❌ More complex implementation
- ❌ Requires streaming support

---

### Decision 4: Post-Task Spec Suggestions

**Decision:** Suggest spec extraction after task completes

**Alternatives considered:**
1. Only during task (real-time)
2. Only post-task (chosen)
3. Both real-time and post-task

**Chosen:** #2 - Post-task primarily, real-time for critical triggers

**Rationale:**
- Don't interrupt flow during task
- User has context after completion
- Can review all changes holistically
- Less intrusive

**Trigger timing:**
- **During task:** Only for critical triggers (contradiction, high complexity)
- **After task:** Always offer spec extraction

**UI:**
```
AI: "Task complete! ✓

     I modified these areas:
     • Authentication (login.ts, auth.ts)
     • User profile (profile.ts, UserProfile.tsx)

     Would you like to document the requirements?
     [Yes, extract specs] [No, maybe later]"
```

**Trade-offs:**
- ✅ Less disruptive
- ✅ User has full context
- ❌ May forget to create specs
- ❌ Delayed formalization

---

## Storage Decisions

### Decision 1: Local-First Storage (Not Cloud)

**Decision:** Store specs in local extension storage

**Alternatives considered:**
1. Cloud storage (Cline account)
2. Git repo
3. Local extension storage (chosen)
4. Workspace .vscode folder

**Chosen:** #3 - Local extension storage

**Rationale:**
- Privacy (no cloud dependency)
- Works offline
- Simple implementation
- User controls data

**Storage location:**
```
[globalStoragePath]/specs/
├── global.json
└── workspaces/
    └── [hash]/
        └── specs.json
```

**Trade-offs:**
- ✅ Privacy
- ✅ Offline support
- ✅ Fast access
- ❌ No cross-device sync
- ❌ Lost if storage cleared

**Future enhancement:**
- Optional cloud sync
- Git repo mode (opt-in)
- Export/import

---

### Decision 2: JSON Format (Not Binary)

**Decision:** Store specs as JSON

**Alternatives considered:**
1. Binary (protobuf, msgpack)
2. JSON (chosen)
3. YAML
4. SQLite

**Chosen:** #2 - JSON

**Rationale:**
- Human-readable
- Easy to debug
- Standard serialization
- VS Code state API uses JSON

**Format:**
```json
{
  "version": 1,
  "specs": [
    {
      "id": "spec-123",
      "title": "Login requirements",
      "content": "...",
      "format": "gherkin",
      "files": ["src/auth/login.ts"],
      "createdAt": "2025-11-10T10:00:00Z"
    }
  ]
}
```

**Trade-offs:**
- ✅ Debuggable
- ✅ Human-readable
- ✅ Standard format
- ❌ Larger file size
- ❌ Slower parse (but negligible)

---

### Decision 3: Separate Files per Workspace

**Decision:** One specs.json per workspace

**Alternatives considered:**
1. Single global file
2. One file per workspace (chosen)
3. One file per spec

**Chosen:** #2 - One file per workspace

**Rationale:**
- Isolation between projects
- Smaller files (faster load)
- Easier to backup/export workspace

**Structure:**
```
specs/
├── global.json (user-created global specs)
└── workspaces/
    ├── abc123/ (workspace hash)
    │   └── specs.json
    └── def456/
        └── specs.json
```

**Trade-offs:**
- ✅ Project isolation
- ✅ Smaller files
- ✅ Easy to export
- ❌ More files to manage
- ❌ No global search (yet)

---

## Scope Decisions

### Decision 1: MVP Scope (6 weeks)

**Included in MVP:**
- ✅ Manual spec creation
- ✅ Conversation tracking
- ✅ Heuristic-based triggers
- ✅ Multi-format spec generation
- ✅ Basic test generation
- ✅ Specs panel UI

**Excluded from MVP:**
- ❌ Semantic similarity (ML)
- ❌ Cloud sync
- ❌ Team collaboration
- ❌ CI/CD integration
- ❌ Spec coverage visualization
- ❌ Advanced contradiction detection

**Rationale:**
- Validate core concept first
- Ship faster
- Iterate based on feedback
- Add advanced features in Phase 2

---

### Decision 2: Framework Support (MVP)

**Included:**
- ✅ Jest (JavaScript/TypeScript)
- ✅ Pytest (Python)
- ✅ Go test (Go)
- ✅ Vitest (JavaScript/TypeScript)

**Excluded:**
- ❌ JUnit (Java)
- ❌ RSpec (Ruby)
- ❌ PHPUnit (PHP)
- ❌ Mocha/Chai
- ❌ xUnit (.NET)

**Rationale:**
- Cover 80% of use cases
- Can add more based on demand
- Each framework requires custom implementation

---

### Decision 3: No Advanced Analysis (MVP)

**Excluded from MVP:**
- ❌ Cyclomatic complexity calculation (use line count instead)
- ❌ Abstract syntax tree (AST) parsing
- ❌ Data flow analysis
- ❌ Semantic code understanding

**Rationale:**
- Complex to implement
- Not critical for validation
- Can add later if needed

**Simple metrics used:**
- Lines of code (simple)
- Modification count (simple)
- Keyword matching (simple)

---

## Performance Assumptions

### 1. Conversation Tracking Has Minimal Overhead

**Assumption:**
Recording each message adds <10ms latency.

**Implementation:**
- Async recording (non-blocking)
- In-memory cache
- Batch disk writes

**Risk:**
Slow down chat if synchronous.

**Mitigation:**
- Always async
- Measure and optimize

---

### 2. Trigger Detection is Fast Enough

**Assumption:**
Can check triggers in <100ms.

**Implementation:**
- Run on task completion (not during)
- Cache complexity metrics
- Skip already-analyzed files

**Risk:**
Slow down task completion.

**Mitigation:**
- Run in background
- Show UI immediately, calculate async
- Cache results

---

### 3. LLM Generation is Acceptable Speed

**Assumption:**
Users will wait 5-10s for spec generation.

**Implementation:**
- Streaming (shows progress)
- Option to cancel
- Cache common patterns

**Risk:**
Users lose patience.

**Mitigation:**
- Fast models for simple specs
- Streaming for feedback
- Cancel button

---

### 4. Storage Operations Are Fast

**Assumption:**
StateManager save/load is <50ms.

**Implementation:**
- Async operations
- In-memory cache
- Lazy loading

**Risk:**
Block UI on load.

**Mitigation:**
- Load in background
- Show loading state
- Progressive enhancement

---

## Future Considerations

### Phase 2 Enhancements (Month 2-3)

**If MVP validates:**
1. **Semantic analysis** - Add embeddings for better extraction
2. **Advanced triggers** - AST parsing, data flow analysis
3. **Spec diffing** - Compare versions, show changes
4. **Templates** - Library of common spec patterns

### Phase 3 Enhancements (Month 4-6)

**If adoption grows:**
1. **Cloud sync** - Cross-device spec access
2. **Team collaboration** - Shared spec repositories
3. **CI/CD integration** - Validate PRs against specs
4. **Coverage viz** - Show which files have specs

### Phase 4 Enhancements (Month 6+)

**If enterprise interest:**
1. **Compliance reporting** - Spec coverage metrics
2. **Jira integration** - Sync with requirement tickets
3. **Analytics dashboard** - Spec health over time
4. **Spec-first mode** - AI requires spec before coding

---

## Risk Register

### High-Priority Risks

1. **Users ignore triggers**
   - Mitigation: Tune sensitivity, show value clearly
   - Fallback: Make triggers more actionable

2. **Generated specs are low quality**
   - Mitigation: Always allow editing, iterate on prompts
   - Fallback: Focus on manual creation, de-emphasize generation

3. **Performance issues**
   - Mitigation: Async everything, measure carefully
   - Fallback: Make features opt-in, allow disabling

### Medium-Priority Risks

1. **Framework detection fails**
   - Mitigation: Allow manual override
   - Fallback: Ask user to specify

2. **Storage conflicts**
   - Mitigation: Use atomic writes, version control
   - Fallback: Backup before writes

3. **gRPC communication errors**
   - Mitigation: Retry logic, error handling
   - Fallback: Graceful degradation

### Low-Priority Risks

1. **Users want different format**
   - Mitigation: Multi-format support
   - Fallback: Allow custom templates

2. **Workspace isolation issues**
   - Mitigation: Test thoroughly
   - Fallback: Manual workspace selection

---

## Conclusion

These assumptions and design choices prioritize:
1. **Simplicity** over sophistication
2. **Speed** over perfection
3. **Validation** over completeness
4. **User control** over automation

The goal is to ship a working MVP in 6 weeks, validate the core concept, and iterate based on real user feedback.

**Key principle:** Build the simplest thing that could work, then make it better.

---

**Document owner:** Implementation team
**Review frequency:** After each implementation phase
**Last reviewed:** 2025-11-10
