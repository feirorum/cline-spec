import { GetSpecSettingsRequest, SpecSettings as ProtoSpecSettings } from "@shared/proto/cline/specs"
import { Controller } from ".."

/**
 * Get spec settings
 */
export async function getSettings(controller: Controller, _request: GetSpecSettingsRequest): Promise<ProtoSpecSettings> {
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
