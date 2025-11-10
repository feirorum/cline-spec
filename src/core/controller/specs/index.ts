/**
 * Spec Service gRPC Handlers
 *
 * This module exports all gRPC handlers for the Progressive Spec feature.
 * Each handler follows the pattern: (controller, request) => Promise<response>
 */

import { Controller } from ".."
import {
	GetSpecsRequest,
	GetSpecsResponse,
	GetSpecRequest,
	AddSpecRequest,
	UpdateSpecRequest,
	DeleteSpecRequest,
	SearchSpecsRequest,
	ExtractRequirementsRequest,
	ExtractRequirementsResponse,
	DetectTriggersRequest,
	DetectTriggersResponse,
	CreateManualTriggerRequest,
	DismissTriggerRequest,
	GetTriggersRequest,
	GetTriggersResponse,
	GetSettingsRequest,
	UpdateSettingsRequest,
	GetStatsRequest,
	ExportSpecsRequest,
	ImportSpecsRequest,
	Spec as ProtoSpec,
	Trigger as ProtoTrigger,
	SpecSettings as ProtoSpecSettings,
	SpecStats as ProtoSpecStats,
	Requirement as ProtoRequirement,
} from "@shared/proto/cline/specs"
import { Empty, String as ProtoString, Int64 } from "@shared/proto/cline/common"
import { Spec, Trigger, SpecSettings, Requirement } from "@/services/specs/types"

// ============================================================================
// Conversion Utilities
// ============================================================================

function convertSpecToProto(spec: Spec): ProtoSpec {
	return {
		id: spec.id,
		title: spec.title,
		content: spec.content,
		format: spec.format,
		status: spec.status,
		files: spec.files,
		tests: spec.tests?.map((t) => ({
			filePath: t.filePath,
			framework: t.framework,
			status: t.status,
			lastRun: t.lastRun,
		})),
		tags: spec.tags,
		metadata: {
			createdAt: spec.metadata.createdAt,
			updatedAt: spec.metadata.updatedAt,
			createdBy: spec.metadata.createdBy,
			source: spec.metadata.source,
			version: spec.metadata.version,
		},
	}
}

function convertTriggerToProto(trigger: Trigger): ProtoTrigger {
	return {
		id: trigger.id,
		type: trigger.type,
		severity: trigger.severity,
		message: trigger.message,
		context: {
			files: trigger.context.files || [],
			messages: trigger.context.messages || [],
			metrics: trigger.context.metrics || {},
			taskId: trigger.context.taskId,
		},
		suggestedAction: {
			type: trigger.suggestedAction.type,
			description: trigger.suggestedAction.description,
			autoApply: trigger.suggestedAction.autoApply,
		},
		timestamp: trigger.timestamp,
		dismissed: trigger.dismissed,
	}
}

function convertRequirementToProto(req: Requirement): ProtoRequirement {
	return {
		id: req.id,
		text: req.text,
		source: req.source,
		messageId: req.messageId,
		confidence: req.confidence,
		files: req.files,
	}
}

// ============================================================================
// CRUD Handlers
// ============================================================================

export async function getSpecs(controller: Controller, request: GetSpecsRequest): Promise<GetSpecsResponse> {
	try {
		const specService = controller.getSpecService()

		let filter
		if (request.filter) {
			filter = {
				status: request.filter.status as any,
				format: request.filter.format as any,
				file: request.filter.file,
				tag: request.filter.tag,
				search: request.filter.search,
			}
		}

		const specs = await specService.getSpecs(filter)
		return { specs: specs.map(convertSpecToProto) }
	} catch (error) {
		console.error("Error in getSpecs:", error)
		return { specs: [] }
	}
}

export async function getSpec(controller: Controller, request: GetSpecRequest): Promise<ProtoSpec | null> {
	try {
		const specService = controller.getSpecService()
		const spec = await specService.getSpec(request.specId)
		return spec ? convertSpecToProto(spec) : null
	} catch (error) {
		console.error("Error in getSpec:", error)
		return null
	}
}

