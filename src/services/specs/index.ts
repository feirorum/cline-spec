/**
 * Progressive Spec Module
 *
 * This module implements "progressive formalization" for Cline - allowing users to start
 * with fast vibe coding but gradually suggesting specification when complexity emerges.
 *
 * Main components:
 * - SpecService: Main service for all spec operations
 * - SpecStorage: Persistence layer using StateManager
 * - SpecTracker: Monitors conversations and extracts requirements
 * - TriggerDetector: Detects when spec formalization should be suggested
 *
 * Usage:
 * ```typescript
 * import { SpecService } from '@/services/specs'
 *
 * const specService = new SpecService(stateManager)
 * await specService.initialize()
 *
 * // Start tracking a task
 * specService.startTracking(taskId)
 *
 * // Record messages and file changes
 * specService.recordMessage(message)
 * specService.recordFileChange(file, change)
 *
 * // Detect triggers
 * const triggers = await specService.detectTriggers(context)
 *
 * // Extract requirements and generate specs
 * const requirements = await specService.extractRequirements()
 * const spec = await specService.generateSpec(requirements, 'gherkin')
 * ```
 */

// Main service
export { SpecService, type TriggerCallback } from "./SpecService"

// Storage
export { SpecStorage } from "./SpecStorage"

// Tracking and analysis
export { SpecTracker, type TrackedMessage } from "./SpecTracker"
export { TriggerDetector } from "./TriggerDetector"

// Types
export * from "./types"
