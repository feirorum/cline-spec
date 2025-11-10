/**
 * Main service for Progressive Spec feature
 *
 * Orchestrates spec tracking, generation, and management.
 * This is the primary interface for all spec-related operations.
 */

import { StateManager } from "@/core/storage/StateManager"
import { SpecStorage } from "./SpecStorage"
import { SpecTracker, TrackedMessage } from "./SpecTracker"
import { TriggerDetector } from "./TriggerDetector"
import {
	Spec,
	SpecFilter,
	Requirement,
	Trigger,
	TaskContext,
	SpecFormat,
	GenerationContext,
	GeneratedTest,
	FileChange,
	SpecSettings,
} from "./types"

/**
 * Event listener type for trigger events
 */
export type TriggerCallback = (trigger: Trigger) => void

/**
 * SpecService provides the main API for spec operations
 */
export class SpecService {
	private storage: SpecStorage
	private tracker: SpecTracker
	private triggerDetector: TriggerDetector
	private isInitialized = false

	// Event listeners
	private triggerCallbacks: TriggerCallback[] = []

	// Tracking state
	private currentTaskId: string | null = null

	constructor(stateManager: StateManager) {
		this.storage = new SpecStorage(stateManager)
		this.tracker = new SpecTracker()
		this.triggerDetector = new TriggerDetector(this.tracker)
	}

	/**
	 * Initialize the service
	 */
	async initialize(): Promise<void> {
		if (this.isInitialized) {
			return
		}

		await this.storage.initialize()
		this.isInitialized = true
	}

	// ============================================================================
	// Spec CRUD Operations
	// ============================================================================

	/**
	 * Get all specs
	 */
	async getSpecs(filter?: SpecFilter): Promise<Spec[]> {
		this.ensureInitialized()

		if (filter) {
			return this.storage.filterSpecs(filter)
		}

		return this.storage.getSpecs()
	}

	/**
	 * Get single spec by ID
	 */
	async getSpec(id: string): Promise<Spec | null> {
		this.ensureInitialized()
		return this.storage.getSpec(id)
	}

	/**
	 * Get specs for a specific file
	 */
	async getSpecsByFile(filePath: string): Promise<Spec[]> {
		this.ensureInitialized()
		return this.storage.getSpecsByFile(filePath)
	}

	/**
	 * Add a new spec
	 */
	async addSpec(spec: Omit<Spec, "id">): Promise<Spec> {
		this.ensureInitialized()

		// Generate ID
		const id = this.generateSpecId()

		// Create full spec
		const fullSpec: Spec = {
			...spec,
			id,
			metadata: {
				...spec.metadata,
				createdAt: spec.metadata.createdAt || Date.now(),
				updatedAt: Date.now(),
				version: 1,
			},
		}

		await this.storage.saveSpec(fullSpec)
		return fullSpec
	}

	/**
	 * Update an existing spec
	 */
	async updateSpec(id: string, updates: Partial<Spec>): Promise<Spec> {
		this.ensureInitialized()

		// Ensure updated timestamp is set
		const updatesWithTimestamp = {
			...updates,
			metadata: {
				...updates.metadata,
				updatedAt: Date.now(),
			},
		}

		await this.storage.updateSpec(id, updatesWithTimestamp)

		// Return updated spec
		const updatedSpec = await this.storage.getSpec(id)
		if (!updatedSpec) {
			throw new Error(`Spec ${id} not found after update`)
		}

		return updatedSpec
	}

	/**
	 * Delete a spec
	 */
	async deleteSpec(id: string): Promise<void> {
		this.ensureInitialized()
		await this.storage.deleteSpec(id)
	}

	/**
	 * Search specs
	 */
	async searchSpecs(query: string): Promise<Spec[]> {
		this.ensureInitialized()
		return this.storage.searchSpecs(query)
	}

	// ============================================================================
	// Tracking Operations
	// ============================================================================

	/**
	 * Start tracking for a task
	 */
	startTracking(taskId: string): void {
		this.currentTaskId = taskId
		this.tracker.startTracking(taskId)
	}

