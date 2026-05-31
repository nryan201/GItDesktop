import { useState } from 'react'
import { GitCommit } from 'lucide-react'
import { useGitStore } from '../store/useGitStore'
import { ChangesPanel } from './ChangesPanel'
import type { Commit } from '../types/git'

function relativeDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = Date.now()
  const diff = Math.floor((now - date.getTime()) / 1000)

  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 7 * 86400) return `${Math.floor(diff / 86400)}d ago`
  if (diff < 30 * 86400) return `${Math.floor(diff / (7 * 86400))}w ago`
  if (diff < 365 * 86400) return `${Math.floor(diff / (30 * 86400))}mo ago`
  return `${Math.floor(diff / (365 * 86400))}y ago`
}

function Avatar({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map(n => n[0]?.toUpperCase() ?? '')
    .join('')
  const palette = [
    'bg-blue-600', 'bg-violet-600', 'bg-emerald-600',
    'bg-orange-600', 'bg-pink-600', 'bg-teal-600', 'bg-rose-600',
  ]
  const color = palette[(name.charCodeAt(0) ?? 0) % palette.length]!

  return (
    <div
      className={`${color} w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0`}
    >
      {initials}
    </div>
  )
}

function CommitRow({ commit, selected, onClick }: {
  commit: Commit
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2.5 border-b border-[#21262d] transition-colors flex flex-col gap-1 ${
        selected
          ? 'bg-[#388bfd1a] border-l-2 border-l-[#58a6ff]'
          : 'hover:bg-[#21262d]'
      }`}
    >
      <div className="flex items-start gap-2">
        <Avatar name={commit.author_name} />
        <p className={`text-xs leading-snug flex-1 min-w-0 line-clamp-2 ${
          selected ? 'text-[#e6edf3]' : 'text-[#c9d1d9]'
        }`}>
          {commit.message}
        </p>
      </div>
      <div className="flex items-center gap-2 pl-8">
        <span className="font-mono text-[10px] text-[#58a6ff] bg-[#388bfd1a] px-1.5 py-0.5 rounded">
          {commit.shortHash}
        </span>
        <span className="text-[10px] text-[#8b949e] truncate flex-1">
          {commit.author_name}
        </span>
        <span className="text-[10px] text-[#6e7681] shrink-0">
          {relativeDate(commit.date)}
        </span>
      </div>
    </button>
  )
}

export function CommitHistory({ width }: { width?: number }) {
  const { commits, selectedCommit, selectCommit, currentRepo, currentBranch, gitStatus } = useGitStore()
  const [tab, setTab] = useState<'history' | 'changes'>('history')
  const changesCount = gitStatus.filter(f => f.working_dir !== ' ' || (f.index !== ' ' && f.index !== '?')).length

  if (!currentRepo) {
    return (
      <div className="shrink-0 flex flex-col items-center justify-center bg-[#0d1117] border-r border-[#30363d]" style={{ width: width ?? 320 }}>
        <GitCommit size={28} className="text-[#30363d] mb-2" />
        <p className="text-xs text-[#8b949e]">No repository selected</p>
      </div>
    )
  }

  return (
    <div className="shrink-0 flex flex-col bg-[#0d1117] border-r border-[#30363d] overflow-hidden" style={{ width: width ?? 320 }}>
      {/* Tabs */}
      <div className="flex border-b border-[#30363d] shrink-0">
        <button
          onClick={() => setTab('history')}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors border-b-2 ${
            tab === 'history'
              ? 'border-[#58a6ff] text-[#e6edf3]'
              : 'border-transparent text-[#8b949e] hover:text-[#e6edf3]'
          }`}
        >
          <GitCommit size={12} /> History
        </button>
        <button
          onClick={() => setTab('changes')}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors border-b-2 ${
            tab === 'changes'
              ? 'border-[#58a6ff] text-[#e6edf3]'
              : 'border-transparent text-[#8b949e] hover:text-[#e6edf3]'
          }`}
        >
          Changes
          {changesCount > 0 && (
            <span className="bg-[#d29922] text-black text-[9px] font-bold px-1 py-0.5 rounded-full leading-none">
              {changesCount}
            </span>
          )}
        </button>
        {currentBranch && tab === 'history' && (
          <span className="ml-auto self-center mr-3 text-[10px] text-[#3fb950] bg-[#238636]/20 px-1.5 py-0.5 rounded-full truncate max-w-[100px]">
            {currentBranch}
          </span>
        )}
      </div>

      {tab === 'changes' && <ChangesPanel />}

      {/* Commit list — hidden when Changes tab is active */}
      <div className={`flex-1 overflow-y-auto ${tab === 'changes' ? 'hidden' : ''}`}>
        {commits.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <p className="text-xs text-[#8b949e]">No commits found</p>
          </div>
        ) : (
          commits.map(commit => (
            <CommitRow
              key={commit.hash}
              commit={commit}
              selected={selectedCommit?.hash === commit.hash}
              onClick={() => void selectCommit(commit)}
            />
          ))
        )}
      </div>

      {/* Footer */}
      {commits.length > 0 && tab === 'history' && (
        <div className="px-3 py-1.5 border-t border-[#30363d] shrink-0">
          <span className="text-[10px] text-[#6e7681]">{commits.length} commits</span>
        </div>
      )}
    </div>
  )
}
