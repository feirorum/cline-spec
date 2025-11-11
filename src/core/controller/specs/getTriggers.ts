import { Controller } from ".."
import { GetTriggersRequest, GetTriggersResponse, Trigger as ProtoTrigger } from "@shared/proto/cline/specs"
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
 * Get all triggers
 */
export async function getTriggers(controller: Controller, request: GetTriggersRequest): Promise<GetTriggersResponse> {
	try {
		const specService = controller.getSpecService()
		const triggers = await specService.getTriggers()
		return { triggers: triggers.map(convertTriggerToProto) }
	} catch (error) {
		console.error("Error in getTriggers:", error)
		return { triggers: [] }
	}
}