	/**
	 * Stop tracking for current task
	 */
	stopTracking(taskId?: string): void {
		const targetTaskId = taskId || this.currentTaskId
		if (targetTaskId) {
			this.tracker.stopTracking(targetTaskId)
		}
		this.currentTaskId = null
	}

	/**
	 * Record a conversation message
	 */
	recordMessage(message: { role: string; content: string; id: string }): void {
		if (!this.currentTaskId) {
			return
		}

		const trackedMessage: TrackedMessage = {
			...message,
			timestamp: Date.now(),
		}

		this.tracker.recordMessage(trackedMessage, this.currentTaskId)
	}

	/**
	 * Record a file change
	 */
	recordFileChange(file: string, change: FileChange): void {
		if (!this.currentTaskId) {
			return
		}

		this.tracker.recordFileChange(file, change, this.currentTaskId)
	}

	/**
	 * Get tracked conversation messages
	 */
	getTrackedMessages(taskId?: string): TrackedMessage[] {
		const targetTaskId = taskId || this.currentTaskId
		return this.tracker.getMessageHistory(targetTaskId)
	}

	/**
	 * Get file modification count
	 */
	getFileModificationCount(file: string, taskId?: string): number {
		const targetTaskId = taskId || this.currentTaskId
		return this.tracker.getFileModificationCount(file, targetTaskId)
	}

	/**
	 * Get all tracked files
	 */
	getTrackedFiles(taskId?: string): string[] {
		const targetTaskId = taskId || this.currentTaskId
		return this.tracker.getTrackedFiles(targetTaskId)
	}

	// ============================================================================
	// Requirement Extraction
	// ============================================================================

	/**
	 * Extract requirements from conversation
	 */
	async extractRequirements(taskId?: string): Promise<Requirement[]> {
		this.ensureInitialized()

		const targetTaskId = taskId || this.currentTaskId
		if (!targetTaskId) {
			return []
		}

		// Use SpecTracker to analyze conversation and extract requirements
		const messages = this.tracker.getMessageHistory(targetTaskId)
		return this.tracker.extractRequirements(messages)
	}

	/**
	 * Analyze full conversation for insights
	 */
	async analyzeConversation(taskId?: string): Promise<any> {
		this.ensureInitialized()

		const targetTaskId = taskId || this.currentTaskId
		if (!targetTaskId) {
			throw new Error("No task ID provided for analysis")
		}

		return this.tracker.analyzeConversation(targetTaskId)
	}

	// ============================================================================
	// Spec Generation
	// ============================================================================

	/**
	 * Generate a spec from requirements
	 *
	 * TODO: Implement full generation logic with LLM
	 * For now, returns placeholder content
	 */
	async generateSpec(
		requirements: Requirement[],
		format: SpecFormat,
		context?: GenerationContext,
	): Promise<string> {
		this.ensureInitialized()

		// TODO: Implement spec generation using LLM
		// Build prompt with requirements and context
		// Stream response
		// Format according to spec format

		return `# Generated ${format} Spec\n\n[Placeholder: Spec generation not yet implemented]`
	}

	/**
	 * Improve an existing spec based on feedback
	 */
	async improveSpec(existingSpec: string, feedback: string): Promise<string> {
		this.ensureInitialized()

		// TODO: Implement spec improvement with LLM

		return existingSpec
	}

	// ============================================================================
	// Test Generation
	// ============================================================================

	/**
	 * Generate tests from a spec
	 *
	 * TODO: Implement test generation
	 * For now, returns placeholder
	 */
	async generateTests(specId: string): Promise<GeneratedTest> {
		this.ensureInitialized()

		const spec = await this.storage.getSpec(specId)
		if (!spec) {
			throw new Error(`Spec ${specId} not found`)
		}

		// TODO: Implement test generation
		// - Detect test framework
		// - Generate tests based on spec format
		// - Return test code with file path and run command

		return {
			framework: "jest",
			filePath: "test/placeholder.test.ts",
			content: "// Placeholder: Test generation not yet implemented",
			runCommand: "npm test",
		}
	}

	// ============================================================================
	// Trigger Detection
	// ============================================================================

