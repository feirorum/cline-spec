import { GetSpecsRequest, GetSpecsResponse, Spec as ProtoSpec } from "@shared/proto/cline/specs"
import { Spec, SpecFilter } from "@/services/specs/types"
import { Controller } from ".."

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
		tests:
			spec.tests?.map((t) => ({
				filePath: t.filePath,
				framework: t.framework,
				status: t.status,
				lastRun: t.lastRun,
			})) ?? [],
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
 * Get all specs with optional filtering
 */
export async function getSpecs(controller: Controller, request: GetSpecsRequest): Promise<GetSpecsResponse> {
	try {
		const specService = controller.getSpecService()

		// Convert proto filter to internal filter
		let filter: SpecFilter | undefined
		if (request.filter) {
			filter = {
				status: request.filter.status as any,
				format: request.filter.format as any,
				file: request.filter.file,
				tag: request.filter.tag,
				search: request.filter.search,
			}
		}

		// Get specs from service
		const specs = await specService.getSpecs(filter)

		// Convert to proto format
		const protoSpecs = specs.map(convertSpecToProto)

		return { specs: protoSpecs }
	} catch (error) {
		console.error("Error in getSpecs:", error)
		return { specs: [] }
	}
}
