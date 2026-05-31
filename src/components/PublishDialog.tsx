import { useState, useEffect } from 'react'
import { X, Upload, Lock, Globe, Loader2, Check, ExternalLink } from 'lucide-react'
import type { GitHubRepo } from '../types/git'

interface Props {
  repoPath: string
  repoName: string
  onClose: () => void
}

type View = 'form' | 'publishing' | 'done'

export function PublishDialog({ repoPath, repoName, onClose }: Props) {
  const [view, setView] = useState<View>('form')
  const [name, setName] = useState(repoName)
  const [desc, setDesc] = useState('')
  const [isPrivate, setIsPrivate] = useState(false)
  const [error, setError] = useState('')
  const [repoUrl, setRepoUrl] = useState('')
  const [connected, setConnected] = useState(true)

  useEffect(() => {
    void window.gitAPI.getProfile().then(p => {
      if (!p.githubToken) setConnected(false)
    })
  }, [])

  async function handlePublish() {
    setError('')
    setView('publishing')

    const profile = await window.gitAPI.getProfile()

    if (!profile.githubToken) {
      setError('Non connecté à GitHub. Clique sur le bouton GitHub dans la toolbar.')
      setView('form')
      return
    }

    // 1. Create GitHub repo (without auto_init — we'll push local content)
    const created = await window.gitAPI.githubCreateRepo(
      profile.githubToken, name.trim(), isPrivate, desc.trim(), false
    ) as GitHubRepo & { message?: string; errors?: { message: string }[] }

    if (!created.clone_url) {
      const detail = created.errors?.map(e => e.message).join(', ')
      setError(detail ?? created.message ?? 'Failed to create repository on GitHub')
      setView('form')
      return
    }

    // 2. Push local repo to GitHub
    const result = await window.gitAPI.publishToGitHub(repoPath, created.clone_url)

    if (!result.success) {
      setError(result.error ?? 'Push failed')
      setView('form')
      return
    }

    setRepoUrl(created.html_url)
    setView('done')
  }

  if (!connected) {
    return (
      <Wrapper onClose={onClose}>
        <div className="px-5 py-8 flex flex-col items-center gap-4 text-center">
          <p className="text-sm text-[#e6edf3] font-medium">GitHub not connected</p>
          <p className="text-xs text-[#8b949e]">
            Connect your GitHub account first via the <strong className="text-[#e6edf3]">GitHub</strong> button in the toolbar.
          </p>
          <button onClick={onClose} className="px-4 py-1.5 text-xs font-medium bg-[#238636] text-white rounded hover:bg-[#2ea043] transition-colors">
            OK
          </button>
        </div>
      </Wrapper>
    )
  }

  if (view === 'publishing') {
    return (
      <Wrapper onClose={onClose}>
        <div className="px-5 py-10 flex flex-col items-center gap-3">
          <Loader2 size={24} className="animate-spin text-[#58a6ff]" />
          <p className="text-sm text-[#8b949e]">Publishing to GitHub…</p>
        </div>
      </Wrapper>
    )
  }

  if (view === 'done') {
    return (
      <Wrapper onClose={onClose}>
        <div className="px-5 py-8 flex flex-col items-center gap-4 text-center">
          <div className="w-12 h-12 rounded-full bg-[#238636]/20 border border-[#238636]/50 flex items-center justify-center">
            <Check size={22} className="text-[#3fb950]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#e6edf3]">Published successfully!</p>
            <p className="text-xs text-[#8b949e] mt-1">{name} is now on GitHub</p>
          </div>
          <button
            onClick={() => void window.gitAPI.openExternal(repoUrl)}
            className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-[#58a6ff] border border-[#58a6ff]/30 rounded hover:bg-[#58a6ff]/10 transition-colors"
          >
            <ExternalLink size={12} /> View on GitHub
          </button>
          <button onClick={onClose} className="text-xs text-[#8b949e] hover:text-[#e6edf3] transition-colors">
            Close
          </button>
        </div>
      </Wrapper>
    )
  }

  return (
    <Wrapper onClose={onClose}>
      <div className="px-5 py-5 flex flex-col gap-4">

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-[#8b949e]">Repository name</label>
          <input
            autoFocus
            value={name}
            onChange={e => setName(e.target.value)}
            className="px-3 py-2 text-sm bg-[#0d1117] border border-[#30363d] rounded text-[#e6edf3] outline-none focus:border-[#58a6ff] transition-colors"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-[#8b949e]">Description <span className="font-normal text-[#6e7681]">(optional)</span></label>
          <input
            value={desc}
            onChange={e => setDesc(e.target.value)}
            placeholder="A short description..."
            className="px-3 py-2 text-sm bg-[#0d1117] border border-[#30363d] rounded text-[#e6edf3] placeholder-[#6e7681] outline-none focus:border-[#58a6ff] transition-colors"
          />
        </div>

        <div className="flex gap-2">
          {(['public', 'private'] as const).map(v => (
            <button
              key={v}
              onClick={() => setIsPrivate(v === 'private')}
              className={`flex items-center gap-2 flex-1 px-3 py-2.5 rounded border text-xs font-medium transition-colors ${
                (v === 'private') === isPrivate
                  ? 'border-[#58a6ff] bg-[#388bfd1a] text-[#58a6ff]'
                  : 'border-[#30363d] text-[#8b949e] hover:border-[#8b949e]'
              }`}
            >
              {v === 'private' ? <Lock size={12} /> : <Globe size={12} />}
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>

        {error && (
          <p className="text-xs text-[#f85149] bg-[#67060c]/50 border border-[#da3633] px-3 py-2 rounded break-words">
            {error}
          </p>
        )}
      </div>

      <div className="flex justify-end gap-2 px-5 py-4 border-t border-[#30363d]">
        <button onClick={onClose} className="px-4 py-1.5 text-xs text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#30363d] rounded transition-colors">
          Cancel
        </button>
        <button
          onClick={() => void handlePublish()}
          disabled={!name.trim()}
          className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium bg-[#238636] text-white rounded hover:bg-[#2ea043] transition-colors disabled:opacity-40"
        >
          <Upload size={12} /> Publish to GitHub
        </button>
      </div>
    </Wrapper>
  )
}

function Wrapper({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-[440px] bg-[#161b22] border border-[#30363d] rounded-lg shadow-2xl">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#30363d]">
          <div className="flex items-center gap-2">
            <Upload size={14} className="text-[#58a6ff]" />
            <span className="text-sm font-semibold text-[#e6edf3]">Publish to GitHub</span>
          </div>
          <button onClick={onClose} className="p-1 rounded text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#30363d] transition-colors">
            <X size={14} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
