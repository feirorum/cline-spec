import { Spec as ProtoSpec, UpdateSpecRequest } from "@shared/proto/cline/specs"
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
 * Update an existing spec
 */
export async function updateSpec(controller: Controller, request: UpdateSpecRequest): Promise<ProtoSpec> {
	try {
		const specService = controller.getSpecService()

		const updates: any = {}
		if (request.title) {
			updates.title = request.title
		}
		if (request.content) {
			updates.content = request.content
		}
		if (request.format) {
			updates.format = request.format
		}
		if (request.status) {
			updates.status = request.status
		}
		if (request.files) {
			updates.files = request.files
		}
		if (request.tags) {
			updates.tags = request.tags
		}

		const spec = await specService.updateSpec(request.specId, updates)
		return convertSpecToProto(spec)
	} catch (error) {
		console.error("Error in updateSpec:", error)
		throw error
	}
}
