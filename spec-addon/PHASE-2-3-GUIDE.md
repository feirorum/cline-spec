# Phase 2-3 Implementation Guide

**Status:** Partially Complete
**Date:** 2025-11-10

This guide shows how to complete Phases 2-3 (gRPC integration and UI components).

---

## Phase 2: gRPC Integration (90% Complete)

### ✅ Completed:

1. **Proto definitions** - `proto/cline/specs.proto`
   - All service methods defined
   - All message types defined
   - Follows Cline proto conventions

2. **gRPC handlers** - `src/core/controller/specs/index.ts`
   - All CRUD handlers implemented
   - Trigger handlers implemented
   - Settings and stats handlers implemented
   - Conversion utilities for proto ↔ internal types

### ⏳ Remaining Work:

**1. Add SpecService to Controller** (`src/core/controller/index.ts`)

```typescript
// Add to imports
import { SpecService } from "@/services/specs"

// Add to class properties
export class Controller {
	// ... existing properties ...

	private specService: SpecService

	constructor(readonly context: vscode.ExtensionContext) {
		// ... existing code ...

		// Initialize SpecService
		this.specService = new SpecService(this.stateManager)
		this.specService.initialize().catch((error) => {
			console.error("Failed to initialize SpecService:", error)
		})
	}

	// Add getter method
	getSpecService(): SpecService {
		return this.specService
	}

	async dispose() {
		// ... existing code ...

		// Stop tracking on disposal
		if (this.task?.taskId) {
			this.specService.stopTracking(this.task.taskId)
		}
	}
}
```

**2. Register gRPC handlers** (`src/core/controller/grpc-service.ts`)

Need to add spec handlers to the gRPC service registration. Look for where other services are registered and add:

```typescript
import * as specHandlers from "./specs"

// In service registration:
// Spec Service
specService: {
	getSpecs: specHandlers.getSpecs,
	getSpec: specHandlers.getSpec,
	addSpec: specHandlers.addSpec,
	updateSpec: specHandlers.updateSpec,
	deleteSpec: specHandlers.deleteSpec,
	searchSpecs: specHandlers.searchSpecs,
	extractRequirements: specHandlers.extractRequirements,
	detectTriggers: specHandlers.detectTriggers,
	createManualTrigger: specHandlers.createManualTrigger,
	dismissTrigger: specHandlers.dismissTrigger,
	getTriggers: specHandlers.getTriggers,
	getSettings: specHandlers.getSettings,
	updateSettings: specHandlers.updateSettings,
	getStats: specHandlers.getStats,
	exportSpecs: specHandlers.exportSpecs,
	importSpecs: specHandlers.importSpecs,
}
```

**3. Hook into Task lifecycle** (`src/core/task/index.ts`)

Add tracking hooks to the Task class:

```typescript
// When task starts
async initialize(/* ... */) {
	// ... existing code ...

	// Start spec tracking
	this.controller.getSpecService().startTracking(this.taskId)
}

// When messages are added
async addMessage(message: any) {
	// ... existing code ...

	// Record message for spec tracking
	this.controller.getSpecService().recordMessage({
		id: message.id || generateId(),
		role: message.role,
		content: message.content
	})
}

// When tools are executed
async executeTool(tool: any) {
	// ... existing code ...

	// Record file changes
	if (['edit', 'write', 'notebook_edit'].includes(tool.name)) {
		this.controller.getSpecService().recordFileChange(
			tool.params.file_path,
			{
				type: tool.name,
				filePath: tool.params.file_path,
				timestamp: Date.now(),
				taskId: this.taskId
			}
		)
	}
}

// When task completes/clears
async clearTask() {
	// ... existing code ...

	// Detect triggers before stopping
	const triggers = await this.controller.getSpecService().detectTriggers({
		taskId: this.taskId,
		modifiedFiles: this.getModifiedFiles(),
		conversation: this.getConversation(),
	})

	// Stop tracking
	this.controller.getSpecService().stopTracking(this.taskId)
}
```

---

