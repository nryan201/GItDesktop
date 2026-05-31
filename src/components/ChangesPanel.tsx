import { useState } from 'react'
import { Plus, Minus, GitCommit, RefreshCw, FilePlus, FileEdit, FileMinus, File } from 'lucide-react'
import { useGitStore } from '../store/useGitStore'
import type { GitStatusFile } from '../types/git'

function statusLabel(f: GitStatusFile): { label: string; color: string } {
  const code = f.index !== ' ' && f.index !== '?' ? f.index : f.working_dir
  switch (code) {
    case 'M': return { label: 'M', color: 'text-[#d29922]' }
    case 'A': return { label: 'A', color: 'text-[#3fb950]' }
    case 'D': return { label: 'D', color: 'text-[#f85149]' }
    case '?': return { label: 'U', color: 'text-[#8b949e]' }
    default:  return { label: code, color: 'text-[#8b949e]' }
  }
}

function FileIcon({ f }: { f: GitStatusFile }) {
  const code = f.index !== ' ' && f.index !== '?' ? f.index : f.working_dir
  const cls = 'shrink-0'
  if (code === 'A' || code === '?') return <FilePlus size={12} className={`${cls} text-[#3fb950]`} />
  if (code === 'D') return <FileMinus size={12} className={`${cls} text-[#f85149]`} />
  if (code === 'M') return <FileEdit size={12} className={`${cls} text-[#d29922]`} />
  return <File size={12} className={`${cls} text-[#8b949e]`} />
}

function FileRow({ f, action, actionIcon, actionTitle }: {
  f: GitStatusFile
  action: () => void
  actionIcon: React.ReactNode
  actionTitle: string
}) {
  const { label, color } = statusLabel(f)
  const { selectedStatusFile, selectStatusFile } = useGitStore()
  const name = f.path.split(/[\\/]/).pop() ?? f.path
  const isSelected = selectedStatusFile?.path === f.path

  return (
    <div
      onClick={() => void selectStatusFile(f)}
      className={`group flex items-center gap-2 px-3 py-1.5 cursor-pointer transition-colors ${
        isSelected ? 'bg-[#1f3140] border-l-2 border-[#58a6ff]' : 'hover:bg-[#21262d]'
      }`}
    >
      <FileIcon f={f} />
      <span className="flex-1 text-xs text-[#c9d1d9] truncate" title={f.path}>{name}</span>
      <span className={`text-[10px] font-bold ${color}`}>{label}</span>
      <button
        onClick={e => { e.stopPropagation(); action() }}
        title={actionTitle}
        className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-[#30363d] text-[#8b949e] hover:text-[#e6edf3] transition-all"
      >
        {actionIcon}
      </button>
    </div>
  )
}

export function ChangesPanel() {
  const { currentRepo, gitStatus, stageFile, unstageFile, stageAll, commitChanges, refreshStatus } = useGitStore()
  const [message, setMessage] = useState('')
  const [committing, setCommitting] = useState(false)

  const staged   = gitStatus.filter(f => f.index !== ' ' && f.index !== '?')
  const unstaged = gitStatus.filter(f => f.working_dir !== ' ')

  async function handleCommit() {
    if (!message.trim() || staged.length === 0) return
    setCommitting(true)
    await commitChanges(message.trim())
    setMessage('')
    setCommitting(false)
  }

  if (!currentRepo) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <GitCommit size={28} className="text-[#30363d] mb-2" />
        <p className="text-xs text-[#8b949e]">No repository selected</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* Unstaged */}
      <div className="shrink-0">
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-[#21262d]">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#8b949e]">
            Changes · {unstaged.length}
          </span>
          <div className="flex items-center gap-1">
            <button onClick={() => void refreshStatus()} title="Refresh" className="p-0.5 rounded text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#30363d] transition-colors">
              <RefreshCw size={11} />
            </button>
            {unstaged.length > 0 && (
              <button onClick={() => void stageAll()} title="Stage all" className="p-0.5 rounded text-[#8b949e] hover:text-[#3fb950] hover:bg-[#30363d] transition-colors">
                <Plus size={11} />
              </button>
            )}
          </div>
        </div>
        <div className="max-h-40 overflow-y-auto">
          {unstaged.length === 0
            ? <p className="text-[11px] text-[#6e7681] px-3 py-2">No changes</p>
            : unstaged.map(f => (
              <FileRow key={f.path + 'u'} f={f}
                action={() => void stageFile(f.path)}
                actionIcon={<Plus size={11} />}
                actionTitle="Stage file"
              />
            ))
          }
        </div>
      </div>

      <div className="h-px bg-[#30363d] mx-3" />

      {/* Staged */}
      <div className="shrink-0">
        <div className="flex items-center px-3 py-1.5 border-b border-[#21262d]">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#8b949e]">
            Staged · {staged.length}
          </span>
        </div>
        <div className="max-h-40 overflow-y-auto">
          {staged.length === 0
            ? <p className="text-[11px] text-[#6e7681] px-3 py-2">Nothing staged</p>
            : staged.map(f => (
              <FileRow key={f.path + 's'} f={f}
                action={() => void unstageFile(f.path)}
                actionIcon={<Minus size={11} />}
                actionTitle="Unstage file"
              />
            ))
          }
        </div>
      </div>

      <div className="h-px bg-[#30363d] mx-3" />

      {/* Commit */}
      <div className="flex flex-col gap-2 p-3">
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) void handleCommit()
          }}
          placeholder="Commit message (Ctrl+Enter)"
          rows={3}
          className="w-full px-2 py-1.5 text-xs bg-[#0d1117] border border-[#30363d] rounded text-[#e6edf3] placeholder-[#6e7681] outline-none focus:border-[#58a6ff] transition-colors resize-none"
        />
        <button
          onClick={() => void handleCommit()}
          disabled={!message.trim() || staged.length === 0 || committing}
          className="flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium bg-[#238636] text-white rounded hover:bg-[#2ea043] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <GitCommit size={12} />
          {committing ? 'Committing…' : `Commit ${staged.length > 0 ? `(${staged.length})` : ''}`}
        </button>
      </div>
    </div>
  )
}
