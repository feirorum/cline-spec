import { GetStatsRequest, SpecStats as ProtoSpecStats } from "@shared/proto/cline/specs"
import { Controller } from ".."

/**
 * Get spec statistics
 */
export async function getStats(controller: Controller, _request: GetStatsRequest): Promise<ProtoSpecStats> {
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
