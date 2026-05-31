import { useState } from 'react'
import { RefreshCw, Upload, GitBranch, FolderOpen, Loader2, X, Check, Download, Settings, Github } from 'lucide-react'
import { useGitStore } from '../store/useGitStore'
import { ProfileDialog } from './ProfileDialog'
import { GitHubDialog } from './GitHubDialog'
import { PublishDialog } from './PublishDialog'

interface Props {
  onCloneClick: (initialUrl?: string) => void
}

export function Toolbar({ onCloneClick }: Props) {
  const { currentRepo, currentBranch, isLoading, fetch, push, createBranch, openRepository } =
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
    <div className="flex items-center gap-2 h-12 px-4 bg-[#161b22] border-b border-[#30363d] shrink-0 select-none">
      {/* Repo indicator */}
      <div className="flex items-center gap-2 mr-2">
        <FolderOpen size={14} className="text-[#58a6ff]" />
        <span className="text-sm font-medium text-[#e6edf3] max-w-[160px] truncate">
          {repoName ?? 'No repository'}
        </span>
        {currentBranch && (
          <>
            <span className="text-[#30363d]">/</span>
            <GitBranch size={13} className="text-[#3fb950]" />
            <span className="text-sm text-[#3fb950] max-w-[140px] truncate">{currentBranch}</span>
          </>
        )}
      </div>

      <div className="flex-1" />

      {/* Action buttons */}
      <button
        onClick={() => void openRepository()}
        className="toolbar-btn"
        title="Open local repository"
      >
        <FolderOpen size={14} />
        <span>Open</span>
      </button>

      <button
        onClick={onCloneClick}
        className="toolbar-btn"
        title="Clone remote repository"
      >
        <Download size={14} />
        <span>Clone</span>
      </button>

      <div className="w-px h-5 bg-[#30363d]" />

      <button
        onClick={() => void fetch()}
        disabled={!currentRepo || isLoading}
        className="toolbar-btn"
        title="Fetch from remote"
      >
        {isLoading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
        <span>Fetch</span>
      </button>

      <button
        onClick={() => void push()}
        disabled={!currentRepo || isLoading}
        className="toolbar-btn"
        title="Push to remote"
      >
        <Upload size={14} />
        <span>Push</span>
      </button>

      {/* New Branch */}
      {showNewBranch ? (
        <div className="flex items-center gap-1">
          <input
            autoFocus
            value={newBranchName}
            onChange={e => setNewBranchName(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') void handleCreateBranch()
              if (e.key === 'Escape') { setShowNewBranch(false); setNewBranchName('') }
            }}
            placeholder="branch-name"
            className="h-7 px-2 text-xs bg-[#0d1117] border border-[#58a6ff] rounded text-[#e6edf3] outline-none w-36"
          />
          <button
            onClick={() => void handleCreateBranch()}
            className="p-1.5 rounded text-[#3fb950] hover:bg-[#238636]/20 transition-colors"
          >
            <Check size={13} />
          </button>
          <button
            onClick={() => { setShowNewBranch(false); setNewBranchName('') }}
            className="p-1.5 rounded text-[#8b949e] hover:bg-[#30363d] transition-colors"
          >
            <X size={13} />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowNewBranch(true)}
          disabled={!currentRepo || isLoading}
          className="toolbar-btn"
          title="Create new branch"
        >
          <GitBranch size={14} />
          <span>New Branch</span>
        </button>
      )}

      <div className="w-px h-5 bg-[#30363d]" />

      <button
        onClick={() => setShowProfile(true)}
        className="toolbar-btn"
        title="Git profile & token"
      >
        <Settings size={14} />
        <span>Profile</span>
      </button>

      {currentRepo && (
        <button
          onClick={() => setShowPublish(true)}
          disabled={isLoading}
          className="toolbar-btn"
          title="Publish to GitHub"
        >
          <Upload size={14} />
          <span>Publish</span>
        </button>
      )}

      <button
        onClick={() => setShowGitHub(true)}
        className="toolbar-btn"
        title="GitHub"
      >
        <Github size={14} />
        <span>GitHub</span>
      </button>

      {showPublish && currentRepo && (
        <PublishDialog
          repoPath={currentRepo}
          repoName={repoName ?? ''}
          onClose={() => setShowPublish(false)}
        />
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
