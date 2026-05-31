import { useState, useEffect } from 'react'
import { X, User, Eye, EyeOff, Save } from 'lucide-react'

interface Props {
  onClose: () => void
}

export function ProfileDialog({ onClose }: Props) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [token, setToken] = useState('')
  const [showToken, setShowToken] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    void window.gitAPI.getProfile().then(p => {
      setName(p.name)
      setEmail(p.email)
      setToken(p.token)
    })
  }, [])

  async function handleSave() {
    setSaving(true)
    const existing = await window.gitAPI.getProfile()
    await window.gitAPI.saveProfile({ ...existing, name, email, token })
    setSaving(false)
    setSaved(true)
    setTimeout(() => { setSaved(false); onClose() }, 800)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      <div className="relative w-[460px] bg-[#161b22] border border-[#30363d] rounded-lg shadow-2xl">

        <div className="flex items-center justify-between px-5 py-4 border-b border-[#30363d]">
          <div className="flex items-center gap-2">
            <User size={15} className="text-[#58a6ff]" />
            <h2 className="text-sm font-semibold text-[#e6edf3]">Git Profile</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#30363d] transition-colors">
            <X size={14} />
          </button>
        </div>

        <div className="px-5 py-5 flex flex-col gap-4">

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[#8b949e]">Display name</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="John Doe"
              className="px-3 py-2 text-sm bg-[#0d1117] border border-[#30363d] rounded text-[#e6edf3] placeholder-[#6e7681] outline-none focus:border-[#58a6ff] transition-colors"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[#8b949e]">Email</label>
            <input
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="john@example.com"
              type="email"
              className="px-3 py-2 text-sm bg-[#0d1117] border border-[#30363d] rounded text-[#e6edf3] placeholder-[#6e7681] outline-none focus:border-[#58a6ff] transition-colors"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[#8b949e]">
              Personal Access Token
              <span className="ml-1 font-normal text-[#6e7681]">(GitHub / GitLab)</span>
            </label>
            <div className="flex gap-2">
              <input
                value={token}
                onChange={e => setToken(e.target.value)}
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                type={showToken ? 'text' : 'password'}
                className="flex-1 px-3 py-2 text-sm bg-[#0d1117] border border-[#30363d] rounded text-[#e6edf3] placeholder-[#6e7681] outline-none focus:border-[#58a6ff] transition-colors font-mono"
              />
              <button
                onClick={() => setShowToken(v => !v)}
                className="px-3 py-2 text-[#8b949e] bg-[#21262d] border border-[#30363d] rounded hover:text-[#e6edf3] hover:bg-[#30363d] transition-colors"
              >
                {showToken ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
            </div>
            <p className="text-[10px] text-[#6e7681]">
              GitHub : Settings → Developer settings → Personal access tokens → Generate new token
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-[#30363d]">
          <button onClick={onClose} className="px-4 py-1.5 text-xs font-medium text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#30363d] rounded transition-colors">
            Cancel
          </button>
          <button
            onClick={() => void handleSave()}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium bg-[#238636] text-white rounded hover:bg-[#2ea043] transition-colors disabled:opacity-50"
          >
            <Save size={12} />
            {saved ? 'Saved!' : saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
