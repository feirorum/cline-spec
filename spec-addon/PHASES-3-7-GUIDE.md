# Phases 3-7 Implementation Guide

**Date:** 2025-11-11
**Status:** Ready to Implement
**Prerequisites:** Phase 2 complete + proto build successful

---

## Overview

This guide provides detailed implementation instructions for the remaining phases of Progressive Spec. Each phase builds on the previous ones and can be implemented incrementally.

**Estimated Total Time:** 15-20 hours

---

## Phase 3: UI Components

**Goal:** Build React components for the webview UI
**Time:** 6-8 hours
**Status:** Not started (0%)

### 3.1 Create Base Components

#### SpecsView (Main Panel)

**File:** `webview-ui/src/components/specs/SpecsView.tsx`

```tsx
import React, { useState, useEffect } from 'react'
import { useSpecs } from '@/hooks/useSpecs'
import { SpecItem } from './SpecItem'
import { SpecEditor } from './SpecEditor'
import { Spec } from '@/types/specs'

export const SpecsView: React.FC = () => {
	const { specs, loading, addSpec, updateSpec, deleteSpec, refresh } = useSpecs()
	const [showEditor, setShowEditor] = useState(false)
	const [editingSpec, setEditingSpec] = useState<Spec | null>(null)
	const [filter, setFilter] = useState('')

	useEffect(() => {
		refresh()
	}, [])

	const handleAddSpec = () => {
		setEditingSpec(null)
		setShowEditor(true)
	}

	const handleEditSpec = (spec: Spec) => {
		setEditingSpec(spec)
		setShowEditor(true)
	}

	const handleSaveSpec = async (spec: Partial<Spec>) => {
		if (editingSpec) {
			await updateSpec(editingSpec.id, spec)
		} else {
			await addSpec(spec as Omit<Spec, 'id'>)
		}
		setShowEditor(false)
		refresh()
	}

	const filteredSpecs = specs.filter(spec =>
		spec.title.toLowerCase().includes(filter.toLowerCase()) ||
		spec.content.toLowerCase().includes(filter.toLowerCase())
	)

	return (
		<div className="specs-view">
			<div className="specs-header">
				<h2>Specifications</h2>
				<div className="specs-actions">
					<input
						type="text"
						placeholder="Search specs..."
						value={filter}
						onChange={(e) => setFilter(e.target.value)}
					/>
					<button onClick={handleAddSpec}>+ New Spec</button>
				</div>
			</div>

			<div className="specs-list">
				{loading ? (
					<div>Loading...</div>
				) : filteredSpecs.length === 0 ? (
					<div className="empty-state">
						<p>No specs yet. Create one to get started!</p>
					</div>
				) : (
					filteredSpecs.map(spec => (
						<SpecItem
							key={spec.id}
							spec={spec}
							onEdit={() => handleEditSpec(spec)}
							onDelete={() => deleteSpec(spec.id)}
						/>
					))
				)}
			</div>

			{showEditor && (
				<SpecEditor
					spec={editingSpec}
					onSave={handleSaveSpec}
					onCancel={() => setShowEditor(false)}
				/>
			)}
		</div>
	)
}
```

**Key Features:**
- Spec list with search
- Create/edit/delete operations
- Empty state handling
- Loading states

#### SpecItem (Individual Spec Display)

**File:** `webview-ui/src/components/specs/SpecItem.tsx`

```tsx
import React from 'react'
import { Spec } from '@/types/specs'
import { SpecStatusBadge } from './SpecStatusBadge'

interface SpecItemProps {
	spec: Spec
	onEdit: () => void
	onDelete: () => void
}

export const SpecItem: React.FC<SpecItemProps> = ({ spec, onEdit, onDelete }) => {
	return (
		<div className="spec-item">
			<div className="spec-header">
				<h3>{spec.title}</h3>
				<SpecStatusBadge status={spec.status} />
			</div>

			<div className="spec-meta">
				<span className="spec-format">{spec.format}</span>
				<span className="spec-files">{spec.files.length} files</span>
				{spec.tags.length > 0 && (
					<div className="spec-tags">
						{spec.tags.map(tag => (
							<span key={tag} className="tag">{tag}</span>
						))}
					</div>
				)}
			</div>

			<div className="spec-preview">
				{spec.content.split('\n').slice(0, 3).join('\n')}
				{spec.content.split('\n').length > 3 && '...'}
			</div>

			<div className="spec-actions">
				<button onClick={onEdit}>Edit</button>
				<button onClick={onDelete}>Delete</button>
			</div>
		</div>
	)
}
```

