import { useGitStore } from '../store/useGitStore'

export function FilePreview() {
  const { selectedExplorerFile, fileContent } = useGitStore()

  return (
    <div className="flex h-full flex-1 flex-col bg-zinc-950">
      <div className="border-b border-zinc-800 px-4 py-2">
        <h2 className="text-sm font-semibold text-white">File Preview</h2>
        <p className="truncate text-xs text-gray-400">
          {selectedExplorerFile ?? 'No file selected'}
        </p>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {selectedExplorerFile ? (
          <pre className="whitespace-pre-wrap break-words text-sm text-gray-200">
            {fileContent}
          </pre>
        ) : (
          <div className="text-sm text-gray-400">
            Select a file in the explorer to preview its content.
          </div>
        )}
      </div>
    </div>
  )
}