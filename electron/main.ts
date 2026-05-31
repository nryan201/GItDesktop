import { app, BrowserWindow, ipcMain, dialog, shell, Menu } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'
import simpleGit from 'simple-git'

const __dirname = path.dirname(fileURLToPath(import.meta.url))


let mainWindow: BrowserWindow | null = null

const GITHUB_CLIENT_ID = 'Ov23linFDelDS9YOcuAz'

ipcMain.handle('shell:open-external', (_e, url: string) => shell.openExternal(url))

ipcMain.handle('github:device-auth-start', async () => {
  if (!GITHUB_CLIENT_ID) return { error: 'not_configured' }
  const res = await fetch('https://github.com/login/device/code', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: GITHUB_CLIENT_ID, scope: 'repo user' }),
  })
  return res.json()
})

ipcMain.handle('github:device-auth-poll', async (_e, deviceCode: string) => {
  const res = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: GITHUB_CLIENT_ID,
      device_code: deviceCode,
      grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
    }),
  })
  return await res.json()
})

ipcMain.handle('github:get-user', async (_e, token: string) => {
  const res = await fetch('https://api.github.com/user', {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' },
  })
  return res.json()
})

ipcMain.handle('github:list-repos', async (_e, token: string) => {
  const res = await fetch('https://api.github.com/user/repos?sort=updated&per_page=100&affiliation=owner', {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' },
  })
  return res.json()
})

ipcMain.handle('github:create-repo', async (_e, token: string, name: string, isPrivate: boolean, description: string, autoInit = true) => {
  const res = await fetch('https://api.github.com/user/repos', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name, private: isPrivate, description, auto_init: autoInit }),
  })
  return await res.json()
})

ipcMain.handle('git:publish', async (_e, repoPath: string, remoteUrl: string) => {
  const git = simpleGit(repoPath)
  const token = getAuthToken()
  const authUrl = injectToken(remoteUrl, token)
  const { name, email } = loadProfile()

  try {
    // 1. Ensure .gitignore excludes large/generated dirs
    const gitignorePath = path.join(repoPath, '.gitignore')
    const ignoreEntries = ['node_modules', 'dist', 'dist-electron', 'release', '*.log']
    let existingIgnore = ''
    try { existingIgnore = fs.readFileSync(gitignorePath, 'utf-8') } catch { /* no gitignore yet */ }
    const toAdd = ignoreEntries.filter(e => !existingIgnore.includes(e))
    if (toAdd.length > 0) {
      fs.writeFileSync(gitignorePath, existingIgnore + (existingIgnore.endsWith('\n') ? '' : '\n') + toAdd.join('\n') + '\n')
    }

    // 2. Set git identity
    if (name) await git.addConfig('user.name', name)
    if (email) await git.addConfig('user.email', email)

    // 3. Check for existing commits
    let hasCommits = true
    try { await git.log() } catch { hasCommits = false }

    if (!hasCommits) {
      // Fresh repo — just add everything (gitignore already excludes large files)
      await git.add('.')
      await git.commit('Initial commit')
    } else {
      // Existing commits — untrack any large dirs that snuck in
      const largeDirs = ['release', 'dist-electron']
      for (const dir of largeDirs) {
        if (fs.existsSync(path.join(repoPath, dir))) {
          try { await git.raw(['rm', '-r', '--cached', '--ignore-unmatch', dir]) } catch { /* ignore */ }
        }
      }
      // If untracking created staged changes, amend the last commit
      const staged = await git.diff(['--cached', '--name-only'])
      if (staged.trim()) {
        await git.raw(['commit', '--amend', '--no-edit'])
      }
    }

    // 4. Get current branch
    const status = await git.status()
    const branch = status.current ?? 'main'

    // 5. Add/update origin and push
    const remotes = await git.getRemotes()
    if (remotes.find(r => r.name === 'origin')) {
      await git.remote(['set-url', 'origin', remoteUrl])
    } else {
      await git.addRemote('origin', remoteUrl)
    }

    await git.remote(['set-url', 'origin', authUrl])
    try {
      await git.push(['-u', 'origin', branch])
    } finally {
      await git.remote(['set-url', 'origin', remoteUrl])
    }

    return { success: true }
  } catch (e) {
    try { await git.remote(['set-url', 'origin', remoteUrl]) } catch { /* ignore */ }
    return { success: false, error: String(e) }
  }
})

