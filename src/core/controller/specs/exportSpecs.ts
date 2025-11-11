import { String as ProtoString } from "@shared/proto/cline/common"
import { ExportSpecsRequest } from "@shared/proto/cline/specs"
import { Controller } from ".."

/**
 * Export specs as JSON
 */
export async function exportSpecs(controller: Controller, _request: ExportSpecsRequest): Promise<ProtoString> {
	try {
		const specService = controller.getSpecService()
		const json = await specService.exportSpecs()
		return { value: json }
	} catch (error) {
		console.error("Error in exportSpecs:", error)
		return { value: "[]" }
	}
}
