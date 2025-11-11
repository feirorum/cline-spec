import { Controller } from ".."
import { UpdateSettingsRequest, Empty } from "@shared/proto/cline/common"
import { SpecSettings } from "@/services/specs/types"

/**
 * Update spec settings
 */
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
