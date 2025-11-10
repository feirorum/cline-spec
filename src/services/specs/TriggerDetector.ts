/**
 * TriggerDetector - Detects when spec formalization should be suggested
 *
 * Uses heuristic-based triggers to identify when complexity, frequency,
 * or other factors indicate that creating a spec would be valuable.
 */

import { Trigger, TriggerConfig, TriggerType, TaskContext, DEFAULT_TRIGGER_CONFIG } from "./types"
import { SpecTracker, TrackedMessage } from "./SpecTracker"

/**
 * TriggerDetector identifies when to suggest spec formalization
 */
export class TriggerDetector {
	private config: TriggerConfig
	private tracker: SpecTracker

	constructor(tracker: SpecTracker, config: TriggerConfig = DEFAULT_TRIGGER_CONFIG) {
		this.tracker = tracker
		this.config = config
	}

	/**
	 * Update trigger configuration
	 */
	updateConfig(config: Partial<TriggerConfig>): void {
		this.config = { ...this.config, ...config }
	}

	// ============================================================================
	// Main Detection Method
	// ============================================================================

	/**
	 * Detect all triggers for a task context
	 */
	detectTriggers(context: TaskContext): Trigger[] {
		const triggers: Trigger[] = []

		// Check each trigger type
		const complexityTriggers = this.checkComplexityTriggers(context)
		triggers.push(...complexityTriggers)

		const frequencyTriggers = this.checkFrequencyTriggers(context)
		triggers.push(...frequencyTriggers)

		const keywordTriggers = this.checkKeywordTriggers(context)
		triggers.push(...keywordTriggers)

		const contradictionTriggers = this.checkContradictionTriggers(context)
		triggers.push(...contradictionTriggers)

		return triggers
	}

	// ============================================================================
	// Individual Trigger Checks
	// ============================================================================

	/**
	 * Check for complexity-based triggers
	 */
	private checkComplexityTriggers(context: TaskContext): Trigger[] {
		const triggers: Trigger[] = []

		// Check each modified file
		for (const file of context.modifiedFiles) {
			const trigger = this.checkFileComplexity(file, context)
			if (trigger) {
				triggers.push(trigger)
			}
		}

		return triggers
	}

	/**
	 * Check complexity of a single file
	 */
	private checkFileComplexity(file: string, context: TaskContext): Trigger | null {
		// In a real implementation, we would read the file and analyze it
		// For MVP, we'll use a simple heuristic based on file path

		// TODO: Implement actual file reading and analysis
		// For now, always return null (no trigger)
		// This will be implemented when we add file system access

		return null

		/*
		// Example implementation (uncomment when file system access added):

		const content = fs.readFileSync(file, 'utf-8');
		const lines = content.split('\n').length;

		if (lines > this.config.maxLinesPerFile) {
			return {
				id: this.generateTriggerId(),
				type: 'complexity',
				severity: 'warning',
				message: `${file} has ${lines} lines (threshold: ${this.config.maxLinesPerFile}). Consider documenting requirements.`,
				context: {
					files: [file],
					metrics: {
						lines,
						threshold: this.config.maxLinesPerFile
					},
					taskId: context.taskId
				},
				suggestedAction: {
					type: 'extract_spec',
					description: 'Extract specifications from conversation about this file'
				},
				timestamp: Date.now()
			};
		}

		return null;
		*/
	}

	/**
	 * Check for frequency-based triggers (file modified too many times)
	 */
	private checkFrequencyTriggers(context: TaskContext): Trigger[] {
		const triggers: Trigger[] = []

		for (const file of context.modifiedFiles) {
			const modCount = this.tracker.getFileModificationCount(file, context.taskId)

			if (modCount >= this.config.maxModificationsPerTask) {
				triggers.push({
					id: this.generateTriggerId(),
					type: "frequency",
					severity: "warning",
					message: `${file} has been modified ${modCount} times in this task. This may indicate unclear requirements.`,
					context: {
						files: [file],
						metrics: {
							modifications: modCount,
							threshold: this.config.maxModificationsPerTask,
						},
						taskId: context.taskId,
					},
					suggestedAction: {
						type: "extract_spec",
						description: "Document requirements to reduce back-and-forth changes",
					},
					timestamp: Date.now(),
				})
			}
		}

		return triggers
	}

	/**
	 * Check for keyword-based triggers (bug mentions)
	 */
	private checkKeywordTriggers(context: TaskContext): Trigger[] {
		const triggers: Trigger[] = []

		// Count bug-related keywords in conversation
		let bugKeywordCount = 0
		const bugMentions: string[] = []

		for (const message of context.conversation) {
			const content = message.content.toLowerCase()

			for (const keyword of this.config.bugKeywords) {
				if (content.includes(keyword.toLowerCase())) {
					bugKeywordCount++
					if (!bugMentions.includes(message.id)) {
						bugMentions.push(message.id)
					}
				}
			}
		}

		if (bugKeywordCount >= this.config.bugKeywordThreshold) {
			triggers.push({
				id: this.generateTriggerId(),
				type: "keywords",
				severity: "error",
				message: `Bug-related keywords mentioned ${bugKeywordCount} times. Consider formalizing requirements to prevent future issues.`,
				context: {
					messages: bugMentions,
					metrics: {
						bugKeywords: bugKeywordCount,
						threshold: this.config.bugKeywordThreshold,
					},
					taskId: context.taskId,
				},
				suggestedAction: {
					type: "extract_spec",
					description: "Create specifications to clarify expected behavior and prevent regressions",
				},
				timestamp: Date.now(),
			})
		}

		return triggers
	}

