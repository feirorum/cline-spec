import { Controller } from ".."
import { ExportSpecsRequest, String as ProtoString } from "@shared/proto/cline/common"

/**
 * Export specs as JSON
 */
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