#### SpecEditor (Create/Edit Form)

**File:** `webview-ui/src/components/specs/SpecEditor.tsx`

```tsx
import React, { useState } from 'react'
import { Spec } from '@/types/specs'

interface SpecEditorProps {
	spec: Spec | null
	onSave: (spec: Partial<Spec>) => void
	onCancel: () => void
}

export const SpecEditor: React.FC<SpecEditorProps> = ({ spec, onSave, onCancel }) => {
	const [title, setTitle] = useState(spec?.title || '')
	const [content, setContent] = useState(spec?.content || '')
	const [format, setFormat] = useState(spec?.format || 'gherkin')
	const [status, setStatus] = useState(spec?.status || 'draft')
	const [tags, setTags] = useState(spec?.tags.join(', ') || '')

	const handleSave = () => {
		onSave({
			title,
			content,
			format: format as any,
			status: status as any,
			tags: tags.split(',').map(t => t.trim()).filter(Boolean),
		})
	}

	return (
		<div className="spec-editor-overlay">
			<div className="spec-editor">
				<h2>{spec ? 'Edit Spec' : 'New Spec'}</h2>

				<div className="form-group">
					<label>Title</label>
					<input
						type="text"
						value={title}
						onChange={(e) => setTitle(e.target.value)}
						placeholder="Spec title..."
					/>
				</div>

				<div className="form-row">
					<div className="form-group">
						<label>Format</label>
						<select value={format} onChange={(e) => setFormat(e.target.value)}>
							<option value="gherkin">Gherkin (BDD)</option>
							<option value="user-story">User Story</option>
							<option value="acceptance-criteria">Acceptance Criteria</option>
							<option value="free-form">Free Form</option>
						</select>
					</div>

					<div className="form-group">
						<label>Status</label>
						<select value={status} onChange={(e) => setStatus(e.target.value)}>
							<option value="draft">Draft</option>
							<option value="active">Active</option>
							<option value="implemented">Implemented</option>
							<option value="archived">Archived</option>
						</select>
					</div>
				</div>

				<div className="form-group">
					<label>Content</label>
					<textarea
						value={content}
						onChange={(e) => setContent(e.target.value)}
						placeholder="Spec content..."
						rows={15}
					/>
				</div>

				<div className="form-group">
					<label>Tags (comma-separated)</label>
					<input
						type="text"
						value={tags}
						onChange={(e) => setTags(e.target.value)}
						placeholder="auth, critical, api"
					/>
				</div>

				<div className="editor-actions">
					<button onClick={handleSave}>Save</button>
					<button onClick={onCancel}>Cancel</button>
				</div>
			</div>
		</div>
	)
}
```

#### TriggerBanner (Notification)

**File:** `webview-ui/src/components/specs/TriggerBanner.tsx`

```tsx
import React from 'react'
import { Trigger } from '@/types/specs'

interface TriggerBannerProps {
	trigger: Trigger
	onCreateSpec: () => void
	onDismiss: () => void
}

export const TriggerBanner: React.FC<TriggerBannerProps> = ({
	trigger,
	onCreateSpec,
	onDismiss
}) => {
	const severityColor = {
		info: '#2196F3',
		warning: '#FF9800',
		error: '#F44336'
	}[trigger.severity]

	return (
		<div
			className="trigger-banner"
			style={{ borderLeft: `4px solid ${severityColor}` }}
		>
			<div className="trigger-content">
				<h4>{trigger.type === 'frequency' ? '⚠️' : '💡'} Spec Suggestion</h4>
				<p>{trigger.message}</p>
				<p className="trigger-action">{trigger.suggestedAction.description}</p>
			</div>
			<div className="trigger-actions">
				<button onClick={onCreateSpec}>Create Spec</button>
				<button onClick={onDismiss}>Dismiss</button>
			</div>
		</div>
	)
}
```

### 3.2 Create React Hook

**File:** `webview-ui/src/hooks/useSpecs.ts`

