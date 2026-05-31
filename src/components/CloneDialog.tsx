import { useState, useEffect } from 'react'
import { X, FolderOpen, GitBranch, Loader2, Download } from 'lucide-react'
import { useGitStore } from '../store/useGitStore'
import type { CloneProgress } from '../types/electron.d.ts'

interface Props {
  onClose: () => void
  initialUrl?: string
}

export function CloneDialog({ onClose, initialUrl = '' }: Props) {
  const selectRepository = useGitStore(s => s.selectRepository)

  const [url, setUrl] = useState(initialUrl)
  const [parentDir, setParentDir] = useState('')
  const [folderName, setFolderName] = useState('')
  const [isCloning, setIsCloning] = useState(false)
  const [progress, setProgress] = useState<CloneProgress | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Auto-derive folder name from URL
  useEffect(() => {
    const match = url.trim().match(/\/([^/]+?)(?:\.git)?\s*$/)
    setFolderName(match?.[1] ?? '')
  }, [url])

  // Subscribe to clone progress events
  useEffect(() => {
    const unsubscribe = window.gitAPI.onCloneProgress(data => setProgress(data))
    return unsubscribe
  }, [])

  async function handleBrowse() {
    const dir = await window.gitAPI.pickDirectory()
    if (dir) setParentDir(dir)
  }

  async function handleClone() {
    const trimUrl = url.trim()
    const trimDir = parentDir.trim()
    const trimName = folderName.trim()
    if (!trimUrl || !trimDir || !trimName) return

    setIsCloning(true)
    setError(null)
    setProgress(null)

    const result = await window.gitAPI.cloneRepository(trimUrl, trimDir, trimName)

    if (result.success && result.path) {
      await selectRepository(result.path)
      onClose()
    } else {
      setError(result.error ?? 'Clone failed')
      setIsCloning(false)
    }
  }

  const previewPath = parentDir && folderName
    ? `${parentDir.replace(/[\\/]+$/, '')}\\${folderName}`
    : null

  const canClone = url.trim() && parentDir.trim() && folderName.trim() && !isCloning

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60"
        onClick={isCloning ? undefined : onClose}
      />

      {/* Panel */}
      <div className="relative w-[520px] bg-[#161b22] border border-[#30363d] rounded-lg shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#30363d]">
          <div className="flex items-center gap-2">
            <Download size={15} className="text-[#58a6ff]" />
            <h2 className="text-sm font-semibold text-[#e6edf3]">Clone Repository</h2>
          </div>
          {!isCloning && (
            <button
              onClick={onClose}
              className="p-1 rounded text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#30363d] transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="px-5 py-5 flex flex-col gap-4">

          {/* URL */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[#8b949e]">Repository URL</label>
            <input
              autoFocus
              value={url}
              onChange={e => setUrl(e.target.value)}
              onKeyDown={e => { if (e.key === 'Escape' && !isCloning) onClose() }}
              placeholder="https://github.com/user/repository.git"
              disabled={isCloning}
              className="px-3 py-2 text-sm bg-[#0d1117] border border-[#30363d] rounded
                         text-[#e6edf3] placeholder-[#6e7681] outline-none
                         focus:border-[#58a6ff] transition-colors disabled:opacity-50"
            />
          </div>

          {/* Destination folder */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[#8b949e]">Destination</label>
            <div className="flex gap-2">
              <input
                value={parentDir}
                onChange={e => setParentDir(e.target.value)}
                placeholder="C:\Projects"
                disabled={isCloning}
                className="flex-1 px-3 py-2 text-sm bg-[#0d1117] border border-[#30363d] rounded
                           text-[#e6edf3] placeholder-[#6e7681] outline-none
                           focus:border-[#58a6ff] transition-colors disabled:opacity-50"
              />
              <button
                onClick={() => void handleBrowse()}
                disabled={isCloning}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium
                           text-[#8b949e] bg-[#21262d] border border-[#30363d] rounded
                           hover:text-[#e6edf3] hover:bg-[#30363d] transition-colors disabled:opacity-50"
              >
                <FolderOpen size={13} />
                Browse
              </button>
            </div>
          </div>

          {/* Local folder name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[#8b949e]">
              Folder name
              <span className="ml-1 font-normal text-[#6e7681]">(auto-filled from URL)</span>
            </label>
            <div className="flex items-center gap-2">
              <GitBranch size={13} className="text-[#8b949e] shrink-0" />
              <input
                value={folderName}
                onChange={e => setFolderName(e.target.value)}
                placeholder="repository-name"
                disabled={isCloning}
                className="flex-1 px-3 py-2 text-sm bg-[#0d1117] border border-[#30363d] rounded
                           text-[#e6edf3] placeholder-[#6e7681] outline-none
                           focus:border-[#58a6ff] transition-colors disabled:opacity-50"
              />
            </div>
          </div>

          {/* Full path preview */}
          {previewPath && (
            <p className="text-xs font-mono text-[#6e7681] bg-[#0d1117] px-3 py-2 rounded border border-[#21262d] truncate">
              → {previewPath}
            </p>
          )}

          {/* Progress */}
          {isCloning && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Loader2 size={13} className="animate-spin text-[#58a6ff] shrink-0" />
                <span className="text-xs text-[#8b949e]">
                  {progress
                    ? `${progress.stage} · ${progress.progress}%`
                    : 'Cloning…'}
                </span>
              </div>
              <div className="h-1 bg-[#21262d] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#58a6ff] transition-all duration-300 ease-out"
                  style={{ width: `${progress?.progress ?? 0}%` }}
                />
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="px-3 py-2 bg-[#67060c]/50 border border-[#da3633] rounded text-xs text-[#ffa198] break-words">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-[#30363d]">
          <button
            onClick={onClose}
            disabled={isCloning}
            className="px-4 py-1.5 text-xs font-medium text-[#8b949e]
                       hover:text-[#e6edf3] hover:bg-[#30363d] rounded transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={() => void handleClone()}
            disabled={!canClone}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium
                       bg-[#238636] text-white rounded hover:bg-[#2ea043]
                       transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download size={12} />
            Clone
          </button>
        </div>
      </div>
    </div>
  )
}
