import { AddSpecRequest, Spec as ProtoSpec } from "@shared/proto/cline/specs"
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
 * Add a new spec
 */
export async function addSpec(controller: Controller, request: AddSpecRequest): Promise<ProtoSpec> {
	try {
		const specService = controller.getSpecService()

		const spec = await specService.addSpec({
			title: request.title,
			content: request.content,
			format: request.format as any,
			status: request.status as any,
			files: request.files,
			tests: [],
			tags: request.tags,
			metadata: {
				createdAt: Date.now(),
				updatedAt: Date.now(),
				createdBy: request.createdBy as any,
				source: request.source,
				version: 1,
			},
		})

		return convertSpecToProto(spec)
	} catch (error) {
		console.error("Error in addSpec:", error)
		throw error
	}
}