	/**
	 * Check for contradiction-based triggers
	 */
	private checkContradictionTriggers(context: TaskContext): Trigger[] {
		const triggers: Trigger[] = []

		// Look for contradiction keywords in user messages
		let contradictionCount = 0
		const contradictionMessages: string[] = []

		for (const message of context.conversation) {
			// Only check user messages
			if (message.role !== "user") {
				continue
			}

			const content = message.content.toLowerCase()

			for (const keyword of this.config.contradictionKeywords) {
				if (content.includes(keyword.toLowerCase())) {
					contradictionCount++
					if (!contradictionMessages.includes(message.id)) {
						contradictionMessages.push(message.id)
					}
					break // Count each message only once
				}
			}
		}

		// Trigger if user has corrected themselves multiple times
		if (contradictionCount >= 2) {
			triggers.push({
				id: this.generateTriggerId(),
				type: "contradiction",
				severity: "warning",
				message: `Requirements changed ${contradictionCount} times during conversation. Formalizing specs can help track changes.`,
				context: {
					messages: contradictionMessages,
					metrics: {
						contradictions: contradictionCount,
					},
					taskId: context.taskId,
				},
				suggestedAction: {
					type: "review_requirements",
					description: "Review and document the current requirements to establish a clear baseline",
				},
				timestamp: Date.now(),
			})
		}

		return triggers
	}

	// ============================================================================
	// Specific Trigger Factories
	// ============================================================================

	/**
	 * Create a manual trigger (user explicitly requested)
	 */
	createManualTrigger(context: TaskContext, message: string): Trigger {
		return {
			id: this.generateTriggerId(),
			type: "manual",
			severity: "info",
			message: message || "User requested spec extraction",
			context: {
				files: context.modifiedFiles,
				taskId: context.taskId,
			},
			suggestedAction: {
				type: "extract_spec",
				description: "Extract specifications from conversation",
			},
			timestamp: Date.now(),
		}
	}

	/**
	 * Create a trigger for a specific file
	 */
	createFileSpecificTrigger(file: string, reason: string, context: TaskContext): Trigger {
		return {
			id: this.generateTriggerId(),
			type: "manual",
			severity: "info",
			message: `Spec suggested for ${file}: ${reason}`,
			context: {
				files: [file],
				taskId: context.taskId,
			},
			suggestedAction: {
				type: "extract_spec",
				description: `Document requirements for ${file}`,
			},
			timestamp: Date.now(),
		}
	}

	// ============================================================================
	// Analysis Methods
	// ============================================================================

	/**
	 * Analyze if a trigger should fire based on overall task complexity
	 */
	shouldTriggerBasedOnComplexity(context: TaskContext): boolean {
		// Multiple factors indicate complexity
		const factors = {
			manyFiles: context.modifiedFiles.length > 5,
			longConversation: context.conversation.length > 30,
			manyChanges: context.modifiedFiles.reduce(
				(sum, file) => sum + this.tracker.getFileModificationCount(file, context.taskId),
				0,
			),
		}

		// Trigger if at least 2 complexity factors are present
		const complexityScore = Object.values(factors).filter(Boolean).length
		return complexityScore >= 2
	}

	/**
	 * Get recommended files for spec creation based on activity
	 */
	getRecommendedFilesForSpecs(context: TaskContext, limit: number = 5): string[] {
		// Score files based on:
		// - Number of modifications
		// - Number of mentions in conversation
		// - Whether they have existing specs

		const fileScores: Map<string, number> = new Map()

		for (const file of context.modifiedFiles) {
			let score = 0

			// Modification count (higher = more important)
			score += this.tracker.getFileModificationCount(file, context.taskId) * 10

			// Conversation mentions
			const mentions = this.tracker.getConversationContext(file, context.taskId)
			score += mentions.length * 5

			fileScores.set(file, score)
		}

		// Sort by score descending
		const sortedFiles = Array.from(fileScores.entries())
			.sort((a, b) => b[1] - a[1])
			.map(([file]) => file)

		return sortedFiles.slice(0, limit)
	}

	// ============================================================================
	// Helpers
	// ============================================================================

	/**
	 * Generate unique trigger ID
	 */
	private generateTriggerId(): string {
		return `trigger-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
	}

	/**
	 * Format trigger message for display
	 */
	formatTriggerMessage(trigger: Trigger): string {
		let message = trigger.message

		// Add action suggestion
		message += `\n\nSuggested action: ${trigger.suggestedAction.description}`

		// Add metrics if available
		if (trigger.context.metrics) {
			message += "\n\nDetails:"
			for (const [key, value] of Object.entries(trigger.context.metrics)) {
				message += `\n- ${key}: ${value}`
			}
		}

		return message
	}

	/**
	 * Check if triggers should be suppressed for a file
	 * (e.g., test files, config files, etc.)
	 */
	shouldSuppressTrigger(file: string): boolean {
		// Suppress triggers for certain file types
		const suppressPatterns = [
			/\.test\.(ts|js|tsx|jsx)$/,
			/\.spec\.(ts|js|tsx|jsx)$/,
			/\/test\//,
			/\/tests\//,
			/\.config\.(ts|js)$/,
			/package\.json$/,
			/tsconfig\.json$/,
			/\.md$/,
		]

		return suppressPatterns.some((pattern) => pattern.test(file))
	}

	/**
	 * Filter triggers to remove suppressed ones
	 */
	filterTriggers(triggers: Trigger[]): Trigger[] {
		return triggers.filter((trigger) => {
			if (!trigger.context.files) {
				return true
			}

			// Check if any file in the trigger should be suppressed
			return !trigger.context.files.some((file) => this.shouldSuppressTrigger(file))
		})
	}
}
