import { useState } from 'react'
import { ChevronRight, ChevronDown, Folder, FolderOpen, FileText } from 'lucide-react'
import { useGitStore } from '../store/useGitStore'
import type { FileTreeNode } from '../types/git'

interface TreeNodeProps {
  node: FileTreeNode
  level?: number
}

function TreeNode({ node, level = 0 }: TreeNodeProps) {
  const [open, setOpen] = useState(level < 1)
  const { selectedExplorerFile, selectExplorerFile } = useGitStore()

  const isSelected = selectedExplorerFile === node.path
  const paddingLeft = `${level * 12 + 8}px`

  if (node.type === 'directory') {
    return (
      <div>
        <button
          onClick={() => setOpen(!open)}
          className="flex w-full items-center gap-2 px-2 py-1 text-left text-sm text-gray-200 hover:bg-zinc-800"
          style={{ paddingLeft }}
        >
          {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          {open ? <FolderOpen size={16} /> : <Folder size={16} />}
          <span className="truncate">{node.name}</span>
        </button>

        {open && node.children?.length ? (
          <div>
            {node.children.map((child) => (
              <TreeNode key={child.path} node={child} level={level + 1} />
            ))}
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <button
      onClick={() => selectExplorerFile(node.path)}
      className={`flex w-full items-center gap-2 px-2 py-1 text-left text-sm hover:bg-zinc-800 ${
        isSelected ? 'bg-zinc-700 text-white' : 'text-gray-300'
      }`}
      style={{ paddingLeft }}
    >
      <FileText size={16} />
      <span className="truncate">{node.name}</span>
    </button>
  )
}

export function FileExplorer() {
  const { currentRepo, fileTree } = useGitStore()

  return (
    <div className="flex h-full w-80 flex-col border-r border-zinc-800 bg-zinc-900">
      <div className="border-b border-zinc-800 px-3 py-2">
        <h2 className="text-sm font-semibold text-white">Explorer</h2>
        <p className="truncate text-xs text-gray-400">
          {currentRepo ?? 'No repository selected'}
        </p>
      </div>

      <div className="flex-1 overflow-auto py-2">
        {fileTree.length === 0 ? (
          <div className="px-3 py-2 text-sm text-gray-400">
            No files to display
          </div>
        ) : (
          fileTree.map((node) => <TreeNode key={node.path} node={node} />)
        )}
      </div>
    </div>
  )
}