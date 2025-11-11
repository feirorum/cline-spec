import { Int64 } from "@shared/proto/cline/common"
import { ImportSpecsRequest } from "@shared/proto/cline/specs"
import { Controller } from ".."

/**
 * Import specs from JSON
 */
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