```typescript
import { useState, useCallback } from 'react'
import { vscode } from '../utilities/vscode'
import { Spec } from '../types/specs'

export function useSpecs() {
	const [specs, setSpecs] = useState<Spec[]>([])
	const [loading, setLoading] = useState(false)

	const refresh = useCallback(async () => {
		setLoading(true)
		try {
			const response = await vscode.getSpecs({})
			setSpecs(response.specs)
		} catch (error) {
			console.error('Failed to load specs:', error)
		} finally {
			setLoading(false)
		}
	}, [])

	const addSpec = useCallback(async (spec: Omit<Spec, 'id'>) => {
		try {
			await vscode.addSpec(spec)
			await refresh()
		} catch (error) {
			console.error('Failed to add spec:', error)
		}
	}, [refresh])

	const updateSpec = useCallback(async (id: string, updates: Partial<Spec>) => {
		try {
			await vscode.updateSpec({ specId: id, ...updates })
			await refresh()
		} catch (error) {
			console.error('Failed to update spec:', error)
		}
	}, [refresh])

	const deleteSpec = useCallback(async (id: string) => {
		try {
			await vscode.deleteSpec({ specId: id })
			await refresh()
		} catch (error) {
			console.error('Failed to delete spec:', error)
		}
	}, [refresh])

	return {
		specs,
		loading,
		addSpec,
		updateSpec,
		deleteSpec,
		refresh
	}
}
```

### 3.3 Integrate with App

#### Update ExtensionStateContext

**File:** `webview-ui/src/context/ExtensionStateContext.tsx`

```typescript
// Add to state
const [showSpecs, setShowSpecs] = useState(false)

// Add navigation functions
const navigateToSpecs = useCallback(() => {
	setShowHistory(false)
	setShowSettings(false)
	setShowMcp(false)
	setShowAccount(false)
	setShowSpecs(true)
}, [])

const hideSpecs = useCallback(() => {
	setShowSpecs(false)
}, [])

// Add to context value
return (
	<ExtensionStateContext.Provider
		value={{
			// ... existing values ...
			showSpecs,
			setShowSpecs,
			navigateToSpecs,
			hideSpecs,
		}}
	>
		{children}
	</ExtensionStateContext.Provider>
)
```

#### Update App.tsx

**File:** `webview-ui/src/App.tsx`

```tsx
import { SpecsView } from './components/specs/SpecsView'

// In render:
{showSpecs && <SpecsView />}
```

### 3.4 Add Toolbar Button

**File:** `package.json`

```json
{
	"contributes": {
		"commands": [
			{
				"command": "cline.openSpecs",
				"title": "Open Specs Panel",
				"icon": "$(notebook)"
			}
		],
		"menus": {
			"view/title": [
				{
					"command": "cline.openSpecs",
					"when": "view == cline.SidebarProvider",
					"group": "navigation@4"
				}
			]
		}
	}
}
```

**File:** `src/extension.ts`

```typescript
const openSpecsCommand = vscode.commands.registerCommand(
	"cline.openSpecs",
	() => {
		provider.postMessageToWebview({
			type: "action",
			action: "navigateToSpecs"
		})
	}
)

context.subscriptions.push(openSpecsCommand)
```

### 3.5 Add Styles

**File:** `webview-ui/src/components/specs/styles/specs.css`

```css
.specs-view {
	padding: 20px;
	height: 100%;
	overflow-y: auto;
}

.specs-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 20px;
}

.specs-actions {
	display: flex;
	gap: 10px;
}

.specs-list {
	display: flex;
	flex-direction: column;
	gap: 15px;
}

.spec-item {
	border: 1px solid var(--vscode-panel-border);
	border-radius: 6px;
	padding: 15px;
	background: var(--vscode-editor-background);
}

.spec-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 10px;
}

.spec-meta {
	display: flex;
	gap: 15px;
	margin-bottom: 10px;
	font-size: 0.9em;
	color: var(--vscode-descriptionForeground);
}

.spec-tags {
	display: flex;
	gap: 5px;
}

.tag {
	background: var(--vscode-badge-background);
	color: var(--vscode-badge-foreground);
	padding: 2px 8px;
	border-radius: 3px;
	font-size: 0.85em;
}

.spec-preview {
	white-space: pre-wrap;
	font-family: monospace;
	font-size: 0.9em;
	margin-bottom: 10px;
	color: var(--vscode-foreground);
}

.spec-actions {
	display: flex;
	gap: 10px;
	justify-content: flex-end;
}

.trigger-banner {
	position: fixed;
	bottom: 20px;
	right: 20px;
	max-width: 400px;
	background: var(--vscode-notifications-background);
	border-radius: 6px;
	padding: 15px;
	box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
	z-index: 1000;
}

.trigger-content h4 {
	margin: 0 0 10px 0;
}

.trigger-actions {
	display: flex;
	gap: 10px;
	margin-top: 15px;
}
```