## Phase 3: UI Components

### Component Structure

```
webview-ui/src/components/specs/
├── SpecsView.tsx           # Main panel (similar to SettingsView)
├── SpecItem.tsx            # Individual spec display
├── SpecEditor.tsx          # Create/edit spec form
├── TriggerBanner.tsx       # Notification banner
├── SpecStatusBadge.tsx     # Status indicator
└── styles/
    └── specs.css           # Component styles
```

### 1. SpecsView Component

```tsx
// webview-ui/src/components/specs/SpecsView.tsx
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

### 2. useSpecs Hook

```typescript
// webview-ui/src/hooks/useSpecs.ts
import { useState, useCallback } from 'react'
import { vscode } from '../utilities/vscode'
import { Spec } from '../types/specs'

export function useSpecs() {
	const [specs, setSpecs] = useState<Spec[]>([])
	const [loading, setLoading] = useState(false)

	const refresh = useCallback(async () => {
		setLoading(true)
		try {
			// Call gRPC getSpecs
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

### 3. Add to ExtensionStateContext

```typescript
// webview-ui/src/context/ExtensionStateContext.tsx

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

### 4. Add to App.tsx

```tsx
// webview-ui/src/App.tsx
import { SpecsView } from './components/specs/SpecsView'

// In render:
{showSpecs && <SpecsView />}
```

### 5. TriggerBanner Component

```tsx
// webview-ui/src/components/specs/TriggerBanner.tsx
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

### 6. Add toolbar button

In `package.json`, add to the contributes section:

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
					"group": "navigation"
				}
			]
		}
	}
}
```

And register the command in `src/extension.ts`:

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

---

## Testing the Integration

### Manual Test Steps:

1. **Start extension in debug mode**
2. **Open a project and start a task**
3. **Make some changes** (edit files multiple times)
4. **Complete the task**
5. **Check if triggers fire** (should see console logs)
6. **Open specs panel** (click toolbar button)
7. **Create a manual spec**
8. **Verify it persists** (reload extension)

### Console Checks:

```javascript
// In browser console (F12)
// Check if specs are loaded
await vscode.getSpecs({})

// Check if tracking works
await vscode.getStats({})

// Create a test spec
await vscode.addSpec({
	title: "Test Spec",
	content: "Feature: Test\n  Scenario: Testing",
	format: "gherkin",
	status: "draft",
	files: ["test.ts"],
	tags: ["test"],
	createdBy: "user"
})
```

---

## Next Steps After Phase 3:

### Phase 6: Spec Generation (LLM Integration)

Implement `SpecGenerator.ts`:

```typescript
import { ApiHandler } from "@/core/api"

export class SpecGenerator {
	constructor(private apiHandler: ApiHandler) {}

	async generateSpec(
		requirements: Requirement[],
		format: SpecFormat,
		context?: GenerationContext
	): Promise<AsyncIterableIterator<string>> {
		const prompt = this.buildPrompt(requirements, format, context)

		// Use Cline's existing LLM integration
		const stream = await this.apiHandler.createMessage({
			systemPrompt: "You are a spec generator...",
			messages: [{ role: "user", content: prompt }]
		})

		return this.streamSpecContent(stream)
	}

	private buildPrompt(
		requirements: Requirement[],
		format: SpecFormat,
		context?: GenerationContext
	): string {
		// Build comprehensive prompt based on format
		return `Generate a ${format} specification from these requirements:\n\n` +
			requirements.map((r, i) => `${i + 1}. ${r.text}`).join('\n')
	}
}
```

### Phase 7: Test Generation

Implement framework detection and test generation.

---

## Summary

**Phase 2:** 90% complete (just needs Controller integration)
**Phase 3:** 0% complete (UI components to be built)

**Estimated time to complete:**
- Phase 2 completion: 1-2 hours
- Phase 3 UI: 4-6 hours
- Testing & polish: 2-3 hours

**Total:** ~8-10 hours of development work

The foundation is solid. The remaining work is mostly UI and wiring.
