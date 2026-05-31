import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('gitAPI', {
  // Repos
  openRepository: () => ipcRenderer.invoke('dialog:open-directory'),
  getRepositories: () => ipcRenderer.invoke('git:get-repositories'),
  removeRepository: (repoPath: string) => ipcRenderer.invoke('git:remove-repository', repoPath),
  initRepository: (repoPath: string) => ipcRenderer.invoke('git:init', repoPath),

  // Clone
  pickDirectory: () => ipcRenderer.invoke('dialog:pick-directory'),
  cloneRepository: (url: string, parentDir: string, folderName: string) =>
    ipcRenderer.invoke('git:clone', url, parentDir, folderName),
  onCloneProgress: (callback: (data: { method: string; stage: string; progress: number }) => void) => {
    const handler = (_: Electron.IpcRendererEvent, data: { method: string; stage: string; progress: number }) =>
      callback(data)
    ipcRenderer.on('git:clone-progress', handler)
    return () => ipcRenderer.removeListener('git:clone-progress', handler)
  },

  // Branches
  getBranches: (repoPath: string) => ipcRenderer.invoke('git:get-branches', repoPath),
  checkoutBranch: (repoPath: string, branchName: string) =>
    ipcRenderer.invoke('git:checkout-branch', repoPath, branchName),
  createBranch: (repoPath: string, branchName: string) =>
    ipcRenderer.invoke('git:create-branch', repoPath, branchName),

  // Commits
  getCommits: (repoPath: string, branch?: string) =>
    ipcRenderer.invoke('git:get-commits', repoPath, branch),
  getCommitFiles: (repoPath: string, hash: string) =>
    ipcRenderer.invoke('git:get-commit-files', repoPath, hash),
  getDiff: (repoPath: string, hash: string, file: string) =>
    ipcRenderer.invoke('git:get-diff', repoPath, hash, file),

  // Remote
  fetch: (repoPath: string) => ipcRenderer.invoke('git:fetch', repoPath),
  push: (repoPath: string) => ipcRenderer.invoke('git:push', repoPath),

  // File system
  getFileTree: (repoPath: string) => ipcRenderer.invoke('fs:get-tree', repoPath),
  readFile: (repoPath: string, relativeFilePath: string) => ipcRenderer.invoke('fs:read-file', repoPath, relativeFilePath),

  // Profile
  getProfile: () => ipcRenderer.invoke('profile:get'),
  saveProfile: (profile: { name: string; email: string; token: string; githubToken: string; githubLogin: string; githubAvatar: string }) =>
    ipcRenderer.invoke('profile:save', profile),

  // GitHub OAuth
  openExternal: (url: string) => ipcRenderer.invoke('shell:open-external', url),
  githubDeviceAuthStart: () => ipcRenderer.invoke('github:device-auth-start'),
  githubDeviceAuthPoll: (deviceCode: string) => ipcRenderer.invoke('github:device-auth-poll', deviceCode),
  githubGetUser: (token: string) => ipcRenderer.invoke('github:get-user', token),
  githubListRepos: (token: string) => ipcRenderer.invoke('github:list-repos', token),
  githubCreateRepo: (token: string, name: string, isPrivate: boolean, description: string, autoInit?: boolean) =>
    ipcRenderer.invoke('github:create-repo', token, name, isPrivate, description, autoInit),
  publishToGitHub: (repoPath: string, remoteUrl: string) =>
    ipcRenderer.invoke('git:publish', repoPath, remoteUrl),
})
