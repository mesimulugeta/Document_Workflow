import { Navigate, Route, Routes } from "react-router-dom"
import { useAuth } from "@/auth/AuthProvider"
import { AppLayout } from "@/components/AppLayout"
import { DocumentDetailPage } from "@/pages/DocumentDetailPage"
import { DocumentsPage } from "@/pages/DocumentsPage"
import { NewDocumentPage } from "@/pages/NewDocumentPage"
import { ReviewQueuePage } from "@/pages/ReviewQueuePage"

function ReviewRoute() {
  const { isReviewer } = useAuth()
  return isReviewer ? <ReviewQueuePage /> : <Navigate to="/documents" replace />
}

function NotFound() {
  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="mt-2 text-muted-foreground">That page does not exist.</p>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Navigate to="/documents" replace />} />
        <Route path="/documents" element={<DocumentsPage />} />
        <Route path="/documents/new" element={<NewDocumentPage />} />
        <Route path="/documents/:id" element={<DocumentDetailPage />} />
        <Route path="/review" element={<ReviewRoute />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}