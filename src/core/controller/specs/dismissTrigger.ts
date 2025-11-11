import { Controller } from ".."
import { DismissTriggerRequest, Empty } from "@shared/proto/cline/common"

/**
 * Dismiss a trigger
 */
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
