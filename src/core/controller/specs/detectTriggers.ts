import { Controller } from ".."
import { DetectTriggersRequest, DetectTriggersResponse, Trigger as ProtoTrigger } from "@shared/proto/cline/specs"
import { Trigger } from "@/services/specs/types"

/**
 * Convert internal Trigger to proto Trigger
 */
function convertTriggerToProto(trigger: Trigger): ProtoTrigger {
	return {
		id: trigger.id,
		type: trigger.type,
		severity: trigger.severity,
		message: trigger.message,
		context: {
			files: trigger.context.files || [],
			messages: trigger.context.messages || [],
			metrics: trigger.context.metrics || {},
			taskId: trigger.context.taskId,
		},
		suggestedAction: {
			type: trigger.suggestedAction.type,
			description: trigger.suggestedAction.description,
			autoApply: trigger.suggestedAction.autoApply,
		},
		timestamp: trigger.timestamp,
		dismissed: trigger.dismissed,
	}
}

/**
 * Detect triggers for spec creation
 */
export async function detectTriggers(
	controller: Controller,
	request: DetectTriggersRequest,
): Promise<DetectTriggersResponse> {
	try {
		const specService = controller.getSpecService()

		const context = {
			taskId: request.taskContext?.taskId || "",
			modifiedFiles: request.taskContext?.modifiedFiles || [],
			conversation:
				request.taskContext?.conversation?.map((m) => ({
					id: m.id,
					role: m.role,
					content: m.content,
				})) || [],
			code: request.taskContext?.code,
		}

		const triggers = await specService.detectTriggers(context)
		return { triggers: triggers.map(convertTriggerToProto) }
	} catch (error) {
		console.error("Error in detectTriggers:", error)
		return { triggers: [] }
	}
}
