import { keycloak } from "@/auth/keycloak"
import type { AuditEntry, DocumentDto, DocumentStatus, PageDto, WorkflowAction } from "@/types"

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

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  // Refresh the access token if it expires within 30 seconds; otherwise send the user back to login.
  await keycloak.updateToken(30).catch(() => keycloak.login())

  const headers = new Headers(init.headers)
  headers.set("Authorization", `Bearer ${keycloak.token}`)
  if (init.body) headers.set("Content-Type", "application/json")

  const res = await fetch(`${BASE_URL}${path}`, { ...init, headers })

  if (!res.ok) {
    let body: { code?: string; detail?: string; errors?: Record<string, string> } | null = null
    try {
      body = await res.json()
    } catch {
      /* the error response had no JSON body */
    }
    throw new ApiError(res.status, body?.code ?? "UNKNOWN", body?.detail ?? res.statusText, body?.errors)
  }
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
}