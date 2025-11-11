import {
	ExtractRequirementsRequest,
	ExtractRequirementsResponse,
	Requirement as ProtoRequirement,
} from "@shared/proto/cline/specs"
import { Requirement } from "@/services/specs/types"
import { Controller } from ".."

/**
 * Convert internal Requirement to proto Requirement
 */
function convertRequirementToProto(req: Requirement): ProtoRequirement {
	return {
		id: req.id,
		text: req.text,
		source: req.source,
		messageId: req.messageId,
		confidence: req.confidence,
		files: req.files,
	}
}

/**
 * Extract requirements from conversation
 */
export async function extractRequirements(
	controller: Controller,
	request: ExtractRequirementsRequest,
): Promise<ExtractRequirementsResponse> {
	try {
		const specService = controller.getSpecService()
		const requirements = await specService.extractRequirements(request.taskId)
		return { requirements: requirements.map(convertRequirementToProto) }
	} catch (error) {
		console.error("Error in extractRequirements:", error)
		return { requirements: [] }
	}
}
