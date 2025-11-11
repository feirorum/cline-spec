import { Controller } from ".."
import { SearchSpecsRequest, GetSpecsResponse, Spec as ProtoSpec } from "@shared/proto/cline/specs"
import { Spec } from "@/services/specs/types"

/**
 * Convert internal Spec to proto Spec
 */
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

/**
 * Search specs by query
 */
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
