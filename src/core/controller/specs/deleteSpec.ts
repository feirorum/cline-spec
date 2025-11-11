import { Empty } from "@shared/proto/cline/common"
import { DeleteSpecRequest } from "@shared/proto/cline/specs"
import { Controller } from ".."

/**
 * Delete a spec
 */
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
