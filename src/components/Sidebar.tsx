import { useState } from 'react'
import { FolderOpen, GitBranch, ChevronDown, ChevronRight, X, Globe } from 'lucide-react'
import { useGitStore } from '../store/useGitStore'

export function Sidebar() {
  const {
    repositories, currentRepo,
    branches, currentBranch,
    openRepository, selectRepository, removeRepository, selectBranch,
  } = useGitStore()

  const [localOpen, setLocalOpen] = useState(true)
  const [remoteOpen, setRemoteOpen] = useState(false)
  const [hoveredRepo, setHoveredRepo] = useState<string | null>(null)

  const localBranches = branches.filter(b => !b.remote)
  const remoteBranches = branches.filter(b => b.remote)

  function repoName(p: string) {
    return p.split(/[\\/]/).pop() ?? p
  }

  return (
    <aside className="w-60 shrink-0 flex flex-col bg-[#120f1e] border-r border-[#2a2240] overflow-hidden">

      {/* ── Repositories ─────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <span className="text-[10px] font-bold uppercase tracking-widest text-[#5a4880]">
          Repositories
        </span>
        <button
          onClick={() => void openRepository()}
          className="p-1 rounded-lg text-[#5a4880] hover:text-[#a78bfa] hover:bg-[#8b5cf620] transition-all"
          title="Open repository"
        >
          <FolderOpen size={12} />
        </button>
      </div>

      <div className="overflow-y-auto max-h-48 px-2 pb-1">
        {repositories.length === 0 ? (
          <p className="px-2 py-3 text-xs text-[#5a4880] text-center">
            No repositories yet
          </p>
        ) : (
          repositories.map(repo => (
            <div
              key={repo}
              onMouseEnter={() => setHoveredRepo(repo)}
              onMouseLeave={() => setHoveredRepo(null)}
              onClick={() => void selectRepository(repo)}
              className={`group flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-all ${
                currentRepo === repo
                  ? 'bg-[#8b5cf620] border border-[#8b5cf640]'
                  : 'border border-transparent text-[#9080c0] hover:bg-[#1a1528] hover:text-[#ede8ff]'
              }`}
            >
              <FolderOpen
                size={13}
                className={currentRepo === repo ? 'text-[#a78bfa] shrink-0' : 'text-[#5a4880] shrink-0'}
              />
              <span className={`text-xs flex-1 truncate font-medium ${currentRepo === repo ? 'text-[#ede8ff]' : ''}`}>
                {repoName(repo)}
              </span>
              {hoveredRepo === repo && (
                <button
                  onClick={e => { e.stopPropagation(); void removeRepository(repo) }}
                  className="opacity-0 group-hover:opacity-100 p-0.5 rounded-md hover:bg-[#f8717120] hover:text-[#f87171] text-[#5a4880] transition-all"
                >
                  <X size={11} />
                </button>
              )}
            </div>
          ))
        )}
      </div>

      <div className="h-px bg-[#2a2240] mx-3 my-2" />

      {/* ── Branches ─────────────────────────────────────── */}
      {currentRepo && (
        <div className="flex-1 overflow-y-auto px-2 pb-3">

          {/* Local */}
          <button
            onClick={() => setLocalOpen(v => !v)}
            className="flex items-center gap-1.5 w-full px-2 py-1.5 text-[10px] font-bold uppercase tracking-widest text-[#5a4880] hover:text-[#9080c0] transition-colors"
          >
            {localOpen ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
            Local
          </button>

          {localOpen && localBranches.map(branch => (
            <div
              key={branch.name}
              onClick={() => void selectBranch(branch.name)}
              className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-all ${
                branch.current
                  ? 'bg-[#8b5cf620] border border-[#8b5cf640]'
                  : 'border border-transparent text-[#9080c0] hover:bg-[#1a1528] hover:text-[#ede8ff]'
              }`}
            >
              <GitBranch size={12} className={`shrink-0 ${branch.current ? 'text-[#a78bfa]' : 'text-[#5a4880]'}`} />
              <span className={`text-xs truncate ${branch.current ? 'font-semibold text-[#ede8ff]' : ''}`}>
                {branch.name}
              </span>
              {branch.current && (
                <span className="ml-auto text-[9px] font-bold bg-[#8b5cf630] text-[#a78bfa] px-1.5 py-0.5 rounded-full shrink-0">
                  HEAD
                </span>
              )}
            </div>
          ))}

          {/* Remote */}
          {remoteBranches.length > 0 && (
            <>
              <button
                onClick={() => setRemoteOpen(v => !v)}
                className="flex items-center gap-1.5 w-full px-2 py-1.5 mt-1 text-[10px] font-bold uppercase tracking-widest text-[#5a4880] hover:text-[#9080c0] transition-colors"
              >
                {remoteOpen ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                Remote
              </button>

              {remoteOpen && remoteBranches.map(branch => (
                <div
                  key={branch.name}
                  onClick={() => void selectBranch(branch.name)}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer border border-transparent text-[#5a4880] hover:bg-[#1a1528] hover:text-[#ede8ff] transition-all"
                >
                  <Globe size={12} className="shrink-0" />
                  <span className="text-xs truncate">
                    {branch.name.replace(/^remotes\/[^/]+\//, '')}
                  </span>
                </div>
              ))}
            </>
          )}

          {localBranches.length === 0 && remoteBranches.length === 0 && (
            <p className="px-2 py-2 text-xs text-[#5a4880]">No branches found</p>
          )}
        </div>
      )}

      {!currentRepo && (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 px-4 pb-8">
          <div className="w-12 h-12 rounded-2xl bg-[#1a1528] flex items-center justify-center">
            <GitBranch size={22} className="text-[#3d3060]" />
          </div>
          <p className="text-xs text-[#5a4880] text-center leading-relaxed">
            Open a repository to see its branches
          </p>
          <button
            onClick={() => void openRepository()}
            className="text-xs text-[#a78bfa] hover:text-[#8b5cf6] transition-colors"
          >
            Open repository
          </button>
        </div>
      )}
    </aside>
  )
}
