/**
 * Type definitions for the Progressive Spec feature
 *
 * This feature implements "progressive formalization" - allowing users to start
 * with fast vibe coding but gradually suggesting specification when complexity emerges.
 */

// ============================================================================
// Core Spec Types
// ============================================================================

/**
 * A specification document that captures requirements for a feature or component
 */
export interface Spec {
	/** Unique identifier */
	id: string

	/** Human-readable title */
	title: string

	/** Spec content in the specified format */
	content: string

	/** Format of the spec */
	format: SpecFormat

	/** Current status */
	status: SpecStatus

	/** Source files associated with this spec */
	files: string[]

	/** Associated test files */
	tests?: TestInfo[]

	/** Tags for categorization */
	tags: string[]

	/** Metadata about creation and updates */
	metadata: SpecMetadata
}

/**
 * Supported specification formats
 */
export type SpecFormat = "gherkin" | "user-story" | "acceptance-criteria" | "free-form"

/**
 * Spec lifecycle status
 */
export type SpecStatus = "draft" | "active" | "archived" | "implemented"

/**
 * Metadata about a spec's creation and lifecycle
 */
export interface SpecMetadata {
	/** Creation timestamp (Unix ms) */
	createdAt: number

	/** Last update timestamp (Unix ms) */
	updatedAt: number

	/** Who created it: user manually or AI extraction */
	createdBy: "user" | "ai"

	/** Source task ID if extracted from conversation */
	source?: string

	/** Version number (for future versioning support) */
	version: number
}

/**
 * Information about a test file associated with a spec
 */
export interface TestInfo {
	/** Path to test file */
	filePath: string

	/** Test framework used */
	framework: TestFramework

	/** Last known test status */
	status: TestStatus

	/** Last time tests were run (Unix ms) */
	lastRun?: number
}

/**
 * Test execution status
 */
export type TestStatus = "passing" | "failing" | "not-run"

/**
 * Supported test frameworks
 */
export type TestFramework = "jest" | "vitest" | "mocha" | "pytest" | "go" | "junit"

// ============================================================================
// Requirement Types
// ============================================================================

/**
 * A single requirement extracted from conversation or defined by user
 */
export interface Requirement {
	/** Unique identifier */
	id: string

	/** Requirement text */
	text: string

	/** Where this requirement came from */
	source: RequirementSource

	/** If from conversation, link to message ID */
	messageId?: string

	/** Confidence score for AI-extracted requirements (0-1) */
	confidence: number

	/** Files this requirement relates to */
	files: string[]
}

/**
 * Source of a requirement
 */
export type RequirementSource = "conversation" | "user" | "extracted"

// ============================================================================
// Trigger Types
// ============================================================================

/**
 * A trigger suggesting that spec formalization would be valuable
 */
export interface Trigger {
	/** Unique identifier */
	id: string

	/** Type of trigger */
	type: TriggerType

	/** Severity level */
	severity: TriggerSeverity

	/** Human-readable message explaining the trigger */
	message: string

	/** Context about what triggered this */
	context: TriggerContext

	/** Suggested action to take */
	suggestedAction: SuggestedAction

	/** When this trigger was created (Unix ms) */
	timestamp: number

	/** Whether user dismissed this trigger */
	dismissed?: boolean
}

/**
 * Types of triggers that can suggest spec creation
 */
export type TriggerType = "complexity" | "frequency" | "keywords" | "contradiction" | "manual"

/**
 * Severity levels for triggers
 */
export type TriggerSeverity = "info" | "warning" | "error"

/**
 * Context information about what caused a trigger
 */
export interface TriggerContext {
	/** Files involved */
	files?: string[]

	/** Message IDs involved */
	messages?: string[]

	/** Metrics that triggered this (e.g., {lines: 350, threshold: 300}) */
	metrics?: Record<string, number>

	/** Task ID if applicable */
	taskId?: string
}

/**
 * Suggested action in response to a trigger
 */
export interface SuggestedAction {
	/** Type of action suggested */
	type: ActionType

	/** Human-readable description */
	description: string

	/** Whether this action could be automatically applied */
	autoApply?: boolean
}

/**
 * Types of actions that can be suggested
 */
export type ActionType = "extract_spec" | "review_requirements" | "add_tests" | "refactor"

// ============================================================================
// Analysis Types
// ============================================================================

/**
 * Result of analyzing a conversation for requirements
 */
export interface ConversationAnalysis {
	/** Extracted requirements */
	requirements: Requirement[]

	/** Detected contradictions in the conversation */
	contradictions: Contradiction[]

	/** File mentions and their frequency */
	fileReferences: Map<string, number>

	/** Overall complexity score (0-1) */
	complexity: number
}

/**
 * A contradiction detected in conversation (user changed their mind)
 */
export interface Contradiction {
	/** IDs of the contradicting messages [original, contradiction] */
	messageIds: [string, string]

	/** Description of the contradiction */
	description: string

