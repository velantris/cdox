# API Route to Convex Function Migration Mapping

This document maps the existing Next.js API routes to their equivalent Convex functions.

## Documents Routes

### GET /api/documents
- **Convex Function**: `scans.getScans`
- **Type**: Query
- **Usage**: `useQuery(api.scans.getScans, { limit: 50 })`

### GET /api/documents/[id]
- **Convex Function**: `scans.getScanWithAnalysisAndIssues`
- **Type**: Query
- **Usage**: `useQuery(api.scans.getScanWithAnalysisAndIssues, { id: scanId })`

### PATCH /api/documents/[id] (for issue status updates)
- **Convex Function**: `issues.updateIssue`
- **Type**: Mutation
- **Usage**: `useMutation(api.issues.updateIssue)`

## Analysis Routes

### POST /api/analyze
- **Convex Function**: `analysis_action.performDocumentAnalysis`
- **Type**: Action
- **Usage**: `useAction(api.analysis_action.performDocumentAnalysis)`

## Issues Routes

### GET /api/issues?analysis_id=...
- **Convex Function**: `issues.getIssuesByAnalysis`
- **Type**: Query
- **Usage**: `useQuery(api.issues.getIssuesByAnalysis, { analysisId })`

### POST /api/issues
- **Convex Function**: `issues.createIssue`
- **Type**: Mutation
- **Usage**: `useMutation(api.issues.createIssue)`

### GET /api/issues/[id]
- **Convex Function**: `issues.getIssue`
- **Type**: Query
- **Usage**: `useQuery(api.issues.getIssue, { id: issueId })`

### PATCH /api/issues/[id]
- **Convex Function**: `issues.updateIssue`
- **Type**: Mutation
- **Usage**: `useMutation(api.issues.updateIssue)`

### DELETE /api/issues/[id]
- **Convex Function**: `issues.deleteIssue`
- **Type**: Mutation
- **Usage**: `useMutation(api.issues.deleteIssue)`

## Migration Notes

1. All functions maintain the same data structure and validation as the original API routes
2. Error handling follows Convex patterns (throwing errors instead of returning HTTP status codes)
3. Authentication has been removed as per the migration requirements
4. Real-time capabilities are now available through Convex subscriptions