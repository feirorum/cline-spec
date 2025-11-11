/**
 * Storage layer for specs using StateManager
 *
 * Provides CRUD operations for specs with persistence through Cline's StateManager.
 * Specs are stored in global state and organized by workspace.
 */

import { StateManager } from "@/core/storage/StateManager"
import { DEFAULT_SPEC_SETTINGS, Spec, SpecFilter, SpecSettings, SpecsState, Trigger, WorkspaceSpecs } from "./types"

export class SpecStorage {
	private stateManager: StateManager

	/**
	 * In-memory cache for fast access
	 * Synced with StateManager
	 */
	private cache: SpecsState = {
		global: [],
		workspaces: {},
	}

	constructor(stateManager: StateManager) {
		this.stateManager = stateManager
	}

	/**
	 * Initialize storage by loading specs from StateManager
	 */
	async initialize(): Promise<void> {
		// Load specs from StateManager (if they exist)
		const storedSpecs = this.stateManager.getGlobalStateKey("specs" as any)

		if (storedSpecs) {
			this.cache = storedSpecs as SpecsState
		} else {
			// Initialize empty specs structure
			this.cache = {
				global: [],
				workspaces: {},
			}
			await this.persist()
		}
	}

	/**
	 * Get current workspace ID
	 * Returns hash of workspace folder path
	 */
	private getCurrentWorkspaceId(): string {
		// TODO: Get actual workspace ID from context
		// For now, use a default value
		return "default-workspace"
	}

	/**
	 * Get workspace specs, creating if doesn't exist
	 */
	private getWorkspaceSpecs(workspaceId: string): WorkspaceSpecs {
		if (!this.cache.workspaces[workspaceId]) {
			this.cache.workspaces[workspaceId] = {
				specs: [],
				triggers: [],
				settings: { ...DEFAULT_SPEC_SETTINGS },
			}
		}
		return this.cache.workspaces[workspaceId]
	}

	// ============================================================================
	// Spec CRUD Operations
	// ============================================================================

	/**
	 * Get all specs (global + current workspace)
	 */
	async getSpecs(workspaceId?: string): Promise<Spec[]> {
		const wsId = workspaceId || this.getCurrentWorkspaceId()
		const workspaceSpecs = this.getWorkspaceSpecs(wsId)

		return [...this.cache.global, ...workspaceSpecs.specs]
	}

	/**
	 * Get spec by ID
	 */
	async getSpec(id: string): Promise<Spec | null> {
		// Check global specs
		const globalSpec = this.cache.global.find((s) => s.id === id)
		if (globalSpec) {
			return globalSpec
		}

		// Check all workspaces
		for (const workspace of Object.values(this.cache.workspaces)) {
			const spec = workspace.specs.find((s) => s.id === id)
			if (spec) {
				return spec
			}
		}

		return null
	}

	/**
	 * Get specs by file path
	 */
	async getSpecsByFile(filePath: string, workspaceId?: string): Promise<Spec[]> {
		const allSpecs = await this.getSpecs(workspaceId)
		return allSpecs.filter((spec) => spec.files.includes(filePath))
	}

	/**
	 * Search specs by query
	 */
	async searchSpecs(query: string, workspaceId?: string): Promise<Spec[]> {
		const allSpecs = await this.getSpecs(workspaceId)
		const lowerQuery = query.toLowerCase()

		return allSpecs.filter(
			(spec) =>
				spec.title.toLowerCase().includes(lowerQuery) ||
				spec.content.toLowerCase().includes(lowerQuery) ||
				spec.tags.some((tag) => tag.toLowerCase().includes(lowerQuery)),
		)
	}

	/**
	 * Filter specs
	 */
	async filterSpecs(filter: SpecFilter, workspaceId?: string): Promise<Spec[]> {
		const allSpecs = await this.getSpecs(workspaceId)

		return allSpecs.filter((spec) => {
			// Status filter
			if (filter.status && spec.status !== filter.status) {
				return false
			}

			// Format filter
			if (filter.format && spec.format !== filter.format) {
				return false
			}

			// File filter
			if (filter.file && !spec.files.includes(filter.file)) {
				return false
			}

			// Tag filter
			if (filter.tag && !spec.tags.includes(filter.tag)) {
				return false
			}

			// Search filter
			if (filter.search) {
				const lowerSearch = filter.search.toLowerCase()
				const matchesTitle = spec.title.toLowerCase().includes(lowerSearch)
				const matchesContent = spec.content.toLowerCase().includes(lowerSearch)
				if (!matchesTitle && !matchesContent) {
					return false
				}
			}

			return true
		})
	}

	/**
	 * Save a new spec
	 */
	async saveSpec(spec: Spec, workspaceId?: string): Promise<void> {
		// Determine if global or workspace spec based on metadata
		const isGlobal = spec.metadata.createdBy === "user" && !workspaceId

		if (isGlobal) {
			this.cache.global.push(spec)
		} else {
			const wsId = workspaceId || this.getCurrentWorkspaceId()
			const workspaceSpecs = this.getWorkspaceSpecs(wsId)
			workspaceSpecs.specs.push(spec)
		}

		await this.persist()
	}

