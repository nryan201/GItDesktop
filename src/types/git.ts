export interface Branch {
  name: string
  current: boolean
  remote: boolean
  commit: string
}

export interface Commit {
  hash: string
  shortHash: string
  message: string
  body: string
  author_name: string
  author_email: string
  date: string
}

export type FileStatus = 'added' | 'modified' | 'deleted' | 'renamed' | 'copied'

export interface ChangedFile {
  file: string
  status: FileStatus
}

export type NotificationType = 'success' | 'error' | 'info'

export interface Notification {
  type: NotificationType
  message: string
}
export interface FileTreeNode {
  name: string
  path: string
  type: 'file' | 'directory'
  children?: FileTreeNode[]
}

export interface FileContentResult {
  path: string
  content: string
}

export interface GitStatusFile {
  path: string
  index: string
  working_dir: string
}

export interface GitHubRepo {
  id: number
  name: string
  full_name: string
  description: string | null
  private: boolean
  clone_url: string
  html_url: string
  stargazers_count: number
  forks_count: number
  updated_at: string
  language: string | null
}