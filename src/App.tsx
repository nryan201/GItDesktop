import { useEffect, useRef, useState, useCallback } from 'react'
import { GitBranch } from 'lucide-react'
import { Toolbar } from './components/Toolbar'
import { Sidebar } from './components/Sidebar'
import { CommitHistory } from './components/CommitHistory'
import { DiffView } from './components/DiffView'
import { CloneDialog } from './components/CloneDialog'
import { FileExplorer } from './components/FileExplorer'
import { useGitStore } from './store/useGitStore'
import { FilePreview } from './components/FilePreview'

function InitRepoDialog() {
  const { pendingInitRepo, initRepository, cancelInitRepo } = useGitStore()
  if (!pendingInitRepo) return null

  const folderName = pendingInitRepo.split(/[\\/]/).pop() ?? pendingInitRepo

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={cancelInitRepo} />
      <div className="relative w-[420px] bg-[#161b22] border border-[#30363d] rounded-lg shadow-2xl p-6 flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <GitBranch size={18} className="text-[#58a6ff]" />
          <h2 className="text-sm font-semibold text-[#e6edf3]">Not a Git repository</h2>
        </div>
        <p className="text-xs text-[#8b949e] leading-relaxed">
          <span className="text-[#e6edf3] font-medium">{folderName}</span> is not a Git repository.
          Do you want to initialize it?
        </p>
        <p className="text-[10px] font-mono text-[#6e7681] bg-[#0d1117] px-3 py-2 rounded border border-[#21262d] truncate">
          {pendingInitRepo}
        </p>
        <div className="flex justify-end gap-2 pt-1">
          <button
            onClick={cancelInitRepo}
            className="px-4 py-1.5 text-xs font-medium text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#30363d] rounded transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => void initRepository(pendingInitRepo)}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium bg-[#238636] text-white rounded hover:bg-[#2ea043] transition-colors"
          >
            <GitBranch size={12} />
            Initialize Repository
          </button>
        </div>
      </div>
    </div>
  )
}
function Toast() {
  const { notification, clearNotification } = useGitStore()
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!notification) return
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => clearNotification(), 4000)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [notification, clearNotification])

  if (!notification) return null

  const styles = {
    success: 'bg-[#0d4429] border-[#238636] text-[#3fb950]',
    error:   'bg-[#67060c] border-[#da3633] text-[#ffa198]',
    info:    'bg-[#0c2d6b] border-[#1f6feb] text-[#79c0ff]',
  } as const

  return (
    <div className={`fixed bottom-4 right-4 z-40 flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm shadow-xl max-w-sm ${styles[notification.type]}`}>
      <span className="flex-1">{notification.message}</span>
      <button onClick={clearNotification} className="ml-2 opacity-60 hover:opacity-100 text-lg leading-none">
        ×
      </button>
    </div>
  )
}

function Resizer({ onDelta }: { onDelta: (dx: number) => void }) {
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    let lastX = e.clientX
    const onMove = (e: MouseEvent) => { onDelta(e.clientX - lastX); lastX = e.clientX }
    const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp) }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [onDelta])

  return (
    <div
      onMouseDown={onMouseDown}
      className="w-1 shrink-0 cursor-col-resize bg-[#30363d] hover:bg-[#58a6ff] transition-colors"
    />
  )
}

export default function App() {
  const init = useGitStore(s => s.init)
  const [showClone, setShowClone] = useState(false)
  const [cloneInitialUrl, setCloneInitialUrl] = useState('')
  const [explorerWidth, setExplorerWidth] = useState(200)
  const [centerWidth, setCenterWidth] = useState(320)

  useEffect(() => {
    void init()
  }, [init])

  return (
    <div className="flex flex-col h-full bg-[#0d1117] text-[#e6edf3] overflow-hidden">
      <Toolbar onCloneClick={(url = '') => { setCloneInitialUrl(url); setShowClone(true) }} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <Resizer onDelta={dx => setExplorerWidth(w => Math.max(120, w + dx))} />
        <FileExplorer width={explorerWidth} />
        <Resizer onDelta={dx => setCenterWidth(w => Math.max(220, w + dx))} />
        <CommitHistory width={centerWidth} />
        <FilePreview />
      </div>
      <Toast />
      {showClone && <CloneDialog onClose={() => { setShowClone(false); setCloneInitialUrl('') }} initialUrl={cloneInitialUrl} />}
      <InitRepoDialog />
    </div>
  )
}