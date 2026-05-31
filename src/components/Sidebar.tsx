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
    <aside className="w-60 shrink-0 flex flex-col bg-[#161b22] border-r border-[#30363d] overflow-hidden">

      {/* ── Repositories ─────────────────────────────────── */}
      <div className="flex items-center justify-between px-3 pt-3 pb-1">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[#8b949e]">
          Repositories
        </span>
        <button
          onClick={() => void openRepository()}
          className="p-0.5 rounded text-[#8b949e] hover:text-[#58a6ff] hover:bg-[#30363d] transition-colors"
          title="Open repository"
        >
          <FolderOpen size={13} />
        </button>
      </div>

      <div className="overflow-y-auto max-h-48 px-1">
        {repositories.length === 0 ? (
          <p className="px-2 py-3 text-xs text-[#8b949e] text-center">
            No repositories yet
          </p>
        ) : (
          repositories.map(repo => (
            <div
              key={repo}
              onMouseEnter={() => setHoveredRepo(repo)}
              onMouseLeave={() => setHoveredRepo(null)}
              onClick={() => void selectRepository(repo)}
              className={`group flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors ${
                currentRepo === repo
                  ? 'bg-[#388bfd1a] text-[#e6edf3]'
                  : 'text-[#8b949e] hover:bg-[#30363d] hover:text-[#e6edf3]'
              }`}
            >
              <FolderOpen
                size={13}
                className={currentRepo === repo ? 'text-[#58a6ff]' : 'text-[#8b949e]'}
              />
              <span className="text-xs flex-1 truncate">{repoName(repo)}</span>
              {hoveredRepo === repo && (
                <button
                  onClick={e => { e.stopPropagation(); void removeRepository(repo) }}
                  className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-[#f8514933] hover:text-[#f85149] transition-all"
                >
                  <X size={11} />
                </button>
              )}
            </div>
          ))
        )}
      </div>

      <div className="h-px bg-[#30363d] mx-3 my-2" />

      {/* ── Branches ─────────────────────────────────────── */}
      {currentRepo && (
        <div className="flex-1 overflow-y-auto px-1 pb-2">

          {/* Local */}
          <button
            onClick={() => setLocalOpen(v => !v)}
            className="flex items-center gap-1 w-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#8b949e] hover:text-[#e6edf3] transition-colors"
          >
            {localOpen ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
            Local Branches
          </button>

          {localOpen && localBranches.map(branch => (
            <div
              key={branch.name}
              onClick={() => void selectBranch(branch.name)}
              className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors ${
                branch.current
                  ? 'bg-[#388bfd1a] text-[#58a6ff]'
                  : 'text-[#8b949e] hover:bg-[#30363d] hover:text-[#e6edf3]'
              }`}
            >
              <GitBranch size={12} className="shrink-0" />
              <span className={`text-xs truncate ${branch.current ? 'font-semibold' : ''}`}>
                {branch.name}
              </span>
              {branch.current && (
                <span className="ml-auto text-[9px] bg-[#388bfd33] text-[#58a6ff] px-1 py-0.5 rounded shrink-0">
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
                className="flex items-center gap-1 w-full px-2 py-1 mt-1 text-[10px] font-semibold uppercase tracking-wider text-[#8b949e] hover:text-[#e6edf3] transition-colors"
              >
                {remoteOpen ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                Remote Branches
              </button>

              {remoteOpen && remoteBranches.map(branch => (
                <div
                  key={branch.name}
                  onClick={() => void selectBranch(branch.name)}
                  className="flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer text-[#6e7681] hover:bg-[#30363d] hover:text-[#e6edf3] transition-colors"
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
            <p className="px-2 py-2 text-xs text-[#8b949e]">No branches found</p>
          )}
        </div>
      )}

      {!currentRepo && (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 px-4 pb-8">
          <GitBranch size={28} className="text-[#30363d]" />
          <p className="text-xs text-[#8b949e] text-center">
            Open a repository to see its branches
          </p>
          <button
            onClick={() => void openRepository()}
            className="text-xs text-[#58a6ff] hover:underline"
          >
            Open repository
          </button>
        </div>
      )}
    </aside>
  )
}
