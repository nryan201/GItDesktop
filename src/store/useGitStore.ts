import { create } from 'zustand'
import type {
  Branch,
  Commit,
  ChangedFile,
  Notification,
  FileTreeNode,
  GitStatusFile,
} from '../types/git'

interface GitState {
  repositories: string[]
  currentRepo: string | null
  branches: Branch[]
  currentBranch: string | null
  commits: Commit[]
  selectedCommit: Commit | null
  changedFiles: ChangedFile[]
  selectedFile: string | null
  diff: string
  isLoading: boolean
  notification: Notification | null
  fileTree: FileTreeNode[]
  selectedExplorerFile: string | null
  fileContent: string
  pendingInitRepo: string | null
  gitStatus: GitStatusFile[]
  selectedStatusFile: GitStatusFile | null
  workingDiff: string

  init: () => Promise<void>
  refreshStatus: () => Promise<void>
  selectStatusFile: (f: GitStatusFile) => Promise<void>
  stageFile: (filePath: string) => Promise<void>
  unstageFile: (filePath: string) => Promise<void>
  stageAll: () => Promise<void>
  commitChanges: (message: string) => Promise<void>
  openRepository: () => Promise<void>
  initRepository: (repoPath: string) => Promise<void>
  cancelInitRepo: () => void
  selectRepository: (repoPath: string) => Promise<void>
  removeRepository: (repoPath: string) => Promise<void>
  selectBranch: (branchName: string) => Promise<void>
  selectCommit: (commit: Commit) => Promise<void>
  selectFile: (file: string) => Promise<void>
  fetch: () => Promise<void>
  push: () => Promise<void>
  createBranch: (name: string) => Promise<void>
  loadFileTree: () => Promise<void>
  selectExplorerFile: (filePath: string) => Promise<void>
  clearNotification: () => void
}