---

## Phase 6: Spec Generation

**Goal:** LLM-based spec generation with streaming
**Time:** 3-4 hours
**Status:** Stub implementation exists

### 6.1 Create SpecGenerator Service

**File:** `src/services/specs/SpecGenerator.ts`

```typescript
import { ApiHandler } from "@/core/api"
import { Requirement, SpecFormat, GenerationContext } from "./types"

export class SpecGenerator {
	constructor(private apiHandler: ApiHandler) {}

	async *generateSpec(
		requirements: Requirement[],
		format: SpecFormat,
		context?: GenerationContext
	): AsyncIterableIterator<string> {
		const prompt = this.buildPrompt(requirements, format, context)

		// Use Cline's existing LLM integration
		const stream = await this.apiHandler.createMessage({
			systemPrompt: this.getSystemPrompt(format),
			messages: [{ role: "user", content: prompt }]
		})

		// Stream the spec generation
		for await (const chunk of stream) {
			if (chunk.type === 'text') {
				yield chunk.text
			}
		}
	}

	private getSystemPrompt(format: SpecFormat): string {
		const prompts = {
			"gherkin": `You are a BDD spec writer. Generate Gherkin specifications with:
- Feature descriptions
- Background steps (if needed)
- Scenarios with Given/When/Then
- Examples for scenario outlines`,

			"user-story": `You are a product manager. Generate user stories with:
- Clear user persona
- Value statement
- Acceptance criteria
- Definition of done`,

			"acceptance-criteria": `You are a QA engineer. Generate acceptance criteria with:
- Numbered list of testable conditions
- Edge cases
- Error scenarios`,

			"free-form": `You are a technical writer. Generate clear, structured specifications.`
		}
		return prompts[format] || prompts["free-form"]
	}

	private buildPrompt(
		requirements: Requirement[],
		format: SpecFormat,
		context?: GenerationContext
	): string {
		let prompt = `Generate a ${format} specification from these requirements:\n\n`

		requirements.forEach((req, i) => {
			prompt += `${i + 1}. ${req.text}\n`
		})

		if (context?.files) {
			prompt += `\nRelated files:\n${context.files.join('\n')}\n`
		}

		if (context?.conversation) {
			prompt += `\nContext from conversation:\n${context.conversation}\n`
		}

		return prompt
	}
}
```

### 6.2 Update generateSpec Handler

**File:** `src/core/controller/specs/generateSpec.ts`

```typescript
import { Controller } from ".."
import { GenerateSpecRequest, GenerateSpecChunk } from "@shared/proto/cline/specs"
import { StreamingResponseHandler } from "@/core/controller/grpc-handler"

export async function generateSpec(
	controller: Controller,
	request: GenerateSpecRequest,
	responseStream: StreamingResponseHandler<GenerateSpecChunk>,
	requestId?: string,
): Promise<void> {
	try {
		const specService = controller.getSpecService()
		const apiHandler = controller.getApiHandler()

		// Get requirements if taskId provided
		const requirements = request.taskId
			? await specService.extractRequirements(request.taskId)
			: []

		// Create generator
		const generator = new SpecGenerator(apiHandler)

		// Stream generation
		const stream = generator.generateSpec(
			requirements,
			request.format as any,
			{
				files: request.files,
				conversation: request.context
			}
		)

		for await (const chunk of stream) {
			responseStream.write({
				chunk,
				done: false,
			})
		}

		responseStream.write({
			chunk: "",
			done: true,
		})
	} catch (error) {
		console.error("Error in generateSpec:", error)
		responseStream.error(error instanceof Error ? error : new Error(String(error)))
	}
}
```

### 6.3 Add UI for Generation

**File:** `webview-ui/src/components/specs/SpecGenerator.tsx`

