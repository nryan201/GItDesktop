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
  return (
    <div className="flex flex-1 flex-col bg-[#0d1117] overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2 border-b border-[#30363d] shrink-0 bg-[#161b22]">
        <GitBranch size={13} className="text-[#58a6ff] shrink-0" />
        <span className="text-xs text-[#e6edf3] font-medium truncate flex-1">{filePath}</span>
        <span className="text-[10px] text-[#8b949e]">diff</span>
      </div>
      <div className="flex-1 overflow-auto font-mono text-xs leading-5">
        {lines.map((line, i) => {
          let bg = ''
          let color = 'text-[#8b949e]'
          if (line.startsWith('+++') || line.startsWith('---')) {
            color = 'text-[#8b949e]'
          } else if (line.startsWith('+')) {
            bg = 'bg-[#0d2b12]'
            color = 'text-[#3fb950]'
          } else if (line.startsWith('-')) {
            bg = 'bg-[#2d0d0d]'
            color = 'text-[#f85149]'
          } else if (line.startsWith('@@')) {
            bg = 'bg-[#1f2937]'
            color = 'text-[#58a6ff]'
          } else {
            color = 'text-[#c9d1d9]'
          }
          return (
            <div key={i} className={`flex ${bg} px-4 whitespace-pre-wrap break-all`}>
              <span className={color}>{line || ' '}</span>
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
      <div className="flex flex-1 flex-col items-center justify-center bg-[#0d1117]">
        <FileText size={32} className="text-[#30363d] mb-2" />
        <p className="text-xs text-[#8b949e]">Select a file to edit</p>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col bg-[#0d1117] overflow-hidden">

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-[#30363d] shrink-0 bg-[#161b22]">
        <span className="text-xs text-[#e6edf3] font-medium truncate flex-1">
          {selectedExplorerFile}
          {dirty && <span className="ml-1.5 text-[#d29922]">●</span>}
        </span>

        {saveError && (
          <span className="text-[10px] text-[#f85149]">{saveError}</span>
        )}

        <button
          onClick={() => void handleSave()}
          disabled={!dirty || saving}
          className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded transition-colors ${
            dirty
              ? 'bg-[#238636] text-white hover:bg-[#2ea043]'
              : 'text-[#8b949e] border border-[#30363d] cursor-not-allowed opacity-50'
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
