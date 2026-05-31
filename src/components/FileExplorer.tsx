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
          className="flex w-full items-center gap-1.5 py-1 text-left text-xs text-[#9080c0] hover:text-[#ede8ff] hover:bg-[#1a1528] transition-all"
          style={{ paddingLeft }}
        >
          {open ? <ChevronDown size={13} className="shrink-0 text-[#5a4880]" /> : <ChevronRight size={13} className="shrink-0 text-[#5a4880]" />}
          {open ? <FolderOpen size={13} className="shrink-0 text-[#8b5cf6]" /> : <Folder size={13} className="shrink-0 text-[#5a4880]" />}
          <span className="truncate font-medium">{node.name}</span>
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
      className={`flex w-full items-center gap-1.5 py-1 text-left text-xs transition-all ${
        isSelected
          ? 'bg-[#8b5cf620] text-[#ede8ff] border-r-2 border-[#8b5cf6]'
          : 'text-[#9080c0] hover:text-[#ede8ff] hover:bg-[#1a1528]'
      }`}
      style={{ paddingLeft }}
    >
      <FileText size={12} className={`shrink-0 ${isSelected ? 'text-[#a78bfa]' : 'text-[#5a4880]'}`} />
      <span className="truncate">{node.name}</span>
    </button>
  )
}

export function FileExplorer({ width }: { width?: number }) {
  const { currentRepo, fileTree } = useGitStore()

  return (
    <div className="flex h-full flex-col border-r border-[#2a2240] bg-[#120f1e]" style={{ width: width ?? 320 }}>
      <div className="border-b border-[#2a2240] px-4 py-3">
        <h2 className="text-[10px] font-bold uppercase tracking-widest text-[#5a4880]">Explorer</h2>
        <p className="truncate text-xs text-[#9080c0] mt-0.5 font-medium">
          {currentRepo?.split(/[\\/]/).pop() ?? 'No repository selected'}
        </p>
      </div>

      <div className="flex-1 overflow-auto py-1">
        {fileTree.length === 0 ? (
          <div className="px-4 py-3 text-xs text-[#5a4880]">
            No files to display
          </div>
        ) : (
          fileTree.map((node) => <TreeNode key={node.path} node={node} />)
        )}
      </div>
    </div>
  )
}