	/**
	 * Update an existing spec
	 */
	async updateSpec(id: string, updates: Partial<Spec>): Promise<void> {
		// Find the spec in global specs
		let spec = this.cache.global.find((s) => s.id === id)
		if (spec) {
			Object.assign(spec, updates)
			spec.metadata.updatedAt = Date.now()
			await this.persist()
			return
		}

		// Find in workspace specs
		for (const workspace of Object.values(this.cache.workspaces)) {
			spec = workspace.specs.find((s) => s.id === id)
			if (spec) {
				Object.assign(spec, updates)
				spec.metadata.updatedAt = Date.now()
				await this.persist()
				return
			}
		}

		throw new Error(`Spec with id ${id} not found`)
	}

	/**
	 * Delete a spec
	 */
	async deleteSpec(id: string): Promise<void> {
		// Try global specs
		const globalIndex = this.cache.global.findIndex((s) => s.id === id)
		if (globalIndex !== -1) {
			this.cache.global.splice(globalIndex, 1)
			await this.persist()
			return
		}

		// Try workspace specs
		for (const workspace of Object.values(this.cache.workspaces)) {
			const index = workspace.specs.findIndex((s) => s.id === id)
			if (index !== -1) {
				workspace.specs.splice(index, 1)
				await this.persist()
				return
			}
		}

		throw new Error(`Spec with id ${id} not found`)
	}

	// ============================================================================
	// Trigger Operations
	// ============================================================================

	/**
	 * Get triggers for current workspace
	 */
	async getTriggers(workspaceId?: string): Promise<Trigger[]> {
		const wsId = workspaceId || this.getCurrentWorkspaceId()
		const workspaceSpecs = this.getWorkspaceSpecs(wsId)
		return workspaceSpecs.triggers
	}

	/**
	 * Add a trigger
	 */
	async addTrigger(trigger: Trigger, workspaceId?: string): Promise<void> {
		const wsId = workspaceId || this.getCurrentWorkspaceId()
		const workspaceSpecs = this.getWorkspaceSpecs(wsId)
		workspaceSpecs.triggers.push(trigger)
		await this.persist()
	}

	/**
	 * Dismiss a trigger
	 */
	async dismissTrigger(triggerId: string, workspaceId?: string): Promise<void> {
		const wsId = workspaceId || this.getCurrentWorkspaceId()
		const workspaceSpecs = this.getWorkspaceSpecs(wsId)

		const trigger = workspaceSpecs.triggers.find((t) => t.id === triggerId)
		if (trigger) {
			trigger.dismissed = true
			await this.persist()
		}
	}

	/**
	 * Clear old dismissed triggers (cleanup)
	 */
	async clearOldTriggers(maxAgeMs: number = 7 * 24 * 60 * 60 * 1000, workspaceId?: string): Promise<void> {
		const wsId = workspaceId || this.getCurrentWorkspaceId()
		const workspaceSpecs = this.getWorkspaceSpecs(wsId)
		const now = Date.now()

		workspaceSpecs.triggers = workspaceSpecs.triggers.filter((t) => !t.dismissed || now - t.timestamp < maxAgeMs)

		await this.persist()
	}

	// ============================================================================
	// Settings Operations
	// ============================================================================

	/**
	 * Get settings for workspace
	 */
	async getSettings(workspaceId?: string): Promise<SpecSettings> {
		const wsId = workspaceId || this.getCurrentWorkspaceId()
		const workspaceSpecs = this.getWorkspaceSpecs(wsId)
		return workspaceSpecs.settings
	}

	/**
	 * Update settings for workspace
	 */
	async updateSettings(updates: Partial<SpecSettings>, workspaceId?: string): Promise<void> {
		const wsId = workspaceId || this.getCurrentWorkspaceId()
		const workspaceSpecs = this.getWorkspaceSpecs(wsId)

		Object.assign(workspaceSpecs.settings, updates)
		await this.persist()
	}

	// ============================================================================
	// Statistics
	// ============================================================================

	/**
	 * Get statistics about specs
	 */
	async getStats(workspaceId?: string): Promise<{
		totalSpecs: number
		byStatus: Record<string, number>
		byFormat: Record<string, number>
		filesWithSpecs: number
		activeTriggers: number
	}> {
		const specs = await this.getSpecs(workspaceId)
		const triggers = await this.getTriggers(workspaceId)

		const byStatus: Record<string, number> = {}
		const byFormat: Record<string, number> = {}
		const filesSet = new Set<string>()

		for (const spec of specs) {
			byStatus[spec.status] = (byStatus[spec.status] || 0) + 1
			byFormat[spec.format] = (byFormat[spec.format] || 0) + 1
			spec.files.forEach((f) => filesSet.add(f))
		}

		return {
			totalSpecs: specs.length,
			byStatus,
			byFormat,
			filesWithSpecs: filesSet.size,
			activeTriggers: triggers.filter((t) => !t.dismissed).length,
		}
	}

	// ============================================================================
	// Persistence
	// ============================================================================

	/**
	 * Persist cache to StateManager
	 */
	private async persist(): Promise<void> {
		this.stateManager.setGlobalState("specs" as any, this.cache as any)
	}

	/**
	 * Export specs as JSON (for backup/sharing)
	 */
	async exportSpecs(workspaceId?: string): Promise<string> {
		const specs = await this.getSpecs(workspaceId)
		return JSON.stringify(specs, null, 2)
	}

	/**
	 * Import specs from JSON
	 */
	async importSpecs(json: string, workspaceId?: string): Promise<number> {
		const specs = JSON.parse(json) as Spec[]
		const wsId = workspaceId || this.getCurrentWorkspaceId()

		for (const spec of specs) {
			await this.saveSpec(spec, wsId)
		}

		return specs.length
	}
}