// ─── Profile persistence ───────────────────────────────────────────────────────

interface Profile {
  name: string
  email: string
  token: string
  githubToken: string
  githubLogin: string
  githubAvatar: string
}

function profilePath(): string {
  return path.join(app.getPath('userData'), 'profile.json')
}

function loadProfile(): Profile {
  const defaults: Profile = { name: '', email: '', token: '', githubToken: '', githubLogin: '', githubAvatar: '' }
  try {
    return { ...defaults, ...JSON.parse(fs.readFileSync(profilePath(), 'utf-8')) as Partial<Profile> }
  } catch {
    return defaults
  }
}

function getAuthToken(): string {
  const { githubToken, token } = loadProfile()
  return githubToken || token
}

function injectToken(url: string, token: string): string {
  if (!token || !url.startsWith('https://')) return url
  return url.replace('https://', `https://oauth2:${token}@`)
}

ipcMain.handle('profile:get', () => loadProfile())

ipcMain.handle('profile:save', (_e, profile: Profile) => {
  try {
    fs.mkdirSync(path.dirname(profilePath()), { recursive: true })
    fs.writeFileSync(profilePath(), JSON.stringify(profile, null, 2))
    return { success: true }
  } catch (e) {
    return { success: false, error: String(e) }
  }
})

// ─── Repo persistence ──────────────────────────────────────────────────────────

function reposPath(): string {
  return path.join(app.getPath('userData'), 'repositories.json')
}

function loadRepos(): string[] {
  try {
    return JSON.parse(fs.readFileSync(reposPath(), 'utf-8')) as string[]
  } catch {
    return []
  }
}

function saveRepos(repos: string[]): void {
  try {
    fs.mkdirSync(path.dirname(reposPath()), { recursive: true })
    fs.writeFileSync(reposPath(), JSON.stringify(repos, null, 2))
  } catch (e) {
    console.error('Failed to save repos:', e)
  }
}

// ─── Window ────────────────────────────────────────────────────────────────────

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#0d1117',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  if (process.env['VITE_DEV_SERVER_URL']) {
    void mainWindow.loadURL(process.env['VITE_DEV_SERVER_URL'])
    mainWindow.webContents.openDevTools()
  } else {
    void mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.on('closed', () => { mainWindow = null })
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null)
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// ─── IPC: Dialogs ─────────────────────────────────────────────────────────────

ipcMain.handle('dialog:open-directory', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openDirectory'],
    title: 'Open Git Repository',
  })
  if (canceled || !filePaths.length) return null

  const repoPath = filePaths[0]!
  try {
    const isRepo = await simpleGit(repoPath).checkIsRepo()
    if (!isRepo) return { notARepo: true, path: repoPath }
  } catch {
    return { error: 'Failed to open repository' }
  }

  const repos = [repoPath, ...loadRepos().filter(r => r !== repoPath)].slice(0, 20)
  saveRepos(repos)
  return repoPath
})

ipcMain.handle('dialog:pick-directory', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openDirectory'],
    title: 'Choose destination folder',
  })
  return canceled || !filePaths.length ? null : filePaths[0]!
})

// ─── IPC: Repos ───────────────────────────────────────────────────────────────

ipcMain.handle('git:get-repositories', () => loadRepos())

ipcMain.handle('git:remove-repository', (_e, repoPath: string) => {
  const repos = loadRepos().filter(r => r !== repoPath)
  saveRepos(repos)
  return repos
})

// ─── IPC: Clone ───────────────────────────────────────────────────────────────

ipcMain.handle('git:clone', async (_e, url: string, parentDir: string, folderName: string) => {
  const targetPath = path.join(parentDir, folderName)
  try {
    const authUrl = injectToken(url, getAuthToken())
    const git = simpleGit({
      progress({ method, stage, progress }) {
        mainWindow?.webContents.send('git:clone-progress', { method, stage, progress })
      },
    })
    await git.clone(authUrl, targetPath)
    const repos = [targetPath, ...loadRepos().filter(r => r !== targetPath)].slice(0, 20)
    saveRepos(repos)
    return { success: true, path: targetPath }
  } catch (e) {
    return { success: false, error: String(e) }
  }
})

// ─── IPC: Branches ────────────────────────────────────────────────────────────

