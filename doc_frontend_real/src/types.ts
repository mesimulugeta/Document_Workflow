export type DocumentStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "CHANGES_REQUESTED"
  | "APPROVED"
  | "REJECTED"
  | "WITHDRAWN"

export type WorkflowAction =
  | "SUBMIT"
  | "START_REVIEW"
  | "APPROVE"
  | "REJECT"
  | "REQUEST_CHANGES"
  | "RESUBMIT"
  | "WITHDRAW"

export interface DocumentDto {
  id: number
  title: string
  description: string | null
  status: DocumentStatus
  ownerId: number
  ownerName: string
  createdAt: string
  updatedAt: string
  version: number
  editable: boolean
  allowedActions: WorkflowAction[]
}

export interface PageDto<T> {
  content: T[]
  page: { size: number; number: number; totalElements: number; totalPages: number }
}

export interface AuditEntry {
  id: number
  action: string
  fromStatus: DocumentStatus | null
  toStatus: DocumentStatus
  comment: string | null
  actorId: number
  actorName: string
  createdAt: string
}