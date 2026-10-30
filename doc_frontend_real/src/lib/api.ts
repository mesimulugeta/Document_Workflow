import { keycloak } from "@/auth/keycloak"
import type { AuditEntry, DocumentDto, DocumentStatus, FileDto, PageDto, WorkflowAction } from "@/types"

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8081"

export class ApiError extends Error {
  status: number
  code: string
  fieldErrors?: Record<string, string>

  constructor(status: number, code: string, message: string, fieldErrors?: Record<string, string>) {
    super(message)
    this.status = status
    this.code = code
    this.fieldErrors = fieldErrors
  }
}

async function authorizedFetch(path: string, init: RequestInit = {}): Promise<Response> {
  // Refresh the access token if it expires within 30 seconds; otherwise send the user back to login.
  await keycloak.updateToken(30).catch(() => keycloak.login())

  const headers = new Headers(init.headers)
  headers.set("Authorization", `Bearer ${keycloak.token}`)
  // JSON bodies are strings; for FormData the browser sets the multipart boundary itself.
  if (typeof init.body === "string") headers.set("Content-Type", "application/json")

  return fetch(`${BASE_URL}${path}`, { ...init, headers })
}

async function toApiError(res: Response): Promise<ApiError> {
  let body: { code?: string; detail?: string; errors?: Record<string, string> } | null = null
  try {
    body = await res.json()
  } catch {
    /* the error response had no JSON body */
  }
  return new ApiError(res.status, body?.code ?? "UNKNOWN", body?.detail ?? res.statusText, body?.errors)
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await authorizedFetch(path, init)
  if (!res.ok) throw await toApiError(res)
  return (res.status === 204 ? undefined : await res.json()) as T
}

const post = <T>(path: string, body: unknown = {}) =>
  request<T>(path, { method: "POST", body: JSON.stringify(body) })

const ACTION_PATHS: Record<WorkflowAction, string> = {
  SUBMIT: "submit",
  START_REVIEW: "start-review",
  APPROVE: "approve",
  REJECT: "reject",
  REQUEST_CHANGES: "request-changes",
  RESUBMIT: "resubmit",
  WITHDRAW: "withdraw",
}

export const api = {
  listDocuments: (page = 0, size = 10, status?: DocumentStatus) => {
    const params = new URLSearchParams({ page: String(page), size: String(size) })
    if (status) params.set("status", status)
    return request<PageDto<DocumentDto>>(`/api/documents?${params}`)
  },
  getDocument: (id: number) => request<DocumentDto>(`/api/documents/${id}`),
  createDocument: (data: { title: string; description?: string }) => post<DocumentDto>("/api/documents", data),
  updateDocument: (id: number, data: { title: string; description?: string }) =>
    request<DocumentDto>(`/api/documents/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  history: (id: number) => request<AuditEntry[]>(`/api/documents/${id}/history`),
  perform: (id: number, action: WorkflowAction, comment?: string) =>
    post<DocumentDto>(`/api/documents/${id}/${ACTION_PATHS[action]}`, comment ? { comment } : {}),

  listFiles: (docId: number) => request<FileDto[]>(`/api/documents/${docId}/files`),
  uploadFile: (docId: number, file: File) => {
    const form = new FormData()
    form.append("file", file)
    return request<FileDto>(`/api/documents/${docId}/files`, { method: "POST", body: form })
  },
  deleteFile: (docId: number, fileId: number) =>
    request<void>(`/api/documents/${docId}/files/${fileId}`, { method: "DELETE" }),
  // The browser cannot send an Authorization header with a plain link, so fetch the bytes and save them.
  downloadFile: async (docId: number, file: FileDto) => {
    const res = await authorizedFetch(`/api/documents/${docId}/files/${file.id}`)
    if (!res.ok) throw await toApiError(res)
    const url = URL.createObjectURL(await res.blob())
    const link = document.createElement("a")
    link.href = url
    link.download = file.filename
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  },
}