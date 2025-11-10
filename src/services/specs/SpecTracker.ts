/**
 * SpecTracker - Monitors conversations and extracts requirements
 *
 * This class tracks conversation messages and file changes during task execution,
 * then analyzes them to extract implicit requirements using keyword-based heuristics.
 */

import { Requirement, FileChange, ConversationAnalysis, Contradiction, RequirementSource } from "./types"

/**
 * Message structure for tracking
 */
export interface TrackedMessage {
	id: string
	role: string
	content: string
	timestamp: number
}

/**
 * SpecTracker monitors conversations and extracts requirements
 */
export class SpecTracker {
	// Conversation history per task
	private messageHistory: Map<string, TrackedMessage[]> = new Map()

	// File changes per task
	private fileChanges: Map<string, Map<string, FileChange[]>> = new Map()

	// Extracted requirements per task
	private requirements: Map<string, Requirement[]> = new Map()

	// Current task being tracked
	private currentTaskId: string | null = null

	// ============================================================================
	// Lifecycle Methods
	// ============================================================================

	/**
	 * Start tracking a new task
	 */
	startTracking(taskId: string): void {
		this.currentTaskId = taskId

		if (!this.messageHistory.has(taskId)) {
			this.messageHistory.set(taskId, [])
		}

		if (!this.fileChanges.has(taskId)) {
			this.fileChanges.set(taskId, new Map())
		}

		if (!this.requirements.has(taskId)) {
			this.requirements.set(taskId, [])
		}
	}

	/**
	 * Stop tracking current task
	 */
	stopTracking(taskId: string): void {
		if (this.currentTaskId === taskId) {
			this.currentTaskId = null
		}
	}

	/**
	 * Clear tracking data for a task (cleanup)
	 */
	clearTask(taskId: string): void {
		this.messageHistory.delete(taskId)
		this.fileChanges.delete(taskId)
		this.requirements.delete(taskId)
	}

	// ============================================================================
	// Recording Methods
	// ============================================================================

	/**
	 * Record a conversation message
	 */
	recordMessage(message: TrackedMessage, taskId?: string): void {
		const targetTaskId = taskId || this.currentTaskId
		if (!targetTaskId) {
			return
		}

		if (!this.messageHistory.has(targetTaskId)) {
			this.messageHistory.set(targetTaskId, [])
		}

		this.messageHistory.get(targetTaskId)!.push(message)
	}

	/**
	 * Record a file change
	 */
	recordFileChange(file: string, change: FileChange, taskId?: string): void {
		const targetTaskId = taskId || this.currentTaskId
		if (!targetTaskId) {
			return
		}

		if (!this.fileChanges.has(targetTaskId)) {
			this.fileChanges.set(targetTaskId, new Map())
		}

		const taskFileChanges = this.fileChanges.get(targetTaskId)!

		if (!taskFileChanges.has(file)) {
			taskFileChanges.set(file, [])
		}

		taskFileChanges.get(file)!.push(change)
	}

	// ============================================================================
	// Analysis Methods
	// ============================================================================

	/**
	 * Analyze conversation and extract requirements
	 */
	analyzeConversation(taskId: string): ConversationAnalysis {
		const messages = this.messageHistory.get(taskId) || []
		const fileChangesMap = this.fileChanges.get(taskId) || new Map()

		// Extract requirements from messages
		const requirements = this.extractRequirements(messages)

		// Detect contradictions
		const contradictions = this.detectContradictions(messages)

		// Build file reference map
		const fileReferences = this.buildFileReferenceMap(messages, fileChangesMap)

		// Calculate complexity score
		const complexity = this.calculateComplexity(messages, fileChangesMap)

		return {
			requirements,
			contradictions,
			fileReferences,
			complexity,
		}
	}