export const useGitStore = create<GitState>()((set, get) => ({
  repositories: [],
  currentRepo: null,
  branches: [],
  currentBranch: null,
  commits: [],
  selectedCommit: null,
  changedFiles: [],
  selectedFile: null,
  diff: '',
  isLoading: false,
  notification: null,
  fileTree: [],
  selectedExplorerFile: null,
  fileContent: '',
  pendingInitRepo: null,
  gitStatus: [],
  selectedStatusFile: null,
  workingDiff: '',

  clearNotification: () => set({ notification: null }),
  cancelInitRepo: () => set({ pendingInitRepo: null }),

  selectStatusFile: async (f: GitStatusFile) => {
    const { currentRepo } = get()
    if (!currentRepo) return
    const isUntracked = f.index === '?' && f.working_dir === '?'
    const isStaged = f.index !== ' ' && f.index !== '?'
    const diff = await window.gitAPI.getWorkingDiff(currentRepo, f.path, isUntracked, isStaged)
    set({ selectedStatusFile: f, workingDiff: diff, selectedExplorerFile: null })
  },

  refreshStatus: async () => {
    const { currentRepo } = get()
    if (!currentRepo) return
    const status = await window.gitAPI.getStatus(currentRepo)
    set({ gitStatus: status })
  },

  stageFile: async (filePath: string) => {
    const { currentRepo, refreshStatus } = get()
    if (!currentRepo) return
    await window.gitAPI.stageFile(currentRepo, filePath)
    await refreshStatus()
  },

  unstageFile: async (filePath: string) => {
    const { currentRepo, refreshStatus } = get()
    if (!currentRepo) return
    await window.gitAPI.unstageFile(currentRepo, filePath)
    await refreshStatus()
  },

  stageAll: async () => {
    const { currentRepo, refreshStatus } = get()
    if (!currentRepo) return
    await window.gitAPI.stageAll(currentRepo)
    await refreshStatus()
  },

  commitChanges: async (message: string) => {
    const { currentRepo } = get()
    if (!currentRepo) return
    const result = await window.gitAPI.commitChanges(currentRepo, message)
    if (result.success) {
      const commits = await window.gitAPI.getCommits(currentRepo, get().currentBranch ?? undefined)
      set({ commits, gitStatus: [], notification: { type: 'success', message: 'Commit created' } })
    } else {
      set({ notification: { type: 'error', message: result.error ?? 'Commit failed' } })
    }
  },

  init: async () => {
    const repositories = await window.gitAPI.getRepositories()
    set({ repositories })
    if (repositories.length > 0) {
      await get().selectRepository(repositories[0]!)
    }
  },

  openRepository: async () => {
    const result = await window.gitAPI.openRepository()
    if (!result || typeof result !== 'string') {
      if (result && typeof result === 'object' && 'notARepo' in result) {
        set({ pendingInitRepo: result.path })
        return
      }
      if (result && typeof result === 'object' && 'error' in result) {
        set({ notification: { type: 'error', message: result.error } })
      }
      return
    }

    const repositories = await window.gitAPI.getRepositories()
    set({ repositories })
    await get().selectRepository(result)
  },

  initRepository: async (repoPath: string) => {
    set({ pendingInitRepo: null, isLoading: true })
    const result = await window.gitAPI.initRepository(repoPath)
    if (result.success) {
      const repositories = await window.gitAPI.getRepositories()
      set({ repositories, notification: { type: 'success', message: 'Repository initialized' } })
      await get().selectRepository(repoPath)
    } else {
      set({ notification: { type: 'error', message: result.error ?? 'Init failed' } })
    }
    set({ isLoading: false })
  },

  selectRepository: async (repoPath: string) => {
    set({
      isLoading: true,
      currentRepo: repoPath,
      selectedCommit: null,
      changedFiles: [],
      diff: '',
      selectedFile: null,
      fileTree: [],
      selectedExplorerFile: null,
      fileContent: '',
    })

    try {
      const branches = await window.gitAPI.getBranches(repoPath)
      const currentBranch = branches.find(b => b.current)?.name ?? null
      set({ branches, currentBranch })

      const commits = await window.gitAPI.getCommits(
        repoPath,
        currentBranch ?? undefined
      )
      set({ commits })
    } catch {
      set({ branches: [], currentBranch: null, commits: [] })
    }

    try {
      await get().loadFileTree()
      await get().refreshStatus()
    } catch {
      // file tree optional
    } finally {
      set({ isLoading: false })
    }
  },

  removeRepository: async (repoPath: string) => {
    const repositories = await window.gitAPI.removeRepository(repoPath)

    if (get().currentRepo === repoPath) {
      set({
        repositories,
        currentRepo: null,
        branches: [],
        currentBranch: null,
        commits: [],
        selectedCommit: null,
        changedFiles: [],
        diff: '',
        selectedFile: null,
        fileTree: [],
        selectedExplorerFile: null,
        fileContent: '',
      })

      if (repositories.length > 0) {
        await get().selectRepository(repositories[0]!)
      }
    } else {
      set({ repositories })
    }
  },

  selectBranch: async (branchName: string) => {
    const { currentRepo } = get()
    if (!currentRepo) return

    set({ isLoading: true })

    try {
      const result = await window.gitAPI.checkoutBranch(currentRepo, branchName)
      if (!result.success) {
        set({
          notification: {
            type: 'error',
            message: result.error ?? 'Checkout failed',
          },
        })
        return
      }

      const branches = await window.gitAPI.getBranches(currentRepo)
      const currentBranch = branches.find(b => b.current)?.name ?? branchName
      const commits = await window.gitAPI.getCommits(currentRepo, currentBranch)

      set({
        branches,
        currentBranch,
        commits,
        selectedCommit: null,
        changedFiles: [],
        diff: '',
        selectedFile: null,
      })

      await get().loadFileTree()
    } catch (e) {
      set({
        notification: {
          type: 'error',
          message: `Branch switch failed: ${String(e)}`,
        },
      })
    } finally {
      set({ isLoading: false })
    }
  },

  selectCommit: async (commit: Commit) => {
    const { currentRepo } = get()
    if (!currentRepo) return

    set({
      selectedCommit: commit,
      selectedFile: null,
      diff: '',
      isLoading: true,
    })

    try {
      const changedFiles = await window.gitAPI.getCommitFiles(
        currentRepo,
        commit.hash
      )
      set({ changedFiles })

      if (changedFiles.length > 0) {
        await get().selectFile(changedFiles[0]!.file)
        return
      }
    } catch (e) {
      set({
        notification: {
          type: 'error',
          message: `Failed to load commit: ${String(e)}`,
        },
      })
    }

    set({ isLoading: false })
  },

  selectFile: async (file: string) => {
    const { currentRepo, selectedCommit } = get()
    if (!currentRepo || !selectedCommit) return

    set({ selectedFile: file, isLoading: true })

    try {
      const diff = await window.gitAPI.getDiff(
        currentRepo,
        selectedCommit.hash,
        file
      )
      set({ diff })
    } catch (e) {
      set({
        notification: {
          type: 'error',
          message: `Failed to load diff: ${String(e)}`,
        },
      })
    } finally {
      set({ isLoading: false })
    }
  },

  fetch: async () => {
    const { currentRepo } = get()
    if (!currentRepo) return

    set({
      isLoading: true,
      notification: { type: 'info', message: 'Fetching from remote…' },
    })

    try {
      const result = await window.gitAPI.fetch(currentRepo)
      if (result.success) {
        const branches = await window.gitAPI.getBranches(currentRepo)
        set({
          branches,
          notification: { type: 'success', message: 'Fetch complete' },
        })
      } else {
        set({
          notification: {
            type: 'error',
            message: result.error ?? 'Fetch failed',
          },
        })
      }
    } catch (e) {
      set({
        notification: {
          type: 'error',
          message: `Fetch failed: ${String(e)}`,
        },
      })
    } finally {
      set({ isLoading: false })
    }
  },

  push: async () => {
    const { currentRepo } = get()
    if (!currentRepo) return

    set({
      isLoading: true,
      notification: { type: 'info', message: 'Pushing to remote…' },
    })

    try {
      const result = await window.gitAPI.push(currentRepo)
      if (result.success) {
        set({ notification: { type: 'success', message: 'Push complete' } })
      } else {
        set({
          notification: {
            type: 'error',
            message: result.error ?? 'Push failed',
          },
        })
      }
    } catch (e) {
      set({
        notification: {
          type: 'error',
          message: `Push failed: ${String(e)}`,
        },
      })
    } finally {
      set({ isLoading: false })
    }
  },

  createBranch: async (name: string) => {
    const { currentRepo } = get()
    if (!currentRepo) return

    set({ isLoading: true })

    try {
      const result = await window.gitAPI.createBranch(currentRepo, name)
      if (result.success) {
        const branches = await window.gitAPI.getBranches(currentRepo)
        const currentBranch = branches.find(b => b.current)?.name ?? name
        const commits = await window.gitAPI.getCommits(currentRepo, currentBranch)

        set({
          branches,
          currentBranch,
          commits,
          selectedCommit: null,
          changedFiles: [],
          diff: '',
          selectedFile: null,
          notification: {
            type: 'success',
            message: `Branch "${name}" created`,
          },
        })

        await get().loadFileTree()
      } else {
        set({
          notification: {
            type: 'error',
            message: result.error ?? 'Create branch failed',
          },
        })
      }
    } catch (e) {
      set({
        notification: {
          type: 'error',
          message: `Create branch failed: ${String(e)}`,
        },
      })
    } finally {
      set({ isLoading: false })
    }
  },

  loadFileTree: async () => {
    const { currentRepo } = get()
    if (!currentRepo) return

    try {
      const result = await window.gitAPI.getFileTree(currentRepo)

      if (Array.isArray(result)) {
        set({ fileTree: result })
      } else {
        set({
          notification: { type: 'error', message: result.error },
        })
      }
    } catch (e) {
      set({
        notification: {
          type: 'error',
          message: `Failed to load file tree: ${String(e)}`,
        },
      })
    }
  },

  selectExplorerFile: async (filePath: string) => {
    const { currentRepo } = get()
    if (!currentRepo) return

    try {
      const result = await window.gitAPI.readFile(currentRepo, filePath)

      if ('content' in result) {
        set({
          selectedExplorerFile: filePath,
          fileContent: result.content,
          selectedStatusFile: null,
          workingDiff: '',
        })
      } else {
        set({
          notification: { type: 'error', message: result.error },
        })
      }
    } catch (e) {
      set({
        notification: {
          type: 'error',
          message: `Failed to read file: ${String(e)}`,
        },
      })
    }
  },
}))