```tsx
import React, { useState } from 'react'
import { vscode } from '@/utilities/vscode'

interface SpecGeneratorProps {
	requirements: Requirement[]
	onGenerated: (content: string) => void
}

export const SpecGenerator: React.FC<SpecGeneratorProps> = ({
	requirements,
	onGenerated
}) => {
	const [format, setFormat] = useState('gherkin')
	const [generating, setGenerating] = useState(false)
	const [content, setContent] = useState('')

	const handleGenerate = async () => {
		setGenerating(true)
		setContent('')

		try {
			const unsubscribe = vscode.generateSpec(
				{
					requirements: requirements.map(r => r.id),
					format,
				},
				{
					onData: (chunk) => {
						setContent(prev => prev + chunk.chunk)
					},
					onEnd: () => {
						setGenerating(false)
						onGenerated(content)
					},
					onError: (error) => {
						console.error('Generation failed:', error)
						setGenerating(false)
					}
				}
			)
		} catch (error) {
			console.error('Failed to start generation:', error)
			setGenerating(false)
		}
	}

	return (
		<div className="spec-generator">
			<h3>Generate Spec from Requirements</h3>

			<div className="requirements-preview">
				<h4>{requirements.length} Requirements</h4>
				<ul>
					{requirements.slice(0, 5).map((req, i) => (
						<li key={i}>{req.text}</li>
					))}
				</ul>
			</div>

			<select value={format} onChange={(e) => setFormat(e.target.value)}>
				<option value="gherkin">Gherkin (BDD)</option>
				<option value="user-story">User Story</option>
				<option value="acceptance-criteria">Acceptance Criteria</option>
				<option value="free-form">Free Form</option>
			</select>

			<button onClick={handleGenerate} disabled={generating}>
				{generating ? 'Generating...' : 'Generate Spec'}
			</button>

			{content && (
				<div className="generated-content">
					<h4>Generated Spec:</h4>
					<pre>{content}</pre>
				</div>
			)}
		</div>
	)
}
```

---

## Phase 7: Test Generation

**Goal:** Generate tests from specs
**Time:** 3-4 hours
**Status:** Stub implementation exists

### 7.1 Create TestGenerator Service

**File:** `src/services/specs/TestGenerator.ts`

```typescript
import { ApiHandler } from "@/core/api"
import { Spec } from "./types"
import * as fs from "fs/promises"
import * as path from "path"

export class TestGenerator {
	constructor(private apiHandler: ApiHandler) {}

	async detectFramework(workspacePath: string): Promise<string> {
		// Check package.json for test framework
		try {
			const pkgPath = path.join(workspacePath, 'package.json')
			const pkg = JSON.parse(await fs.readFile(pkgPath, 'utf-8'))

			if (pkg.devDependencies?.jest || pkg.dependencies?.jest) return 'jest'
			if (pkg.devDependencies?.vitest || pkg.dependencies?.vitest) return 'vitest'
			if (pkg.devDependencies?.mocha || pkg.dependencies?.mocha) return 'mocha'
		} catch {}

		// Check for pytest
		try {
			await fs.access(path.join(workspacePath, 'pytest.ini'))
			return 'pytest'
		} catch {}

		return 'unknown'
	}

	async *generateTests(
		spec: Spec,
		framework: string
	): AsyncIterableIterator<string> {
		const prompt = this.buildTestPrompt(spec, framework)

		const stream = await this.apiHandler.createMessage({
			systemPrompt: this.getTestSystemPrompt(framework),
			messages: [{ role: "user", content: prompt }]
		})

		for await (const chunk of stream) {
			if (chunk.type === 'text') {
				yield chunk.text
			}
		}
	}

	private getTestSystemPrompt(framework: string): string {
		const prompts = {
			"jest": `Generate Jest tests with:
- describe/it blocks
- beforeEach/afterEach setup
- expect assertions
- Mock setup
- Edge case coverage`,

			"vitest": `Generate Vitest tests with:
- describe/it blocks
- beforeEach/afterEach setup
- expect assertions
- vi.mock for mocking
- Edge case coverage`,

			"pytest": `Generate pytest tests with:
