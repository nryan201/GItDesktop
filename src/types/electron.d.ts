import type { Branch, Commit, ChangedFile, FileTreeNode, FileContentResult, GitHubRepo } from './git'

export interface CloneProgress {
  method: string
  stage: string
  progress: number
}

declare global {
  interface Window {
    gitAPI: {
      openRepository: () => Promise<string | { error: string } | { notARepo: true; path: string } | null>
      getRepositories: () => Promise<string[]>
      removeRepository: (repoPath: string) => Promise<string[]>
      initRepository: (repoPath: string) => Promise<{ success: boolean; error?: string }>

      pickDirectory: () => Promise<string | null>
      cloneRepository: (url: string, parentDir: string, folderName: string) => Promise<{ success: boolean; path?: string; error?: string }>
      onCloneProgress: (callback: (data: CloneProgress) => void) => () => void

      getBranches: (repoPath: string) => Promise<Branch[]>
      checkoutBranch: (repoPath: string, branchName: string) => Promise<{ success: boolean; error?: string }>
      createBranch: (repoPath: string, branchName: string) => Promise<{ success: boolean; error?: string }>

      getCommits: (repoPath: string, branch?: string) => Promise<Commit[]>
      getCommitFiles: (repoPath: string, hash: string) => Promise<ChangedFile[]>
      getDiff: (repoPath: string, hash: string, file: string) => Promise<string>

      getWorkingDiff: (repoPath: string, filePath: string, isUntracked: boolean, isStaged: boolean) => Promise<string>
      getStatus: (repoPath: string) => Promise<GitStatusFile[]>
      stageFile: (repoPath: string, filePath: string) => Promise<{ success: boolean; error?: string }>
      unstageFile: (repoPath: string, filePath: string) => Promise<{ success: boolean; error?: string }>
      stageAll: (repoPath: string) => Promise<{ success: boolean; error?: string }>
      commitChanges: (repoPath: string, message: string) => Promise<{ success: boolean; hash?: string; error?: string }>

      fetch: (repoPath: string) => Promise<{ success: boolean; error?: string }>
      push: (repoPath: string) => Promise<{ success: boolean; error?: string }>
      pull: (repoPath: string) => Promise<{ success: boolean; error?: string }>
      stash: (repoPath: string) => Promise<{ success: boolean; error?: string }>
      stashPop: (repoPath: string) => Promise<{ success: boolean; error?: string }>

      // File system
      getFileTree: (repoPath: string) => Promise<FileTreeNode[] | { error: string }>
      readFile: (repoPath: string, relativeFilePath: string) => Promise<FileContentResult | { error: string }>
      writeFile: (repoPath: string, relativeFilePath: string, content: string) => Promise<{ success: boolean; error?: string }>

      // Profile
      getProfile: () => Promise<{ name: string; email: string; token: string; githubToken: string; githubLogin: string; githubAvatar: string }>
      saveProfile: (profile: { name: string; email: string; token: string; githubToken: string; githubLogin: string; githubAvatar: string }) => Promise<{ success: boolean; error?: string }>

      // GitHub OAuth
      openExternal: (url: string) => Promise<void>
      githubDeviceAuthStart: () => Promise<{ device_code: string; user_code: string; verification_uri: string; interval: number; expires_in: number; error?: string }>
      githubDeviceAuthPoll: (deviceCode: string) => Promise<{ access_token?: string; error?: string }>
      githubGetUser: (token: string) => Promise<{ id: number; login: string; name: string; email: string | null; avatar_url: string }>
      githubListRepos: (token: string) => Promise<GitHubRepo[]>
      githubCreateRepo: (token: string, name: string, isPrivate: boolean, description: string, autoInit?: boolean) => Promise<GitHubRepo & { message?: string }>
      publishToGitHub: (repoPath: string, remoteUrl: string) => Promise<{ success: boolean; error?: string }>
    }
  }
}
