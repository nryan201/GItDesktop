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
      <div className="relative w-[420px] bg-[#12121c] border border-[#2d2d4d] rounded-2xl shadow-2xl p-6 flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-[#7c6af71a] flex items-center justify-center">
            <GitBranch size={16} className="text-[#a594f9]" />
          </div>
          <h2 className="text-sm font-semibold text-[#e4e4f0]">Not a Git repository</h2>
        </div>
        <p className="text-xs text-[#9191aa] leading-relaxed">
          <span className="text-[#e4e4f0] font-medium">{folderName}</span> is not a Git repository.
          Do you want to initialize it?
        </p>
        <p className="text-[10px] font-mono text-[#5a5a72] bg-[#0c0c14] px-3 py-2 rounded-lg border border-[#22223a] truncate">
          {pendingInitRepo}
        </p>
        <div className="flex justify-end gap-2 pt-1">
          <button
            onClick={cancelInitRepo}
            className="px-4 py-1.5 text-xs font-medium text-[#9191aa] hover:text-[#e4e4f0] hover:bg-[#1f1f31] rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => void initRepository(pendingInitRepo)}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium bg-[#7c6af7] text-white rounded-lg hover:bg-[#8f7ff9] transition-colors"
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
    success: 'bg-[#0d2a1a] border-[#34d39933] text-[#34d399]',
    error:   'bg-[#2a0d0d] border-[#f8717133] text-[#f87171]',
    info:    'bg-[#0d1a2a] border-[#60a5fa33] text-[#60a5fa]',
  } as const

  return (
    <div className={`fixed bottom-4 right-4 z-40 flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-medium shadow-2xl max-w-sm ${styles[notification.type]}`}>
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
      className="w-px shrink-0 cursor-col-resize bg-[#22223a] hover:bg-[#7c6af7] transition-colors"
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
    <div className="flex flex-col h-full bg-[#0c0c14] text-[#e4e4f0] overflow-hidden">
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