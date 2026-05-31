import { useState, useEffect, useRef } from 'react'
import {
  X, Github, Loader2, Check, Copy, ExternalLink,
  Plus, Lock, Globe, Star, GitFork, LogOut, RefreshCw,
} from 'lucide-react'
import type { GitHubRepo } from '../types/git'

type View = 'loading' | 'idle' | 'not_configured' | 'connecting' | 'connected' | 'creating'

interface GitHubUser {
  login: string
  name: string
  avatar_url: string
}

interface Props {
  onClose: () => void
  onClone: (url: string, repoName: string) => void
}

export function GitHubDialog({ onClose, onClone }: Props) {
  const [view, setView] = useState<View>('loading')
  const [user, setUser] = useState<GitHubUser | null>(null)
  const [repos, setRepos] = useState<GitHubRepo[]>([])
  const [search, setSearch] = useState('')
  const [loadingRepos, setLoadingRepos] = useState(false)

  // Device flow
  const [userCode, setUserCode] = useState('')
  const [deviceCode, setDeviceCode] = useState('')
  const [verificationUri, setVerificationUri] = useState('')
  const [copied, setCopied] = useState(false)
  const [authError, setAuthError] = useState('')
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // New repo
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newPrivate, setNewPrivate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')

  useEffect(() => {
    void loadSavedSession()
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [])

  async function loadSavedSession() {
    const profile = await window.gitAPI.getProfile()
    if (profile.githubToken) {
      try {
        const userData = await window.gitAPI.githubGetUser(profile.githubToken)
        if (userData.login) {
          setUser(userData)
          await loadRepos(profile.githubToken)
          setView('connected')
          return
        }
      } catch { /* token expired */ }
    }
    setView('idle')
  }

  async function loadRepos(token: string) {
    setLoadingRepos(true)
    const data = await window.gitAPI.githubListRepos(token)
    setRepos(Array.isArray(data) ? data : [])
    setLoadingRepos(false)
  }

  async function applyToken(token: string) {
    const userData = await window.gitAPI.githubGetUser(token)
    const profile = await window.gitAPI.getProfile()
    const gitEmail = userData.email ?? `${userData.id}+${userData.login}@users.noreply.github.com`
    await window.gitAPI.saveProfile({
      ...profile,
      name: userData.name || userData.login,
      email: gitEmail,
      githubToken: token,
      githubLogin: userData.login,
      githubAvatar: userData.avatar_url,
    })
    setUser(userData)
    await loadRepos(token)
    setView('connected')
  }

  async function startDeviceFlow() {
    setAuthError('')
    const data = await window.gitAPI.githubDeviceAuthStart()

    if (data.error === 'not_configured') { setView('not_configured'); return }
    if (data.error) { setAuthError(data.error); return }

    setDeviceCode(data.device_code)
    setUserCode(data.user_code)
    setVerificationUri(data.verification_uri)
    setView('connecting')

    void window.gitAPI.openExternal(data.verification_uri)

    // Start interval — stop immediately if poll succeeds
    let currentInterval = Math.max((data.interval ?? 5) * 1000, 5000)
    let polling = true

    const tick = async () => {
      if (!polling) return
      const result = await window.gitAPI.githubDeviceAuthPoll(data.device_code)
      if (result.access_token) {
        polling = false
        if (pollRef.current) clearInterval(pollRef.current)
        await applyToken(result.access_token)
      } else if (result.error === 'slow_down') {
        currentInterval += 5000
        if (pollRef.current) clearInterval(pollRef.current)
        pollRef.current = setInterval(() => void tick(), currentInterval)
      } else if (result.error === 'access_denied') {
        polling = false
        if (pollRef.current) clearInterval(pollRef.current)
        setAuthError('Access denied.')
        setView('idle')
      }
      // authorization_pending → keep polling normally
    }

    pollRef.current = setInterval(() => void tick(), currentInterval)
  }

  async function disconnect() {
    if (pollRef.current) clearInterval(pollRef.current)
    const profile = await window.gitAPI.getProfile()
    await window.gitAPI.saveProfile({
      ...profile, githubToken: '', githubLogin: '', githubAvatar: '',
    })
    setUser(null)
    setRepos([])
    setView('idle')
  }

  async function handleCreateRepo() {
    if (!newName.trim()) return
    setCreating(true)
    setCreateError('')
    const profile = await window.gitAPI.getProfile()
    const result = await window.gitAPI.githubCreateRepo(
      profile.githubToken, newName.trim(), newPrivate, newDesc.trim()
    )
    setCreating(false)
    if (result.clone_url) {
      setRepos(prev => [result, ...prev])
      onClone(result.clone_url, result.name)
      onClose()
    } else {
      setCreateError(result.message ?? 'Failed to create repository')
    }
  }

  function copyCode() {
    void navigator.clipboard.writeText(userCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const filtered = repos.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    (r.description ?? '').toLowerCase().includes(search.toLowerCase())
  )

  // ── Loading ────────────────────────────────────────────────────────────────
  if (view === 'loading') {
    return (
      <Wrapper onClose={onClose}>
        <div className="flex items-center justify-center py-16">
          <Loader2 size={24} className="animate-spin text-[#8b949e]" />
        </div>
      </Wrapper>
    )
  }

  // ── Not configured ─────────────────────────────────────────────────────────
  if (view === 'not_configured') {
    return (
      <Wrapper onClose={onClose} title="GitHub — Setup required">
        <div className="px-5 py-6 flex flex-col gap-4">
          <p className="text-xs text-[#8b949e] leading-relaxed">
            GitHub OAuth requires a <span className="text-[#e6edf3]">GitHub OAuth App</span> client ID.
          </p>
          <ol className="text-xs text-[#8b949e] leading-loose list-decimal pl-4 space-y-1">
            <li>Go to <span className="text-[#58a6ff]">github.com/settings/developers</span></li>
            <li>Click <strong className="text-[#e6edf3]">New OAuth App</strong></li>
            <li>Set any Homepage/Callback URL (e.g. <code className="text-[#79c0ff]">http://localhost</code>)</li>
            <li>Copy your <strong className="text-[#e6edf3]">Client ID</strong></li>
            <li>Paste it in <code className="text-[#79c0ff]">electron/main.ts</code> → <code className="text-[#79c0ff]">GITHUB_CLIENT_ID</code></li>
          </ol>
          <button
            onClick={() => void window.gitAPI.openExternal('https://github.com/settings/developers')}
            className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-[#58a6ff] border border-[#58a6ff]/30 rounded hover:bg-[#58a6ff]/10 transition-colors w-fit"
          >
            <ExternalLink size={12} /> Open GitHub Developer Settings
          </button>
        </div>
      </Wrapper>
    )
  }

  // ── Idle (not connected) ───────────────────────────────────────────────────
  if (view === 'idle') {
    return (
      <Wrapper onClose={onClose}>
        <div className="px-5 py-8 flex flex-col items-center gap-5">
          <div className="w-14 h-14 rounded-full bg-[#21262d] border border-[#30363d] flex items-center justify-center">
            <Github size={28} className="text-[#e6edf3]" />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-[#e6edf3]">Connect to GitHub</p>
            <p className="text-xs text-[#8b949e] mt-1">Access and create your repositories</p>
          </div>
          {authError && (
            <p className="text-xs text-[#f85149] bg-[#67060c]/50 border border-[#da3633] px-3 py-2 rounded">
              {authError}
            </p>
          )}
          <button
            onClick={() => void startDeviceFlow()}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium bg-[#238636] text-white rounded-lg hover:bg-[#2ea043] transition-colors"
          >
            <Github size={15} /> Sign in with GitHub
          </button>
        </div>
      </Wrapper>
    )
  }

  // ── Connecting (device flow) ───────────────────────────────────────────────
  if (view === 'connecting') {
    async function manualCheck() {
      // Stop auto-polling to avoid concurrent requests → slow_down
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }

      // Wait for any in-flight request to finish
      await new Promise(r => setTimeout(r, 2000))

      try {
        let result = await window.gitAPI.githubDeviceAuthPoll(deviceCode)

        // slow_down just means "wait more" — retry once after delay
        if (result.error === 'slow_down') {
          await new Promise(r => setTimeout(r, 6000))
          result = await window.gitAPI.githubDeviceAuthPoll(deviceCode)
        }

        if (result.access_token) {
          await applyToken(result.access_token)
        } else if (result.error === 'authorization_pending') {
          setAuthError('GitHub n\'a pas encore détecté l\'autorisation. Réessaie dans quelques secondes.')
        } else if (result.error === 'access_denied') {
          setAuthError('Accès refusé.')
          setView('idle')
        } else {
          setAuthError(result.error ?? 'Erreur inconnue.')
          setView('idle')
        }
      } catch (e) {
        setAuthError(String(e))
        setView('idle')
      }
    }

    return (
      <Wrapper onClose={onClose} title="Authorize on GitHub">
        <div className="px-5 py-6 flex flex-col gap-5">
          <p className="text-xs text-[#8b949e]">
            A browser tab has opened. Enter this code on <span className="text-[#58a6ff]">github.com/login/device</span>:
          </p>
          <div className="flex items-center gap-3">
            <div className="flex-1 text-center font-mono text-2xl font-bold tracking-[0.3em] text-[#e6edf3] bg-[#0d1117] border border-[#30363d] rounded-lg py-3">
              {userCode}
            </div>
            <button
              onClick={copyCode}
              className="p-2.5 rounded-lg bg-[#21262d] border border-[#30363d] text-[#8b949e] hover:text-[#e6edf3] transition-colors"
              title="Copy code"
            >
              {copied ? <Check size={16} className="text-[#3fb950]" /> : <Copy size={16} />}
            </button>
          </div>
          <button
            onClick={() => void window.gitAPI.openExternal(verificationUri)}
            className="flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium text-[#58a6ff] border border-[#58a6ff]/30 rounded-lg hover:bg-[#58a6ff]/10 transition-colors"
          >
            <ExternalLink size={12} /> Open github.com/login/device
          </button>
          {authError ? (
            <p className="text-xs text-[#f85149] bg-[#67060c]/50 border border-[#da3633] px-3 py-2 rounded">
              {authError}
            </p>
          ) : (
            <div className="flex items-center gap-2 text-xs text-[#8b949e]">
              <Loader2 size={12} className="animate-spin" />
              Waiting for authorization…
            </div>
          )}
          <div className="flex items-center gap-3">
            <button
              onClick={() => void manualCheck()}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium bg-[#238636] text-white rounded hover:bg-[#2ea043] transition-colors"
            >
              <Check size={12} /> I've authorized
            </button>
            <button
              onClick={() => { if (pollRef.current) clearInterval(pollRef.current); setView('idle') }}
              className="text-xs text-[#8b949e] hover:text-[#e6edf3] transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </Wrapper>
    )
  }

  // ── Creating repo ──────────────────────────────────────────────────────────
  if (view === 'creating') {
    return (
      <Wrapper onClose={onClose} title="New Repository">
        <div className="px-5 py-5 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[#8b949e]">Repository name <span className="text-[#f85149]">*</span></label>
            <input
              autoFocus
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && void handleCreateRepo()}
              placeholder="my-awesome-project"
              className="px-3 py-2 text-sm bg-[#0d1117] border border-[#30363d] rounded text-[#e6edf3] placeholder-[#6e7681] outline-none focus:border-[#58a6ff] transition-colors"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[#8b949e]">Description <span className="text-[#6e7681] font-normal">(optional)</span></label>
            <input
              value={newDesc}
              onChange={e => setNewDesc(e.target.value)}
              placeholder="A short description..."
              className="px-3 py-2 text-sm bg-[#0d1117] border border-[#30363d] rounded text-[#e6edf3] placeholder-[#6e7681] outline-none focus:border-[#58a6ff] transition-colors"
            />
          </div>
          <div className="flex gap-2">
            {(['public', 'private'] as const).map(v => (
              <button
                key={v}
                onClick={() => setNewPrivate(v === 'private')}
                className={`flex items-center gap-2 flex-1 px-3 py-2.5 rounded border text-xs font-medium transition-colors ${
                  (v === 'private') === newPrivate
                    ? 'border-[#58a6ff] bg-[#388bfd1a] text-[#58a6ff]'
                    : 'border-[#30363d] text-[#8b949e] hover:border-[#8b949e]'
                }`}
              >
                {v === 'private' ? <Lock size={12} /> : <Globe size={12} />}
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
          {createError && (
            <p className="text-xs text-[#f85149] bg-[#67060c]/50 border border-[#da3633] px-3 py-2 rounded">{createError}</p>
          )}
        </div>
        <div className="flex justify-between gap-2 px-5 py-4 border-t border-[#30363d]">
          <button onClick={() => setView('connected')} className="px-4 py-1.5 text-xs text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#30363d] rounded transition-colors">
            Back
          </button>
          <button
            onClick={() => void handleCreateRepo()}
            disabled={!newName.trim() || creating}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium bg-[#238636] text-white rounded hover:bg-[#2ea043] transition-colors disabled:opacity-40"
          >
            {creating ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
            {creating ? 'Creating…' : 'Create Repository'}
          </button>
        </div>
      </Wrapper>
    )
  }

  // ── Connected — repo list ──────────────────────────────────────────────────
  return (
    <Wrapper onClose={onClose} wide>
      {/* User header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[#30363d]">
        <img src={user?.avatar_url} alt="" className="w-8 h-8 rounded-full" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[#e6edf3] truncate">{user?.name || user?.login}</p>
          <p className="text-xs text-[#8b949e]">@{user?.login}</p>
        </div>
        <button
          onClick={() => void disconnect()}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#8b949e] hover:text-[#f85149] hover:bg-[#f8514910] rounded transition-colors"
          title="Disconnect"
        >
          <LogOut size={12} /> Disconnect
        </button>
      </div>

      {/* Search + New */}
      <div className="flex gap-2 px-4 py-3 border-b border-[#30363d]">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search repositories…"
          className="flex-1 px-3 py-1.5 text-xs bg-[#0d1117] border border-[#30363d] rounded text-[#e6edf3] placeholder-[#6e7681] outline-none focus:border-[#58a6ff] transition-colors"
        />
        <button
          onClick={() => { void window.gitAPI.getProfile().then(pr => loadRepos(pr.githubToken)) }}
          title="Refresh"
          className="p-1.5 rounded text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#30363d] border border-[#30363d] transition-colors"
        >
          <RefreshCw size={13} className={loadingRepos ? 'animate-spin' : ''} />
        </button>
        <button
          onClick={() => setView('creating')}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#238636] text-white rounded hover:bg-[#2ea043] transition-colors"
        >
          <Plus size={12} /> New
        </button>
      </div>

      {/* Repo list */}
      <div className="overflow-y-auto max-h-[420px]">
        {loadingRepos ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 size={20} className="animate-spin text-[#8b949e]" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-xs text-[#8b949e] text-center py-10">No repositories found</p>
        ) : (
          filtered.map(repo => (
            <div key={repo.id} className="flex items-start gap-3 px-4 py-3 border-b border-[#21262d] hover:bg-[#161b22] transition-colors">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-semibold text-[#58a6ff] truncate">{repo.name}</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded border shrink-0 ${
                    repo.private
                      ? 'text-[#8b949e] border-[#30363d]'
                      : 'text-[#3fb950] border-[#238636]/50'
                  }`}>
                    {repo.private ? 'private' : 'public'}
                  </span>
                </div>
                {repo.description && (
                  <p className="text-[11px] text-[#8b949e] truncate mb-1">{repo.description}</p>
                )}
                <div className="flex items-center gap-3 text-[10px] text-[#6e7681]">
                  {repo.language && <span>{repo.language}</span>}
                  <span className="flex items-center gap-1"><Star size={10} />{repo.stargazers_count}</span>
                  <span className="flex items-center gap-1"><GitFork size={10} />{repo.forks_count}</span>
                </div>
              </div>
              <button
                onClick={() => { onClone(repo.clone_url, repo.name); onClose() }}
                className="shrink-0 px-3 py-1.5 text-xs font-medium text-[#58a6ff] border border-[#58a6ff]/30 rounded hover:bg-[#58a6ff]/10 transition-colors"
              >
                Clone
              </button>
            </div>
          ))
        )}
      </div>
    </Wrapper>
  )
}

function Wrapper({ children, onClose, title, wide }: {
  children: React.ReactNode
  onClose: () => void
  title?: string
  wide?: boolean
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className={`relative bg-[#161b22] border border-[#30363d] rounded-lg shadow-2xl ${wide ? 'w-[560px]' : 'w-[460px]'}`}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#30363d]">
          <div className="flex items-center gap-2">
            <Github size={15} className="text-[#e6edf3]" />
            <span className="text-sm font-semibold text-[#e6edf3]">{title ?? 'GitHub'}</span>
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
