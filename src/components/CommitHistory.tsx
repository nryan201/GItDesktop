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
  const palette = ['#8b5cf6', '#a78bfa', '#7c3aed', '#6d28d9', '#c4b5fd', '#ddd6fe', '#4c1d95']
  const color = palette[(name.charCodeAt(0) ?? 0) % palette.length]!

  return (
    <div
      style={{ backgroundColor: color + '22', borderColor: color + '55', color }}
      className="w-6 h-6 rounded-lg border flex items-center justify-center text-[10px] font-bold shrink-0"
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
      className={`w-full text-left transition-all flex gap-0 group`}
    >
      {/* Timeline column */}
      <div className="flex flex-col items-center w-8 shrink-0 pt-3 pb-0">
        <div className={`w-2 h-2 rounded-full shrink-0 transition-colors ${
          selected ? 'bg-[#8b5cf6]' : 'bg-[#3d3060] group-hover:bg-[#4d3f70]'
        }`} />
        <div className="w-px flex-1 bg-[#2a2240] mt-1" />
      </div>

      {/* Content */}
      <div className={`flex-1 min-w-0 py-2.5 pr-3 border-b border-[#2a2240] transition-colors ${
        selected ? 'bg-[#8b5cf615]' : 'hover:bg-[#1a1528]'
      }`}>
        <div className="flex items-start gap-2 mb-1.5">
          <Avatar name={commit.author_name} />
          <p className={`text-xs leading-snug flex-1 min-w-0 line-clamp-2 ${
            selected ? 'text-[#ede8ff]' : 'text-[#c8c0e8]'
          }`}>
            {commit.message}
          </p>
        </div>
        <div className="flex items-center gap-2 pl-8">
          <span className="font-mono text-[10px] text-[#a78bfa] bg-[#8b5cf620] px-1.5 py-0.5 rounded-md">
            {commit.shortHash}
          </span>
          <span className="text-[10px] text-[#9080c0] truncate flex-1">
            {commit.author_name}
          </span>
          <span className="text-[10px] text-[#5a4880] shrink-0">
            {relativeDate(commit.date)}
          </span>
        </div>
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
      <div className="shrink-0 flex flex-col items-center justify-center bg-[#0d0b14] border-r border-[#2a2240]" style={{ width: width ?? 320 }}>
        <div className="w-12 h-12 rounded-2xl bg-[#1a1528] flex items-center justify-center mb-3">
          <GitCommit size={22} className="text-[#3d3060]" />
        </div>
        <p className="text-xs text-[#5a4880]">No repository selected</p>
      </div>
    )
  }

  return (
    <div className="shrink-0 flex flex-col bg-[#0d0b14] border-r border-[#2a2240] overflow-hidden" style={{ width: width ?? 320 }}>
      {/* Tabs */}
      <div className="flex border-b border-[#2a2240] shrink-0 px-2 pt-1">
        <button
          onClick={() => setTab('history')}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold transition-all border-b-2 ${
            tab === 'history'
              ? 'border-[#8b5cf6] text-[#ede8ff]'
              : 'border-transparent text-[#5a4880] hover:text-[#9080c0]'
          }`}
        >
          <GitCommit size={12} /> History
        </button>
        <button
          onClick={() => setTab('changes')}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold transition-all border-b-2 ${
            tab === 'changes'
              ? 'border-[#8b5cf6] text-[#ede8ff]'
              : 'border-transparent text-[#5a4880] hover:text-[#9080c0]'
          }`}
        >
          Changes
          {changesCount > 0 && (
            <span className="bg-[#8b5cf6] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none">
              {changesCount}
            </span>
          )}
        </button>
        {currentBranch && tab === 'history' && (
          <span className="ml-auto self-center mr-2 text-[10px] font-medium text-[#a78bfa] bg-[#8b5cf620] px-2 py-0.5 rounded-full truncate max-w-[90px]">
            {currentBranch}
          </span>
        )}
      </div>

      {tab === 'changes' && <ChangesPanel />}

      {/* Commit list — hidden when Changes tab is active */}
      <div className={`flex-1 overflow-y-auto ${tab === 'changes' ? 'hidden' : ''}`}>
        {commits.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2">
            <GitCommit size={20} className="text-[#3d3060]" />
            <p className="text-xs text-[#5a4880]">No commits found</p>
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
        <div className="px-4 py-2 border-t border-[#2a2240] shrink-0">
          <span className="text-[10px] text-[#5a4880] font-medium">{commits.length} commits</span>
        </div>
      )}
    </div>
  )
}