export async function addSpec(controller: Controller, request: AddSpecRequest): Promise<ProtoSpec> {
	try {
		const specService = controller.getSpecService()

		const spec = await specService.addSpec({
			title: request.title,
			content: request.content,
			format: request.format as any,
			status: request.status as any,
			files: request.files,
			tests: [],
			tags: request.tags,
			metadata: {
				createdAt: Date.now(),
				updatedAt: Date.now(),
				createdBy: request.createdBy as any,
				source: request.source,
				version: 1,
			},
		})

		return convertSpecToProto(spec)
	} catch (error) {
		console.error("Error in addSpec:", error)
		throw error
	}
}

export async function updateSpec(controller: Controller, request: UpdateSpecRequest): Promise<ProtoSpec> {
	try {
		const specService = controller.getSpecService()

		const updates: any = {}
		if (request.title) updates.title = request.title
		if (request.content) updates.content = request.content
		if (request.format) updates.format = request.format
		if (request.status) updates.status = request.status
		if (request.files) updates.files = request.files
		if (request.tags) updates.tags = request.tags

		const spec = await specService.updateSpec(request.specId, updates)
		return convertSpecToProto(spec)
	} catch (error) {
		console.error("Error in updateSpec:", error)
		throw error
	}
}

export async function deleteSpec(controller: Controller, request: DeleteSpecRequest): Promise<Empty> {
	try {
		const specService = controller.getSpecService()
		await specService.deleteSpec(request.specId)
		return {}
	} catch (error) {
		console.error("Error in deleteSpec:", error)
		return {}
	}
}

export async function searchSpecs(controller: Controller, request: SearchSpecsRequest): Promise<GetSpecsResponse> {
	try {
		const specService = controller.getSpecService()
		const specs = await specService.searchSpecs(request.query)
		return { specs: specs.map(convertSpecToProto) }
	} catch (error) {
		console.error("Error in searchSpecs:", error)
		return { specs: [] }
	}
}

// ============================================================================
// Requirement Extraction
// ============================================================================

export async function extractRequirements(
	controller: Controller,
	request: ExtractRequirementsRequest,
): Promise<ExtractRequirementsResponse> {
	try {
		const specService = controller.getSpecService()
		const requirements = await specService.extractRequirements(request.taskId)
		return { requirements: requirements.map(convertRequirementToProto) }
	} catch (error) {
		console.error("Error in extractRequirements:", error)
		return { requirements: [] }
	}
}

// ============================================================================
// Trigger Handlers
// ============================================================================

export async function detectTriggers(
	controller: Controller,
	request: DetectTriggersRequest,
): Promise<DetectTriggersResponse> {
	try {
		const specService = controller.getSpecService()

		const context = {
			taskId: request.taskContext?.taskId || "",
			modifiedFiles: request.taskContext?.modifiedFiles || [],
			conversation:
				request.taskContext?.conversation?.map((m) => ({
					id: m.id,
					role: m.role,
					content: m.content,
				})) || [],
			code: request.taskContext?.code,
		}

		const triggers = await specService.detectTriggers(context)
		return { triggers: triggers.map(convertTriggerToProto) }
	} catch (error) {
		console.error("Error in detectTriggers:", error)
		return { triggers: [] }
	}
}

export async function createManualTrigger(
	controller: Controller,
	request: CreateManualTriggerRequest,
): Promise<ProtoTrigger> {
	try {
		const specService = controller.getSpecService()

		const context = {
			taskId: request.taskContext?.taskId || "",
			modifiedFiles: request.taskContext?.modifiedFiles || [],
			conversation:
				request.taskContext?.conversation?.map((m) => ({
					id: m.id,
					role: m.role,
					content: m.content,
				})) || [],
		}

		const trigger = await specService.createManualTrigger(context, request.message)
		return convertTriggerToProto(trigger)
	} catch (error) {
		console.error("Error in createManualTrigger:", error)
		throw error
	}
}

export async function dismissTrigger(controller: Controller, request: DismissTriggerRequest): Promise<Empty> {
	try {
		const specService = controller.getSpecService()
		await specService.dismissTrigger(request.triggerId)
		return {}
	} catch (error) {
		console.error("Error in dismissTrigger:", error)
		return {}
	}
}

