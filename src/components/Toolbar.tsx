import { useState } from 'react'
import { RefreshCw, Upload, Download as PullIcon, GitBranch, FolderOpen, Loader2, X, Check, Download, Settings, Github, Minus, Square } from 'lucide-react'
import { useGitStore } from '../store/useGitStore'
import { ProfileDialog } from './ProfileDialog'
import { GitHubDialog } from './GitHubDialog'
import { PublishDialog } from './PublishDialog'

const noDrag = { WebkitAppRegion: 'no-drag' } as React.CSSProperties

interface Props {
  onCloneClick: (initialUrl?: string) => void
}

export function Toolbar({ onCloneClick }: Props) {
  const { currentRepo, currentBranch, isLoading, fetch, push, pull, createBranch, openRepository } =
    useGitStore()

  const [showNewBranch, setShowNewBranch] = useState(false)
  const [newBranchName, setNewBranchName] = useState('')
  const [showProfile, setShowProfile] = useState(false)
  const [showGitHub, setShowGitHub] = useState(false)
  const [showPublish, setShowPublish] = useState(false)
  const [pendingCloneUrl, setPendingCloneUrl] = useState<string | null>(null)

  const repoName = currentRepo ? currentRepo.split(/[\\/]/).pop() : null

  async function handleCreateBranch() {
    if (!newBranchName.trim()) return
    await createBranch(newBranchName.trim())
    setNewBranchName('')
    setShowNewBranch(false)
  }

  return (
    <div
      className="flex items-center gap-1.5 h-10 px-3 bg-[#120f1e] border-b border-[#2a2240] shrink-0 select-none"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      {/* Repo + branch pill */}
      <div style={noDrag} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1a1528] border border-[#3d3060] mr-2 max-w-xs">
        <FolderOpen size={13} className="text-[#8b5cf6] shrink-0" />
        <span className="text-xs font-semibold text-[#ede8ff] max-w-[120px] truncate">
          {repoName ?? 'No repository'}
        </span>
        {currentBranch && (
          <>
            <span className="text-[#3d3060]">/</span>
            <GitBranch size={12} className="text-[#a78bfa] shrink-0" />
            <span className="text-xs text-[#a78bfa] max-w-[100px] truncate">{currentBranch}</span>
          </>
        )}
      </div>

      <div className="flex-1" />

      {/* Action buttons */}
      <button style={noDrag} onClick={() => void openRepository()} className="toolbar-btn" title="Open local repository">
        <FolderOpen size={13} />
        <span>Open</span>
      </button>

      <button style={noDrag} onClick={() => onCloneClick()} className="toolbar-btn" title="Clone remote repository">
        <Download size={13} />
        <span>Clone</span>
      </button>

      <div className="w-px h-4 bg-[#2a2240]" />

      <button style={noDrag} onClick={() => void fetch()} disabled={!currentRepo || isLoading} className="toolbar-btn" title="Fetch from remote">
        {isLoading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
        <span>Fetch</span>
      </button>

      <button style={noDrag} onClick={() => void pull()} disabled={!currentRepo || isLoading} className="toolbar-btn" title="Pull from remote">
        <PullIcon size={13} />
        <span>Pull</span>
      </button>

      <button style={noDrag} onClick={() => void push()} disabled={!currentRepo || isLoading} className="toolbar-btn" title="Push to remote">
        <Upload size={13} />
        <span>Push</span>
      </button>

      {/* New Branch */}
      {showNewBranch ? (
        <div style={noDrag} className="flex items-center gap-1">
          <input
            autoFocus
            value={newBranchName}
            onChange={e => setNewBranchName(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') void handleCreateBranch()
              if (e.key === 'Escape') { setShowNewBranch(false); setNewBranchName('') }
            }}
            placeholder="branch-name"
            className="h-7 px-3 text-xs bg-[#0d0b14] border border-[#8b5cf6] rounded-lg text-[#ede8ff] outline-none w-36 placeholder-[#5a4880]"
          />
          <button onClick={() => void handleCreateBranch()} className="p-1.5 rounded-lg text-[#34d399] hover:bg-[#34d39920] transition-all">
            <Check size={13} />
          </button>
          <button onClick={() => { setShowNewBranch(false); setNewBranchName('') }} className="p-1.5 rounded-lg text-[#9080c0] hover:bg-[#1a1528] transition-all">
            <X size={13} />
          </button>
        </div>
      ) : (
        <button style={noDrag} onClick={() => setShowNewBranch(true)} disabled={!currentRepo || isLoading} className="toolbar-btn" title="Create new branch">
          <GitBranch size={13} />
          <span>Branch</span>
        </button>
      )}

      <div className="w-px h-4 bg-[#2a2240]" />

      <button style={noDrag} onClick={() => setShowProfile(true)} className="toolbar-btn" title="Git profile & token">
        <Settings size={13} />
        <span>Profile</span>
      </button>

      {currentRepo && (
        <button style={noDrag} onClick={() => setShowPublish(true)} disabled={isLoading} className="toolbar-btn" title="Publish to GitHub">
          <Upload size={13} />
          <span>Publish</span>
        </button>
      )}

      <button style={noDrag} onClick={() => setShowGitHub(true)} className="toolbar-btn" title="GitHub">
        <Github size={13} />
        <span>GitHub</span>
      </button>

      {/* Window controls */}
      <div style={noDrag} className="flex items-center ml-2">
        <button
          onClick={() => window.gitAPI.windowMinimize()}
          className="w-8 h-8 flex items-center justify-center text-[#5a4880] hover:text-[#ede8ff] hover:bg-[#1a1528] transition-all rounded-md"
        >
          <Minus size={13} />
        </button>
        <button
          onClick={() => window.gitAPI.windowMaximize()}
          className="w-8 h-8 flex items-center justify-center text-[#5a4880] hover:text-[#ede8ff] hover:bg-[#1a1528] transition-all rounded-md"
        >
          <Square size={11} />
        </button>
        <button
          onClick={() => window.gitAPI.windowClose()}
          className="w-8 h-8 flex items-center justify-center text-[#5a4880] hover:text-white hover:bg-[#f87171] transition-all rounded-md"
        >
          <X size={13} />
        </button>
      </div>

      {showPublish && currentRepo && (
        <PublishDialog repoPath={currentRepo} repoName={repoName ?? ''} onClose={() => setShowPublish(false)} />
      )}
      {showProfile && <ProfileDialog onClose={() => setShowProfile(false)} />}
      {showGitHub && (
        <GitHubDialog
          onClose={() => setShowGitHub(false)}
          onClone={(url, _name) => { setShowGitHub(false); onCloneClick(url) }}
        />
      )}
      {pendingCloneUrl && (
        <>{(() => { onCloneClick(pendingCloneUrl); setPendingCloneUrl(null); return null })()}</>
      )}
    </div>
  )
}
