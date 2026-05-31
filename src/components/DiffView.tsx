import { FileText, FilePlus, FileMinus, FileEdit, File } from 'lucide-react'
import { useGitStore } from '../store/useGitStore'
import type { FileStatus } from '../types/git'

// ─── File status helpers ───────────────────────────────────────────────────────

const STATUS_STYLES: Record<FileStatus, { label: string; className: string }> = {
  added:    { label: 'A', className: 'bg-[#238636]/30 text-[#3fb950] border border-[#238636]/50' },
  modified: { label: 'M', className: 'bg-[#9e6a03]/30 text-[#d29922] border border-[#9e6a03]/50' },
  deleted:  { label: 'D', className: 'bg-[#da3633]/30 text-[#f85149] border border-[#da3633]/50' },
  renamed:  { label: 'R', className: 'bg-[#1f6feb]/30 text-[#58a6ff] border border-[#1f6feb]/50' },
  copied:   { label: 'C', className: 'bg-[#6e40c9]/30 text-[#a5a0ff] border border-[#6e40c9]/50' },
}

function StatusBadge({ status }: { status: FileStatus }) {
  const s = STATUS_STYLES[status] ?? STATUS_STYLES.modified
  return (
    <span className={`text-[9px] font-bold px-1 py-0.5 rounded ${s.className}`}>
      {s.label}
    </span>
  )
}

function FileIcon({ status }: { status: FileStatus }) {
  const props = { size: 13, className: 'shrink-0' }
  switch (status) {
    case 'added':   return <FilePlus {...props} className="shrink-0 text-[#3fb950]" />
    case 'deleted': return <FileMinus {...props} className="shrink-0 text-[#f85149]" />
    case 'modified':return <FileEdit {...props} className="shrink-0 text-[#d29922]" />
    default:        return <File {...props} className="shrink-0 text-[#8b949e]" />
  }
}

// ─── Diff renderer ─────────────────────────────────────────────────────────────

function DiffLine({ line, index }: { line: string; index: number }) {
  let bg = ''
  let text = 'text-[#8b949e]'

  if (line.startsWith('diff --git') || line.startsWith('index ') || line.startsWith('new file') || line.startsWith('deleted file')) {
    text = 'text-[#6e7681]'
  } else if (line.startsWith('--- ') || line.startsWith('+++ ')) {
    text = 'text-[#8b949e]'
  } else if (line.startsWith('@@')) {
    bg = 'bg-[#1f3352]'
    text = 'text-[#79c0ff]'
  } else if (line.startsWith('+')) {
    bg = 'bg-[#0d4429]'
    text = 'text-[#aff5b4]'
  } else if (line.startsWith('-')) {
    bg = 'bg-[#67060c]'
    text = 'text-[#ffa198]'
  } else {
    text = 'text-[#c9d1d9]'
  }

  return (
    <div key={index} className={`flex font-mono text-[11px] leading-5 ${bg}`}>
      <span className="w-10 text-right pr-3 text-[#6e7681] select-none shrink-0 border-r border-[#21262d]">
        {index + 1}
      </span>
      <span className={`pl-3 flex-1 whitespace-pre ${text}`}>
        {line || ' '}
      </span>
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────

export function DiffView() {
  const { selectedCommit, changedFiles, selectedFile, diff, selectFile } = useGitStore()

  if (!selectedCommit) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#0d1117]">
        <FileText size={36} className="text-[#30363d] mb-3" />
        <p className="text-sm text-[#8b949e] font-medium">Select a commit to view changes</p>
        <p className="text-xs text-[#6e7681] mt-1">Click any commit in the history panel</p>
      </div>
    )
  }

  const lines = diff.split('\n')

  return (
    <div className="flex-1 flex flex-col bg-[#0d1117] overflow-hidden min-w-0">

      {/* Commit summary bar */}
      <div className="px-4 py-2 border-b border-[#30363d] shrink-0 bg-[#161b22]">
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-[#58a6ff] bg-[#388bfd1a] px-1.5 py-0.5 rounded">
            {selectedCommit.shortHash}
          </span>
          <p className="text-sm text-[#e6edf3] font-medium truncate flex-1">
            {selectedCommit.message}
          </p>
        </div>
        <p className="text-xs text-[#8b949e] mt-0.5">
          {selectedCommit.author_name} · {new Date(selectedCommit.date).toLocaleString()}
        </p>
      </div>

      <div className="flex-1 flex overflow-hidden">

        {/* ── Changed files list ───────────────────────── */}
        <div className="w-64 shrink-0 flex flex-col border-r border-[#30363d] overflow-hidden">
          <div className="px-3 py-1.5 border-b border-[#30363d] shrink-0">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#8b949e]">
              Changed files · {changedFiles.length}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto">
            {changedFiles.length === 0 ? (
              <p className="px-3 py-3 text-xs text-[#8b949e]">No changed files</p>
            ) : (
              changedFiles.map(cf => (
                <button
                  key={cf.file}
                  onClick={() => void selectFile(cf.file)}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-left border-b border-[#21262d] transition-colors ${
                    selectedFile === cf.file
                      ? 'bg-[#388bfd1a] border-l-2 border-l-[#58a6ff]'
                      : 'hover:bg-[#161b22]'
                  }`}
                >
                  <FileIcon status={cf.status} />
                  <span className="text-xs text-[#c9d1d9] flex-1 truncate" title={cf.file}>
                    {cf.file.split('/').pop() ?? cf.file}
                  </span>
                  <StatusBadge status={cf.status} />
                </button>
              ))
            )}
          </div>
        </div>

        {/* ── Diff content ─────────────────────────────── */}
        <div className="flex-1 overflow-auto min-w-0">
          {selectedFile ? (
            <>
              {/* File path header */}
              <div className="sticky top-0 px-4 py-1.5 bg-[#161b22] border-b border-[#30363d] z-10">
                <span className="font-mono text-xs text-[#8b949e]">{selectedFile}</span>
              </div>

              {diff ? (
                <div className="pb-8">
                  {lines.map((line, i) => (
                    <DiffLine key={i} line={line} index={i} />
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-32">
                  <p className="text-xs text-[#8b949e]">No diff available for this file</p>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full">
              <FileText size={24} className="text-[#30363d] mb-2" />
              <p className="text-xs text-[#8b949e]">Select a file to view diff</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
