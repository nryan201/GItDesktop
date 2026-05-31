import { useEffect, useRef, useState } from 'react'
import Editor, { type OnMount } from '@monaco-editor/react'
import { Save, FileText, Loader2, GitBranch } from 'lucide-react'
import { useGitStore } from '../store/useGitStore'

const EXT_TO_LANG: Record<string, string> = {
  ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
  css: 'css', scss: 'scss', html: 'html', json: 'json', md: 'markdown',
  py: 'python', rs: 'rust', go: 'go', java: 'java', cpp: 'cpp', c: 'c',
  sh: 'shell', yaml: 'yaml', yml: 'yaml', toml: 'ini', xml: 'xml',
  sql: 'sql', graphql: 'graphql', txt: 'plaintext',
}

function getLanguage(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() ?? ''
  return EXT_TO_LANG[ext] ?? 'plaintext'
}

function DiffView({ filePath, diff }: { filePath: string; diff: string }) {
  const lines = diff.split('\n')
  const fileName = filePath.split(/[\\/]/).pop() ?? filePath
  return (
    <div className="flex flex-1 flex-col bg-[#0c0c14] overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[#22223a] shrink-0 bg-[#12121c]">
        <div className="w-5 h-5 rounded-md bg-[#7c6af71a] flex items-center justify-center shrink-0">
          <GitBranch size={11} className="text-[#a594f9]" />
        </div>
        <span className="text-xs text-[#e4e4f0] font-semibold truncate flex-1">{fileName}</span>
        <span className="text-[10px] text-[#5a5a72] font-mono">{filePath}</span>
        <span className="text-[9px] font-bold text-[#a594f9] bg-[#7c6af71a] px-2 py-0.5 rounded-full">diff</span>
      </div>
      <div className="flex-1 overflow-auto font-mono text-xs leading-5">
        {lines.map((line, i) => {
          let bg = ''
          let color = 'text-[#5a5a72]'
          let prefix = ''
          if (line.startsWith('+++') || line.startsWith('---')) {
            color = 'text-[#5a5a72]'
          } else if (line.startsWith('+')) {
            bg = 'bg-[#0b2116]'
            color = 'text-[#34d399]'
            prefix = line[0]!
          } else if (line.startsWith('-')) {
            bg = 'bg-[#200f0f]'
            color = 'text-[#f87171]'
            prefix = line[0]!
          } else if (line.startsWith('@@')) {
            bg = 'bg-[#12121c]'
            color = 'text-[#7c6af7]'
          } else {
            color = 'text-[#9191aa]'
          }
          return (
            <div key={i} className={`flex ${bg}`}>
              <span className={`w-6 shrink-0 text-center select-none ${prefix === '+' ? 'text-[#34d39966]' : prefix === '-' ? 'text-[#f8717166]' : 'text-[#2d2d4d]'}`}>
                {prefix || ' '}
              </span>
              <span className={`${color} px-2 whitespace-pre-wrap break-all flex-1`}>{line.slice(1) || ' '}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function FilePreview() {
  const { selectedExplorerFile, fileContent, currentRepo, selectedStatusFile, workingDiff } = useGitStore()
  const [value, setValue] = useState('')
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null)

  // Sync editor content when file changes
  useEffect(() => {
    setValue(fileContent)
    setDirty(false)
    setSaveError('')
  }, [fileContent, selectedExplorerFile])

  // Ctrl+S to save
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        if (dirty) void handleSave()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [dirty, value, selectedExplorerFile, currentRepo])

  async function handleSave() {
    if (!currentRepo || !selectedExplorerFile) return
    setSaving(true)
    setSaveError('')
    const result = await window.gitAPI.writeFile(currentRepo, selectedExplorerFile, value)
    setSaving(false)
    if (result.success) {
      setDirty(false)
    } else {
      setSaveError(result.error ?? 'Save failed')
    }
  }

  const handleMount: OnMount = (editor) => {
    editorRef.current = editor
  }

  const fileName = selectedExplorerFile?.split(/[\\/]/).pop() ?? ''

  // Show diff view when a status file is selected
  if (selectedStatusFile) {
    return <DiffView filePath={selectedStatusFile.path} diff={workingDiff} />
  }

  if (!selectedExplorerFile) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-[#0c0c14] gap-3">
        <div className="w-12 h-12 rounded-2xl bg-[#191927] flex items-center justify-center">
          <FileText size={22} className="text-[#2d2d4d]" />
        </div>
        <p className="text-xs text-[#5a5a72]">Select a file to edit</p>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col bg-[#0c0c14] overflow-hidden">

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-[#22223a] shrink-0 bg-[#12121c]">
        <span className="text-xs text-[#e4e4f0] font-semibold truncate flex-1">
          {selectedExplorerFile}
          {dirty && <span className="ml-1.5 text-[#fbbf24]">●</span>}
        </span>

        {saveError && (
          <span className="text-[10px] text-[#f87171]">{saveError}</span>
        )}

        <button
          onClick={() => void handleSave()}
          disabled={!dirty || saving}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
            dirty
              ? 'bg-[#7c6af7] text-white hover:bg-[#8f7ff9]'
              : 'text-[#5a5a72] border border-[#22223a] cursor-not-allowed opacity-40'
          }`}
          title="Save (Ctrl+S)"
        >
          {saving
            ? <Loader2 size={11} className="animate-spin" />
            : <Save size={11} />}
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>

      {/* Monaco Editor */}
      <div className="flex-1 overflow-hidden">
        <Editor
          key={selectedExplorerFile}
          value={value}
          language={getLanguage(fileName)}
          theme="vs-dark"
          onMount={handleMount}
          onChange={(v) => {
            setValue(v ?? '')
            setDirty(true)
          }}
          options={{
            fontSize: 13,
            fontFamily: '"Cascadia Code", "Fira Code", Consolas, monospace',
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            lineNumbers: 'on',
            renderLineHighlight: 'line',
            tabSize: 2,
            automaticLayout: true,
            padding: { top: 12 },
          }}
        />
      </div>
    </div>
  )
}