	/** Severity of the contradiction */
	severity: ContradictionSeverity
}

/**
 * Contradiction severity levels
 */
export type ContradictionSeverity = "minor" | "major"

// ============================================================================
// File Change Tracking
// ============================================================================

/**
 * Record of a file change during task execution
 */
export interface FileChange {
	/** Type of change */
	type: FileChangeType

	/** Path to the file */
	filePath: string

	/** When the change occurred (Unix ms) */
	timestamp: number

	/** Task ID when change occurred */
	taskId: string
}

/**
 * Types of file changes we track
 */
export type FileChangeType = "edit" | "write" | "delete"

// ============================================================================
// Generation Types
// ============================================================================

/**
 * Context for generating a spec
 */
export interface GenerationContext {
	/** Conversation history to consider */
	conversationHistory?: Array<{ role: string; content: string }>

	/** Related files to consider */
	relatedFiles?: string[]

	/** Existing specs to reference */
	existingSpecs?: Spec[]

	/** Example scenarios to include */
	examples?: Example[]
}

/**
 * An example scenario to include in spec generation
 */
export interface Example {
	/** Input or precondition */
	input: string

	/** Expected output or result */
	expected: string

	/** Optional description */
	description?: string
}

/**
 * Result of generating tests from a spec
 */
export interface GeneratedTest {
	/** Test framework used */
	framework: TestFramework

	/** Suggested file path for the test */
	filePath: string

	/** Generated test code */
	content: string

	/** Command to run the tests */
	runCommand: string
}

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Configuration for trigger detection
 */
export interface TriggerConfig {
	/** Maximum lines per file before complexity trigger */
	maxLinesPerFile: number

	/** Maximum cyclomatic complexity before trigger */
	maxCyclomaticComplexity: number

	/** Maximum modifications per task before frequency trigger */
	maxModificationsPerTask: number

	/** Keywords that indicate bugs/issues */
	bugKeywords: string[]

	/** Threshold for bug keyword mentions */
	bugKeywordThreshold: number

	/** Keywords that indicate contradictions */
	contradictionKeywords: string[]
}

/**
 * Settings for spec feature behavior
 */
export interface SpecSettings {
	/** Whether spec feature is enabled */
	enabled: boolean

	/** Whether to automatically detect triggers */
	autoDetectTriggers: boolean

	/** Trigger configuration */
	triggerConfig: TriggerConfig

	/** Default format for new specs */
	defaultFormat: SpecFormat

	/** Storage mode: local or committed to repo */
	storageMode: StorageMode

	/** Directory for specs if storageMode is 'repo' */
	specDirectory?: string
}

/**
 * Where specs are stored
 */
export type StorageMode = "local" | "repo"

// ============================================================================
// Filter and Query Types
// ============================================================================

/**
 * Filter for querying specs
 */
export interface SpecFilter {
	/** Filter by status */
	status?: SpecStatus

	/** Filter by format */
	format?: SpecFormat

	/** Filter by file path */
	file?: string

	/** Filter by tag */
	tag?: string

	/** Text search in title/content */
	search?: string
}

// ============================================================================
// Task Context Types
// ============================================================================

/**
 * Context about current task for trigger detection
 */
export interface TaskContext {
	/** Task identifier */
	taskId: string

	/** Files modified in this task */
	modifiedFiles: string[]

	/** Conversation messages in this task */
	conversation: Array<{ role: string; content: string; id: string }>

	/** Current code being worked on */
	code?: string
}

// ============================================================================
// Storage Schema Types
// ============================================================================

/**
 * Schema for specs stored in StateManager
 */
export interface SpecsState {
	/** Global specs (user-created, apply to all workspaces) */
	global: Spec[]

	/** Workspace-specific specs */
	workspaces: Record<string, WorkspaceSpecs>
}

/**
 * Specs for a specific workspace
 */
export interface WorkspaceSpecs {
	/** Specs for this workspace */
	specs: Spec[]

	/** Active triggers for this workspace */
	triggers: Trigger[]

	/** Settings for this workspace */
	settings: SpecSettings
}

// ============================================================================
// Default Values
// ============================================================================

/**
 * Default trigger configuration
 */
export const DEFAULT_TRIGGER_CONFIG: TriggerConfig = {
	maxLinesPerFile: 300,
	maxCyclomaticComplexity: 10,
	maxModificationsPerTask: 3,
	bugKeywords: ["bug", "issue", "problem", "broken", "error", "fix"],
	bugKeywordThreshold: 3,
	contradictionKeywords: ["actually", "wait", "no", "correction", "instead", "rather"],
}

/**
 * Default spec settings
 */
export const DEFAULT_SPEC_SETTINGS: SpecSettings = {
	enabled: true,
	autoDetectTriggers: true,
	triggerConfig: DEFAULT_TRIGGER_CONFIG,
	defaultFormat: "gherkin",
	storageMode: "local",
}