	/**
	 * Extract requirements from messages using keyword-based heuristics
	 */
	extractRequirements(messages: TrackedMessage[]): Requirement[] {
		const requirements: Requirement[] = []

		// Requirement indicator patterns
		const patterns = [
			// Modal verbs
			/\b(should|must|shall|needs? to|has to|have to|ought to)\b/gi,

			// Given-When-Then patterns
			/\b(given|when|then|expect|expected)\b/gi,

			// Requirement language
			/\b(require|required|requirement)\b/gi,

			// Behavioral language
			/\b(if .+ then)\b/gi,
		]

		for (const message of messages) {
			// Skip system messages
			if (message.role === "system") {
				continue
			}

			const content = message.content

			// Check each pattern
			for (const pattern of patterns) {
				const matches = content.match(pattern)

				if (matches) {
					// Extract sentence containing the requirement
					const sentences = this.extractSentences(content)

					for (const sentence of sentences) {
						if (pattern.test(sentence)) {
							// Check if we already have this requirement
							const isDuplicate = requirements.some(
								(r) => r.text.toLowerCase() === sentence.toLowerCase(),
							)

							if (!isDuplicate && sentence.length > 10 && sentence.length < 500) {
								requirements.push({
									id: this.generateRequirementId(),
									text: sentence.trim(),
									source: message.role === "user" ? "user" : "conversation",
									messageId: message.id,
									confidence: this.calculateRequirementConfidence(sentence, matches.length),
									files: this.extractFileReferences(sentence),
								})
							}
						}
					}
				}
			}
		}

		// Store extracted requirements
		if (this.currentTaskId) {
			this.requirements.set(this.currentTaskId, requirements)
		}

		return requirements
	}

	/**
	 * Detect contradictions in conversation
	 */
	detectContradictions(messages: TrackedMessage[]): Contradiction[] {
		const contradictions: Contradiction[] = []

		// Contradiction keywords
		const contradictionKeywords = [
			"actually",
			"wait",
			"no",
			"correction",
			"instead",
			"rather",
			"wrong",
			"mistake",
			"fix",
			"change that",
			"nevermind",
			"scratch that",
		]

		for (let i = 1; i < messages.length; i++) {
			const currentMessage = messages[i]
			const content = currentMessage.content.toLowerCase()

			// Check for contradiction keywords
			const hasContradictionKeyword = contradictionKeywords.some((keyword) => content.includes(keyword))

			if (hasContradictionKeyword && currentMessage.role === "user") {
				// Look for previous related message
				const previousMessage = messages[i - 1]

				contradictions.push({
					messageIds: [previousMessage.id, currentMessage.id],
					description: `User corrected or changed previous statement`,
					severity: this.calculateContradictionSeverity(content),
				})
			}
		}

		return contradictions
	}

	/**
	 * Build file reference map from conversation
	 */
	private buildFileReferenceMap(
		messages: TrackedMessage[],
		fileChanges: Map<string, FileChange[]>,
	): Map<string, number> {
		const fileReferences = new Map<string, number>()

		// Count mentions in messages
		for (const message of messages) {
			const files = this.extractFileReferences(message.content)
			for (const file of files) {
				fileReferences.set(file, (fileReferences.get(file) || 0) + 1)
			}
		}

		// Add file changes as references
		for (const [file, changes] of fileChanges.entries()) {
			fileReferences.set(file, (fileReferences.get(file) || 0) + changes.length)
		}

		return fileReferences
	}

	/**
	 * Calculate complexity score based on conversation and file changes
	 */
	private calculateComplexity(messages: TrackedMessage[], fileChanges: Map<string, FileChange[]>): number {
		// Factors contributing to complexity:
		// 1. Number of messages
		// 2. Number of files modified
		// 3. Number of requirements
		// 4. Number of contradictions

		const messageCount = messages.length
		const fileCount = fileChanges.size
		const totalChanges = Array.from(fileChanges.values()).reduce((sum, changes) => sum + changes.length, 0)

		// Normalize to 0-1 scale
		const messageScore = Math.min(messageCount / 50, 1) // 50 messages = max
		const fileScore = Math.min(fileCount / 10, 1) // 10 files = max
		const changeScore = Math.min(totalChanges / 20, 1) // 20 changes = max

		// Weighted average
		const complexity = messageScore * 0.3 + fileScore * 0.4 + changeScore * 0.3

		return complexity
	}

	// ============================================================================
	// Query Methods
	// ============================================================================

