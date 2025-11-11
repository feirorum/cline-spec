import { CreateManualTriggerRequest, Trigger as ProtoTrigger } from "@shared/proto/cline/specs"
import { Trigger } from "@/services/specs/types"
import { Controller } from ".."

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
 * Create manual trigger
 */
export async function createManualTrigger(controller: Controller, request: CreateManualTriggerRequest): Promise<ProtoTrigger> {
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
		}

		const trigger = await specService.createManualTrigger(context, request.message)
		return convertTriggerToProto(trigger)
	} catch (error) {
		console.error("Error in createManualTrigger:", error)
		throw error
	}
}