- test_ functions
- fixtures for setup
- assert statements
- parametrize for test cases
- Edge case coverage`,
		}
		return prompts[framework] || prompts["jest"]
	}

	private buildTestPrompt(spec: Spec, framework: string): string {
		return `Generate ${framework} tests for this specification:\n\n${spec.content}\n\nFiles: ${spec.files.join(', ')}`
	}

	determineTestPath(spec: Spec, framework: string): string {
		// Logic to determine where test file should go
		const mainFile = spec.files[0] || 'unknown.ts'
		const ext = path.extname(mainFile)
		const base = path.basename(mainFile, ext)
		const dir = path.dirname(mainFile)

		if (framework === 'pytest') {
			return path.join(dir, '__tests__', `test_${base}.py`)
		}

		return path.join(dir, '__tests__', `${base}.test${ext}`)
	}
}
```

### 7.2 Update generateTests Handler

Similar pattern to generateSpec but using TestGenerator.

---

## Testing Strategy

### Phase 3 Testing
```bash
# Start dev server
cd webview-ui && npm run dev

# Test in extension
# 1. Press F5 in VS Code
# 2. Click specs toolbar button
# 3. Create a spec
# 4. Verify it persists (reload extension)
```

### Phase 6 Testing
```bash
# Test generation
# 1. Create a task with several messages
# 2. Extract requirements
# 3. Generate spec
# 4. Verify output makes sense
# 5. Test different formats
```

### Phase 7 Testing
```bash
# Test test generation
# 1. Create a spec
# 2. Generate tests
# 3. Verify framework detection
# 4. Verify test file placement
# 5. Run generated tests
```

---

## Progress Tracking

### Phase 3 Checklist
- [ ] SpecsView component
- [ ] SpecItem component
- [ ] SpecEditor component
- [ ] SpecStatusBadge component
- [ ] TriggerBanner component
- [ ] useSpecs hook
- [ ] useTriggers hook
- [ ] ExtensionStateContext integration
- [ ] App.tsx integration
- [ ] Toolbar button
- [ ] CSS styles
- [ ] Manual testing

### Phase 6 Checklist
- [ ] SpecGenerator service
- [ ] generateSpec handler
- [ ] SpecGenerator UI component
- [ ] Streaming support
- [ ] Format-specific prompts
- [ ] Testing with real requirements

### Phase 7 Checklist
- [ ] TestGenerator service
- [ ] generateTests handler
- [ ] Framework detection
- [ ] Test path logic
- [ ] TestGenerator UI component
- [ ] Testing with different frameworks

---

## Tips & Best Practices

### React Components
- Use TypeScript for all components
- Follow Cline's existing component patterns (see SettingsView, HistoryView)
- Use CSS variables for theming
- Add loading and error states
- Make components accessible

### State Management
- Use React hooks for local state
- Keep webview state minimal
- Refresh data from backend when needed
- Handle errors gracefully

### Streaming
- Always provide feedback during streaming
- Handle cancellation properly
- Show partial results
- Handle errors mid-stream

### Testing
- Test with real projects
- Try different programming languages
- Test edge cases (empty states, errors, long content)
- Get user feedback early

---

## Estimated Completion

| Phase | Hours | Difficulty |
|-------|-------|-----------|
| Phase 3 | 6-8 | Medium |
| Phase 6 | 3-4 | Easy |
| Phase 7 | 3-4 | Medium |
| **Total** | **12-16** | **Medium** |

Add 3-4 hours for testing and polish = **15-20 hours total**

---

## Success Metrics

### Phase 3 Success
- ✅ User can view all specs
- ✅ User can create/edit/delete specs
- ✅ Specs persist across reloads
- ✅ Triggers appear as notifications
- ✅ UI matches Cline's style

### Phase 6 Success
- ✅ Specs are generated from requirements
- ✅ Generation streams in real-time
- ✅ All formats work correctly
- ✅ Generated content is useful

### Phase 7 Success
- ✅ Framework is detected correctly
- ✅ Tests are generated correctly
- ✅ Test files are placed correctly
- ✅ Generated tests pass

---

## Next Steps

1. **Run proto build:** `npm run protos`
2. **Verify Phase 2 works:** Test spec tracking
3. **Start Phase 3:** Build UI components
4. **Test end-to-end:** Use the feature in real coding
5. **Get feedback:** From 5-10 beta users
6. **Polish:** Fix bugs, improve UX
7. **Ship it!** 🚀

---

**Document Version:** 1.0
**Last Updated:** 2025-11-11
**Ready For:** Implementation
