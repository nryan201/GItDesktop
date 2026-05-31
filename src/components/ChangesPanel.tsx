import { useState } from 'react'
import { Plus, Minus, GitCommit, RefreshCw, FilePlus, FileEdit, FileMinus, File } from 'lucide-react'
import { useGitStore } from '../store/useGitStore'
import type { GitStatusFile } from '../types/git'

function statusLabel(f: GitStatusFile): { label: string; color: string; bg: string } {
  const code = f.index !== ' ' && f.index !== '?' ? f.index : f.working_dir
  switch (code) {
    case 'M': return { label: 'M', color: 'text-[#fbbf24]', bg: 'bg-[#fbbf2420]' }
    case 'A': return { label: 'A', color: 'text-[#34d399]', bg: 'bg-[#34d39920]' }
    case 'D': return { label: 'D', color: 'text-[#f87171]', bg: 'bg-[#f8717120]' }
    case '?': return { label: 'U', color: 'text-[#9191aa]', bg: 'bg-[#9191aa20]' }
    default:  return { label: code, color: 'text-[#9191aa]', bg: 'bg-[#9191aa20]' }
  }
}

function FileIcon({ f }: { f: GitStatusFile }) {
  const code = f.index !== ' ' && f.index !== '?' ? f.index : f.working_dir
  const cls = 'shrink-0'
  if (code === 'A' || code === '?') return <FilePlus size={11} className={`${cls} text-[#34d399]`} />
  if (code === 'D') return <FileMinus size={11} className={`${cls} text-[#f87171]`} />
  if (code === 'M') return <FileEdit size={11} className={`${cls} text-[#fbbf24]`} />
  return <File size={11} className={`${cls} text-[#9191aa]`} />
}

function FileRow({ f, action, actionIcon, actionTitle }: {
  f: GitStatusFile
  action: () => void
  actionIcon: React.ReactNode
  actionTitle: string
}) {
  const { label, color, bg } = statusLabel(f)
  const { selectedStatusFile, selectStatusFile } = useGitStore()
  const name = f.path.split(/[\\/]/).pop() ?? f.path
  const isSelected = selectedStatusFile?.path === f.path

  return (
    <div
      onClick={() => void selectStatusFile(f)}
      className={`group flex items-center gap-2 mx-2 my-0.5 px-2 py-1.5 rounded-lg cursor-pointer transition-all ${
        isSelected
          ? 'bg-[#7c6af71a] border border-[#7c6af744]'
          : 'border border-transparent hover:bg-[#1f1f31]'
      }`}
    >
      <FileIcon f={f} />
      <span className="flex-1 text-xs text-[#c9c9e0] truncate" title={f.path}>{name}</span>
      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${color} ${bg}`}>{label}</span>
      <button
        onClick={e => { e.stopPropagation(); action() }}
        title={actionTitle}
        className="opacity-0 group-hover:opacity-100 p-0.5 rounded-md hover:bg-[#2d2d4d] text-[#5a5a72] hover:text-[#e4e4f0] transition-all"
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
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#191927] flex items-center justify-center">
          <GitCommit size={20} className="text-[#2d2d4d]" />
        </div>
        <p className="text-xs text-[#5a5a72]">No repository selected</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* Unstaged */}
      <div className="shrink-0">
        <div className="flex items-center justify-between px-4 py-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#5a5a72]">
            Changes · {unstaged.length}
          </span>
          <div className="flex items-center gap-1">
            <button onClick={() => void refreshStatus()} title="Refresh" className="p-1 rounded-lg text-[#5a5a72] hover:text-[#e4e4f0] hover:bg-[#1f1f31] transition-all">
              <RefreshCw size={11} />
            </button>
            {unstaged.length > 0 && (
              <button onClick={() => void stageAll()} title="Stage all" className="p-1 rounded-lg text-[#5a5a72] hover:text-[#34d399] hover:bg-[#34d3991a] transition-all">
                <Plus size={11} />
              </button>
            )}
          </div>
        </div>
        <div className="max-h-40 overflow-y-auto pb-1">
          {unstaged.length === 0
            ? <p className="text-[11px] text-[#5a5a72] px-4 py-1">No changes</p>
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

      <div className="h-px bg-[#22223a] mx-3" />

      {/* Staged */}
      <div className="shrink-0">
        <div className="flex items-center px-4 py-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#5a5a72]">
            Staged · {staged.length}
          </span>
        </div>
        <div className="max-h-40 overflow-y-auto pb-1">
          {staged.length === 0
            ? <p className="text-[11px] text-[#5a5a72] px-4 py-1">Nothing staged</p>
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

      <div className="h-px bg-[#22223a] mx-3" />

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
          className="w-full px-3 py-2 text-xs bg-[#0c0c14] border border-[#2d2d4d] rounded-xl text-[#e4e4f0] placeholder-[#5a5a72] outline-none focus:border-[#7c6af7] transition-colors resize-none"
        />
        <button
          onClick={() => void handleCommit()}
          disabled={!message.trim() || staged.length === 0 || committing}
          className="flex items-center justify-center gap-1.5 py-2 text-xs font-semibold bg-[#7c6af7] text-white rounded-xl hover:bg-[#8f7ff9] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <GitCommit size={12} />
          {committing ? 'Committing…' : `Commit ${staged.length > 0 ? `(${staged.length})` : ''}`}
        </button>
      </div>
    </div>
  )
}