	/**
	 * Detect triggers for current task context
	 */
	async detectTriggers(context: TaskContext): Promise<Trigger[]> {
		this.ensureInitialized()

		// Use TriggerDetector to check for triggers
		const triggers = this.triggerDetector.detectTriggers(context)

		// Filter out suppressed triggers
		const filteredTriggers = this.triggerDetector.filterTriggers(triggers)

		// Store triggers in storage for later retrieval
		for (const trigger of filteredTriggers) {
			await this.storage.addTrigger(trigger)
		}

		// Emit triggers to listeners
		for (const trigger of filteredTriggers) {
			this.emitTrigger(trigger)
		}

		return filteredTriggers
	}

	/**
	 * Create a manual trigger
	 */
	async createManualTrigger(context: TaskContext, message?: string): Promise<Trigger> {
		this.ensureInitialized()

		const trigger = this.triggerDetector.createManualTrigger(context, message || "")
		await this.storage.addTrigger(trigger)
		this.emitTrigger(trigger)

		return trigger
	}

	/**
	 * Get recommended files for spec creation
	 */
	getRecommendedFiles(context: TaskContext, limit?: number): string[] {
		return this.triggerDetector.getRecommendedFilesForSpecs(context, limit)
	}

	/**
	 * Subscribe to trigger events
	 */
	onTrigger(callback: TriggerCallback): () => void {
		this.triggerCallbacks.push(callback)

		// Return unsubscribe function
		return () => {
			const index = this.triggerCallbacks.indexOf(callback)
			if (index !== -1) {
				this.triggerCallbacks.splice(index, 1)
			}
		}
	}

	/**
	 * Emit a trigger to all listeners
	 */
	private emitTrigger(trigger: Trigger): void {
		for (const callback of this.triggerCallbacks) {
			try {
				callback(trigger)
			} catch (error) {
				console.error("[SpecService] Error in trigger callback:", error)
			}
		}
	}

	// ============================================================================
	// Trigger Management
	// ============================================================================

	/**
	 * Get all triggers
	 */
	async getTriggers(): Promise<Trigger[]> {
		this.ensureInitialized()
		return this.storage.getTriggers()
	}

	/**
	 * Dismiss a trigger
	 */
	async dismissTrigger(triggerId: string): Promise<void> {
		this.ensureInitialized()
		await this.storage.dismissTrigger(triggerId)
	}

	/**
	 * Clear old dismissed triggers
	 */
	async clearOldTriggers(maxAgeMs?: number): Promise<void> {
		this.ensureInitialized()
		await this.storage.clearOldTriggers(maxAgeMs)
	}

	// ============================================================================
	// Settings
	// ============================================================================

	/**
	 * Get spec settings
	 */
	async getSettings(): Promise<SpecSettings> {
		this.ensureInitialized()
		return this.storage.getSettings()
	}

	/**
	 * Update spec settings
	 */
	async updateSettings(updates: Partial<SpecSettings>): Promise<void> {
		this.ensureInitialized()
		await this.storage.updateSettings(updates)
	}

	// ============================================================================
	// Statistics
	// ============================================================================

	/**
	 * Get statistics about specs
	 */
	async getStats(): Promise<{
		totalSpecs: number
		byStatus: Record<string, number>
		byFormat: Record<string, number>
		filesWithSpecs: number
		activeTriggers: number
	}> {
		this.ensureInitialized()
		return this.storage.getStats()
	}

	// ============================================================================
	// Import/Export
	// ============================================================================

	/**
	 * Export specs as JSON
	 */
	async exportSpecs(): Promise<string> {
		this.ensureInitialized()
		return this.storage.exportSpecs()
	}

	/**
	 * Import specs from JSON
	 */
	async importSpecs(json: string): Promise<number> {
		this.ensureInitialized()
		return this.storage.importSpecs(json)
	}

	// ============================================================================
	// Helper Methods
	// ============================================================================

	private ensureInitialized(): void {
		if (!this.isInitialized) {
			throw new Error("SpecService must be initialized before use")
		}
	}

	private generateSpecId(): string {
		return `spec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
	}
}
