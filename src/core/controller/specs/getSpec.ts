import { GetSpecRequest, Spec as ProtoSpec } from "@shared/proto/cline/specs"
import { Spec } from "@/services/specs/types"
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
 * Get a single spec by ID
 */
export async function getSpec(controller: Controller, request: GetSpecRequest): Promise<ProtoSpec | null> {
	try {
		const specService = controller.getSpecService()
		const spec = await specService.getSpec(request.specId)
		return spec ? convertSpecToProto(spec) : null
	} catch (error) {
		console.error("Error in getSpec:", error)
		return null
	}
}
