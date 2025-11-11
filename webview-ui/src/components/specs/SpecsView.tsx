import { GetSpecsRequest } from "@shared/proto/cline/specs"
import { VSCodeButton, VSCodeTextField } from "@vscode/webview-ui-toolkit/react"
import { useCallback, useEffect, useState } from "react"
import { SpecsServiceClient } from "@/services/grpc-client"

type SpecsViewProps = {
	onDone: () => void
}

interface Spec {
	id: string
	title: string
	content: string
	format: string
	status: string
	files: string[]
	tests: any[]
	tags: string[]
	metadata: {
		createdAt: number
		updatedAt: number
		createdBy: string
		source?: string
		version: number
	}
}

const SpecsView = ({ onDone }: SpecsViewProps) => {
	const [specs, setSpecs] = useState<Spec[]>([])
	const [loading, setLoading] = useState(true)
	const [searchQuery, setSearchQuery] = useState("")
	const [selectedSpec, setSelectedSpec] = useState<Spec | null>(null)

	const loadSpecs = useCallback(async () => {
		try {
			setLoading(true)
			const response = await SpecsServiceClient.getSpecs(GetSpecsRequest.create({}))
			setSpecs(response.specs || [])
		} catch (error) {
			console.error("Error loading specs:", error)
		} finally {
			setLoading(false)
		}
	}, [])

	useEffect(() => {
		loadSpecs()
	}, [loadSpecs])

	const filteredSpecs = specs.filter(
		(spec) =>
			spec.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
			spec.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
			spec.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase())),
	)

	const getStatusBadgeClass = (status: string) => {
		switch (status) {
			case "draft":
				return "bg-gray-500"
			case "active":
				return "bg-green-600"
			case "archived":
				return "bg-gray-700"
			case "implemented":
				return "bg-blue-600"
			default:
				return "bg-gray-500"
		}
	}

	const formatDate = (timestamp: number) => {
		return new Date(timestamp).toLocaleDateString()
	}

	return (
		<div className="flex h-full w-full flex-col overflow-hidden">
			{/* Header */}
			<div className="flex items-center justify-between p-4 border-b border-(--vscode-panel-border)">
				<div className="flex items-center gap-3">
					<h2 className="text-xl font-semibold">Specifications</h2>
					<span className="text-sm text-(--vscode-descriptionForeground)">
						{filteredSpecs.length} {filteredSpecs.length === 1 ? "spec" : "specs"}
					</span>
				</div>
				<VSCodeButton appearance="icon" onClick={onDone}>
					<span className="codicon codicon-close" />
				</VSCodeButton>
			</div>

			{/* Search and filters */}
			<div className="p-4 border-b border-(--vscode-panel-border)">
				<VSCodeTextField
					className="w-full"
					onInput={(e: any) => setSearchQuery(e.target.value)}
					placeholder="Search specs..."
					value={searchQuery}>
					<span className="codicon codicon-search" slot="start" />
				</VSCodeTextField>
			</div>

			{/* Content */}
			<div className="flex-1 overflow-auto p-4">
				{loading ? (
					<div className="flex items-center justify-center h-full">
						<div className="text-(--vscode-descriptionForeground)">Loading specs...</div>
					</div>
				) : filteredSpecs.length === 0 ? (
					<div className="flex flex-col items-center justify-center h-full gap-4">
						<span className="codicon codicon-file-code text-4xl text-(--vscode-descriptionForeground)" />
						<div className="text-center">
							<h3 className="text-lg font-semibold mb-2">No specifications yet</h3>
							<p className="text-(--vscode-descriptionForeground)">
								{searchQuery ? "No specs match your search" : "Specs will appear here as you work on tasks"}
							</p>
						</div>
					</div>
				) : (
					<div className="grid gap-3">
						{filteredSpecs.map((spec) => (
							<div
								className="border border-(--vscode-panel-border) rounded p-4 hover:bg-(--vscode-list-hoverBackground) cursor-pointer transition-colors"
								key={spec.id}
								onClick={() => setSelectedSpec(selectedSpec?.id === spec.id ? null : spec)}>
								{/* Spec header */}
								<div className="flex items-start justify-between mb-2">
									<div className="flex-1">
										<h3 className="font-semibold text-base mb-1">{spec.title}</h3>
										<div className="flex items-center gap-2 text-xs text-(--vscode-descriptionForeground)">
											<span className={`px-2 py-0.5 rounded ${getStatusBadgeClass(spec.status)}`}>
												{spec.status}
											</span>
											<span>{spec.format}</span>
											<span>•</span>
											<span>{spec.files.length} files</span>
											{spec.tags.length > 0 && (
												<>
													<span>•</span>
													<div className="flex gap-1">
														{spec.tags.slice(0, 3).map((tag) => (
															<span
																className="px-1.5 py-0.5 bg-(--vscode-badge-background) text-(--vscode-badge-foreground) rounded text-xs"
																key={tag}>
																{tag}
															</span>
														))}
														{spec.tags.length > 3 && <span>+{spec.tags.length - 3}</span>}
													</div>
												</>
											)}
										</div>
									</div>
									<span className="text-xs text-(--vscode-descriptionForeground)">
										{formatDate(spec.metadata.updatedAt)}
									</span>
								</div>

								{/* Spec preview */}
								<div className="text-sm text-(--vscode-descriptionForeground) line-clamp-2 mb-2">
									{spec.content.split("\n")[0]}
								</div>

								{/* Expanded content */}
								{selectedSpec?.id === spec.id && (
									<div className="mt-3 pt-3 border-t border-(--vscode-panel-border)">
										<pre className="text-xs bg-(--vscode-textCodeBlock-background) p-3 rounded overflow-x-auto whitespace-pre-wrap">
											{spec.content}
										</pre>
										{spec.files.length > 0 && (
											<div className="mt-3">
												<div className="text-sm font-semibold mb-2">Associated Files:</div>
												<div className="flex flex-wrap gap-1">
													{spec.files.map((file) => (
														<code
															className="text-xs bg-(--vscode-textCodeBlock-background) px-2 py-1 rounded"
															key={file}>
															{file}
														</code>
													))}
												</div>
											</div>
										)}
									</div>
								)}
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	)
}

export default SpecsView