	/**
	 * Get requirements for a specific file
	 */
	getRequirementsByFile(file: string, taskId?: string): Requirement[] {
		const targetTaskId = taskId || this.currentTaskId
		if (!targetTaskId) {
			return []
		}

		const requirements = this.requirements.get(targetTaskId) || []
		return requirements.filter((req) => req.files.includes(file))
	}

	/**
	 * Get conversation context for a file
	 */
	getConversationContext(file: string, taskId?: string): TrackedMessage[] {
		const targetTaskId = taskId || this.currentTaskId
		if (!targetTaskId) {
			return []
		}

		const messages = this.messageHistory.get(targetTaskId) || []
		return messages.filter((msg) => msg.content.includes(file))
	}

	/**
	 * Get file modification count
	 */
	getFileModificationCount(file: string, taskId?: string): number {
		const targetTaskId = taskId || this.currentTaskId
		if (!targetTaskId) {
			return 0
		}

		const taskFileChanges = this.fileChanges.get(targetTaskId)
		if (!taskFileChanges) {
			return 0
		}

		return taskFileChanges.get(file)?.length || 0
	}

	/**
	 * Get all tracked files for a task
	 */
	getTrackedFiles(taskId?: string): string[] {
		const targetTaskId = taskId || this.currentTaskId
		if (!targetTaskId) {
			return []
		}

		const taskFileChanges = this.fileChanges.get(targetTaskId)
		if (!taskFileChanges) {
			return []
		}

		return Array.from(taskFileChanges.keys())
	}

	/**
	 * Get message history for a task
	 */
	getMessageHistory(taskId?: string): TrackedMessage[] {
		const targetTaskId = taskId || this.currentTaskId
		if (!targetTaskId) {
			return []
		}

		return this.messageHistory.get(taskId) || []
	}

	// ============================================================================
	// Helper Methods
	// ============================================================================

	/**
	 * Extract sentences from text
	 */
	private extractSentences(text: string): string[] {
		// Simple sentence splitting (can be improved)
		return text.split(/[.!?]+/).filter((s) => s.trim().length > 0)
	}

	/**
	 * Extract file references from text
	 * Looks for common file path patterns
	 */
	private extractFileReferences(text: string): string[] {
		const files: string[] = []

		// Patterns for file paths
		const patterns = [
			// Standard paths
			/([a-zA-Z0-9_\-./]+\.(ts|js|tsx|jsx|py|go|java|cpp|c|h|css|scss|html|json|md))/g,

			// Paths with spaces (quoted)
			/"([^"]+\.(ts|js|tsx|jsx|py|go|java|cpp|c|h|css|scss|html|json|md))"/g,

			// Paths with backticks
			/`([^`]+\.(ts|js|tsx|jsx|py|go|java|cpp|c|h|css|scss|html|json|md))`/g,
		]

		for (const pattern of patterns) {
			const matches = text.matchAll(pattern)
			for (const match of matches) {
				const file = match[1]
				if (!files.includes(file)) {
					files.push(file)
				}
			}
		}

		return files
	}

	/**
	 * Calculate confidence score for a requirement
	 */
	private calculateRequirementConfidence(text: string, matchCount: number): number {
		let confidence = 0.5 // Base confidence

		// Higher confidence for certain keywords
		const highConfidenceKeywords = ["must", "shall", "required", "requirement"]
		const hasHighConfidence = highConfidenceKeywords.some((keyword) => text.toLowerCase().includes(keyword))

		if (hasHighConfidence) {
			confidence += 0.3
		}

		// Higher confidence for more matches
		confidence += Math.min(matchCount * 0.05, 0.2)

		// Cap at 1.0
		return Math.min(confidence, 1.0)
	}

	/**
	 * Calculate contradiction severity
	 */
	private calculateContradictionSeverity(text: string): "minor" | "major" {
		const majorKeywords = ["wrong", "mistake", "broken", "bug", "error"]
		const hasMajorKeyword = majorKeywords.some((keyword) => text.includes(keyword))

		return hasMajorKeyword ? "major" : "minor"
	}

	/**
	 * Generate a unique requirement ID
	 */
	private generateRequirementId(): string {
		return `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
	}
}
