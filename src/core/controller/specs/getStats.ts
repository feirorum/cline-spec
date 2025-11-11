import { Controller } from ".."
import { GetStatsRequest, SpecStats as ProtoSpecStats } from "@shared/proto/cline/specs"

/**
 * Get spec statistics
 */
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