export async function getTriggers(controller: Controller, request: GetTriggersRequest): Promise<GetTriggersResponse> {
	try {
		const specService = controller.getSpecService()
		const triggers = await specService.getTriggers()
		return { triggers: triggers.map(convertTriggerToProto) }
	} catch (error) {
		console.error("Error in getTriggers:", error)
		return { triggers: [] }
	}
}

// ============================================================================
// Settings Handlers
// ============================================================================

export async function getSettings(controller: Controller, request: GetSettingsRequest): Promise<ProtoSpecSettings> {
	try {
		const specService = controller.getSpecService()
		const settings = await specService.getSettings()

		return {
			enabled: settings.enabled,
			autoDetectTriggers: settings.autoDetectTriggers,
			triggerConfig: {
				maxLinesPerFile: settings.triggerConfig.maxLinesPerFile,
				maxCyclomaticComplexity: settings.triggerConfig.maxCyclomaticComplexity,
				maxModificationsPerTask: settings.triggerConfig.maxModificationsPerTask,
				bugKeywords: settings.triggerConfig.bugKeywords,
				bugKeywordThreshold: settings.triggerConfig.bugKeywordThreshold,
				contradictionKeywords: settings.triggerConfig.contradictionKeywords,
			},
			defaultFormat: settings.defaultFormat,
			storageMode: settings.storageMode,
			specDirectory: settings.specDirectory,
		}
	} catch (error) {
		console.error("Error in getSettings:", error)
		throw error
	}
}

export async function updateSettings(controller: Controller, request: UpdateSettingsRequest): Promise<Empty> {
	try {
		const specService = controller.getSpecService()

		const updates: Partial<SpecSettings> = {}
		if (request.settings) {
			if (request.settings.enabled !== undefined) updates.enabled = request.settings.enabled
			if (request.settings.autoDetectTriggers !== undefined)
				updates.autoDetectTriggers = request.settings.autoDetectTriggers
			if (request.settings.defaultFormat) updates.defaultFormat = request.settings.defaultFormat as any
			if (request.settings.storageMode) updates.storageMode = request.settings.storageMode as any
			if (request.settings.specDirectory) updates.specDirectory = request.settings.specDirectory
			if (request.settings.triggerConfig) {
				updates.triggerConfig = {
					maxLinesPerFile: request.settings.triggerConfig.maxLinesPerFile,
					maxCyclomaticComplexity: request.settings.triggerConfig.maxCyclomaticComplexity,
					maxModificationsPerTask: request.settings.triggerConfig.maxModificationsPerTask,
					bugKeywords: request.settings.triggerConfig.bugKeywords,
					bugKeywordThreshold: request.settings.triggerConfig.bugKeywordThreshold,
					contradictionKeywords: request.settings.triggerConfig.contradictionKeywords,
				}
			}
		}

		await specService.updateSettings(updates)
		return {}
	} catch (error) {
		console.error("Error in updateSettings:", error)
		return {}
	}
}

// ============================================================================
// Stats and Export Handlers
// ============================================================================

export async function getStats(controller: Controller, request: GetStatsRequest): Promise<ProtoSpecStats> {
	try {
		const specService = controller.getSpecService()
		const stats = await specService.getStats()

		return {
			totalSpecs: stats.totalSpecs,
			byStatus: stats.byStatus,
			byFormat: stats.byFormat,
			filesWithSpecs: stats.filesWithSpecs,
			activeTriggers: stats.activeTriggers,
		}
	} catch (error) {
		console.error("Error in getStats:", error)
		return {
			totalSpecs: 0,
			byStatus: {},
			byFormat: {},
			filesWithSpecs: 0,
			activeTriggers: 0,
		}
	}
}

export async function exportSpecs(controller: Controller, request: ExportSpecsRequest): Promise<ProtoString> {
	try {
		const specService = controller.getSpecService()
		const json = await specService.exportSpecs()
		return { value: json }
	} catch (error) {
		console.error("Error in exportSpecs:", error)
		return { value: "[]" }
	}
}

export async function importSpecs(controller: Controller, request: ImportSpecsRequest): Promise<Int64> {
	try {
		const specService = controller.getSpecService()
		const count = await specService.importSpecs(request.jsonData)
		return { value: count }
	} catch (error) {
		console.error("Error in importSpecs:", error)
		return { value: 0 }
	}
}