ipcMain.handle('git:get-branches', async (_e, repoPath: string) => {
  const result = await simpleGit(repoPath).branch(['-a', '--sort=-committerdate'])
  return Object.values(result.branches).map(b => ({
    name: b.name,
    current: b.current,
    remote: b.name.startsWith('remotes/'),
    commit: b.commit,
  }))
})

ipcMain.handle('git:checkout-branch', async (_e, repoPath: string, branchName: string) => {
  try {
    const localName = branchName.replace(/^remotes\/[^/]+\//, '')
    await simpleGit(repoPath).checkout(localName)
    return { success: true }
  } catch (e) {
    return { success: false, error: String(e) }
  }
})

ipcMain.handle('git:create-branch', async (_e, repoPath: string, branchName: string) => {
  try {
    await simpleGit(repoPath).checkoutLocalBranch(branchName)
    return { success: true }
  } catch (e) {
    return { success: false, error: String(e) }
  }
})

// ─── IPC: Commits ─────────────────────────────────────────────────────────────

ipcMain.handle('git:get-commits', async (_e, repoPath: string, branch?: string) => {
  try {
    const args: string[] = ['--max-count=200', '--date=iso-strict']
    if (branch) args.push(branch)
    const log = await simpleGit(repoPath).log(args)
    return log.all.map(c => ({
      hash: c.hash,
      shortHash: c.hash.substring(0, 7),
      message: c.message,
      body: c.body,
      author_name: c.author_name,
      author_email: c.author_email,
      date: c.date,
    }))
  } catch {
    return []
  }
})

ipcMain.handle('git:get-commit-files', async (_e, repoPath: string, hash: string) => {
  const raw = await simpleGit(repoPath).raw([
    'diff-tree', '--no-commit-id', '-r', '--name-status', hash,
  ])
  const statusMap: Record<string, string> = {
    A: 'added', M: 'modified', D: 'deleted', R: 'renamed', C: 'copied', T: 'modified',
  }
  return raw.trim().split('\n').filter(Boolean).map(line => {
    const parts = line.split('\t')
    const code = parts[0]?.[0] ?? 'M'
    return { file: parts[parts.length - 1] ?? '', status: statusMap[code] ?? 'modified' }
  })
})

ipcMain.handle('git:get-diff', async (_e, repoPath: string, hash: string, file: string) => {
  try {
    return await simpleGit(repoPath).raw(['show', hash, '--', file, '-p', '--unified=4'])
  } catch {
    return ''
  }
})

// ─── IPC: Remote operations ───────────────────────────────────────────────────

ipcMain.handle('git:init', async (_e, repoPath: string) => {
  try {
    await simpleGit(repoPath).init()
    const repos = [repoPath, ...loadRepos().filter(r => r !== repoPath)].slice(0, 20)
    saveRepos(repos)
    return { success: true }
  } catch (e) {
    return { success: false, error: String(e) }
  }
})

ipcMain.handle('git:get-working-diff', async (_e, repoPath: string, filePath: string, isUntracked: boolean, isStaged: boolean) => {
  try {
    const git = simpleGit(repoPath)
    if (isUntracked) {
      const content = fs.readFileSync(path.join(repoPath, filePath), 'utf-8')
      return content.split('\n').map(l => `+${l}`).join('\n')
    }
    if (isStaged) {
      return await git.diff(['--cached', '--', filePath])
    }
    return await git.diff(['HEAD', '--', filePath])
  } catch {
    return ''
  }
})

ipcMain.handle('git:get-status', async (_e, repoPath: string) => {
  try {
    const result = await simpleGit(repoPath).status()
    return result.files.map(f => ({ path: f.path, index: f.index, working_dir: f.working_dir }))
  } catch {
    return []
  }
})

ipcMain.handle('git:stage-file', async (_e, repoPath: string, filePath: string) => {
  try {
    await simpleGit(repoPath).add(filePath)
    return { success: true }
  } catch (e) {
    return { success: false, error: String(e) }
  }
})

ipcMain.handle('git:unstage-file', async (_e, repoPath: string, filePath: string) => {
  try {
    await simpleGit(repoPath).raw(['reset', 'HEAD', '--', filePath])
    return { success: true }
  } catch (e) {
    return { success: false, error: String(e) }
  }
})

ipcMain.handle('git:stage-all', async (_e, repoPath: string) => {
  try {
    await simpleGit(repoPath).add('.')
    return { success: true }
  } catch (e) {
    return { success: false, error: String(e) }
  }
})

ipcMain.handle('git:commit', async (_e, repoPath: string, message: string) => {
  try {
    const { name, email } = loadProfile()
    const git = simpleGit(repoPath)
    if (name) await git.addConfig('user.name', name)
    if (email) await git.addConfig('user.email', email)
    const result = await git.commit(message)
    return { success: true, hash: result.commit }
  } catch (e) {
    return { success: false, error: String(e) }
  }
})

ipcMain.handle('git:stash', async (_e, repoPath: string) => {
  try {
    await simpleGit(repoPath).stash(['push', '-u', '-m', 'git-desktop auto-stash'])
    return { success: true }
  } catch (e) {
    return { success: false, error: String(e) }
  }
})

ipcMain.handle('git:stash-pop', async (_e, repoPath: string) => {
  try {
    await simpleGit(repoPath).stash(['pop'])
    return { success: true }
  } catch (e) {
    return { success: false, error: String(e) }
  }
})

ipcMain.handle('git:fetch', async (_e, repoPath: string) => {
  try {
    const git = simpleGit(repoPath)
    const token = getAuthToken()
    if (token) {
      const remoteUrl = (await git.remote(['get-url', 'origin']))?.trim()
      if (remoteUrl) {
        await git.raw(['fetch', injectToken(remoteUrl, token), '--prune'])
        return { success: true }
      }
    }
    await git.fetch(['--all', '--prune'])
    return { success: true }
  } catch (e) {
    return { success: false, error: String(e) }
  }
})

ipcMain.handle('git:push', async (_e, repoPath: string) => {
  try {
    const git = simpleGit(repoPath)
    const token = getAuthToken()
    if (token) {
      const remoteUrl = (await git.remote(['get-url', 'origin']))?.trim()
      if (remoteUrl) {
        const status = await git.status()
        const branch = status.current ?? 'main'
        await git.raw(['push', injectToken(remoteUrl, token), branch])
        return { success: true }
      }
    }
    await git.push()
    return { success: true }
  } catch (e) {
    return { success: false, error: String(e) }
  }
})

ipcMain.handle('git:pull', async (_e, repoPath: string) => {
  try {
    const git = simpleGit(repoPath)
    const token = getAuthToken()
    if (token) {
      const remoteUrl = (await git.remote(['get-url', 'origin']))?.trim()
      if (remoteUrl) {
        const status = await git.status()
        const branch = status.current ?? 'main'
        await git.raw(['pull', injectToken(remoteUrl, token), branch])
        return { success: true }
      }
    }
    await git.pull()
    return { success: true }
  } catch (e) {
    return { success: false, error: String(e) }
  }
})
function buildFileTree(rootPath: string, currentPath = ''): any[] {
  const fullPath = path.join(rootPath, currentPath)
  const entries = fs.readdirSync(fullPath, { withFileTypes: true })

  return entries
    .filter(entry => !['.git', 'node_modules', 'dist', 'dist-electron'].includes(entry.name))
    .map(entry => {
      const relativePath = path.join(currentPath, entry.name)

      if (entry.isDirectory()) {
        return {
          name: entry.name,
          path: relativePath,
          type: 'directory',
          children: buildFileTree(rootPath, relativePath),
        }
      }

      return {
        name: entry.name,
        path: relativePath,
        type: 'file',
      }
    })
    .sort((a, b) => {
      if (a.type !== b.type) return a.type === 'directory' ? -1 : 1
      return a.name.localeCompare(b.name)
    })
}

ipcMain.handle('fs:get-tree', async (_e, repoPath: string) => {
  try {
    return buildFileTree(repoPath)
  } catch (e) {
    return { error: String(e) }
  }
})

ipcMain.handle('fs:read-file', async (_e, repoPath: string, relativeFilePath: string) => {
  try {
    const fullPath = path.join(repoPath, relativeFilePath)
    const content = fs.readFileSync(fullPath, 'utf-8')
    return { path: relativeFilePath, content }
  } catch (e) {
    return { error: String(e) }
  }
})

ipcMain.handle('fs:write-file', async (_e, repoPath: string, relativeFilePath: string, content: string) => {
  try {
    const fullPath = path.join(repoPath, relativeFilePath)
    fs.writeFileSync(fullPath, content, 'utf-8')
    return { success: true }
  } catch (e) {
    return { success: false, error: String(e) }
  }
})