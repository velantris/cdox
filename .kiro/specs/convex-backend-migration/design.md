# Design Document

## Overview

This design outlines the migration from a Next.js API + MongoDB backend to a Convex-based backend, with authentication removal as the primary focus. The new system will restructure data around three core entities: scans (uploaded documents), analysis (processing results), and issues (specific problems found). The migration will eliminate user management complexity while preserving all document processing capabilities.

## Architecture

### Current Architecture
- Next.js API routes handling HTTP requests
- MongoDB with Mongoose ODM for data persistence
- WorkOS AuthKit for authentication and user management
- Vercel Blob storage for file uploads
- AI SDK integration with OpenAI and Google models

### Target Architecture
- Convex backend with mutations, queries, and actions
- Convex database with built-in real-time capabilities
- No authentication layer
- Vercel Blob storage (unchanged)
- AI SDK integration (unchanged)
- Direct client-to-Convex communication

### Migration Strategy
1. **Phase 1: Authentication Removal**
   - Remove all WorkOS AuthKit dependencies
   - Remove auth middleware and protected routes
   - Remove user-related database fields and models
   - Update UI components to remove auth-dependent features

2. **Phase 2: Data Model Restructuring**
   - Migrate from Document → Analysis → Issue to Scan → Analysis → Issue
   - Establish proper foreign key relationships
   - Preserve existing analysis logic and AI integrations

3. **Phase 3: Convex Migration**
   - Replace Next.js API routes with Convex functions
   - Migrate database operations to Convex queries and mutations
   - Update client-side data fetching to use Convex hooks

## Components and Interfaces

### Data Models

#### Scan Model
```typescript
// Convex schema
scans: defineTable({
  name: v.string(),
  url: v.string(),
  language: v.string(),
  documentType: v.string(),
  documentType: v.string(),
  targetAudience: v.string(),
  jurisdiction: v.string(),
  regulations: v.string(),
  createdAt: v.number(),

})
```

#### Analysis Model
```typescript
// Convex schema
analysis: defineTable({
  scanId: v.id("scans"),
  
  summary: v.string(),
  recommendations: v.array(v.string()),
  score: v.number(),
  status: v.union(v.literal("pending"), v.literal("completed"), v.literal("failed")),
  providerRaw: v.object({
    openai: v.any(),
    gemini: v.any(),
  }),
  createdAt: v.number(),
})
```

#### Issue Model
```typescript
// Convex schema
issues: defineTable({
  analysisId: v.id("analysis"),
  status: v.string(),
  severity: v.string(),
  type: v.string(),
  status: v.string(),
  section: v.string(),
  originalText: v.string(),
  issueExplanation: v.string(),
  suggestedRewrite: v.string(),
  createdAt: v.number(),
})
```

### Convex Functions

#### Mutations
- `createScan(name, url, language, documentType)` - Create new scan record
- `createAnalysis(scanId, options)` - Initiate analysis process
- `updateAnalysisStatus(analysisId, status)` - Update analysis progress
- `createIssues(analysisId, issues[])` - Bulk create issues from analysis

#### Queries
- `getScans()` - Retrieve all scans
- `getScan(scanId)` - Get specific scan
- `getAnalysisByScan(scanId)` - Get analysis for a scan
- `getIssuesByAnalysis(analysisId)` - Get issues for an analysis
- `getRecentActivity()` - Dashboard data

#### Actions
- `performDocumentAnalysis(scanId, options)` - Long-running analysis process
- `uploadDocument(file, metadata)` - Handle file upload to Vercel Blob

### API Migration Mapping

| Current Next.js Route | Convex Function | Type |
|----------------------|-----------------|------|
| `POST /api/upload` | `uploadDocument` | Action |
| `GET /api/documents` | `getScans` | Query |
| `GET /api/documents/[id]` | `getScan` | Query |
| `POST /api/analyze` | `performDocumentAnalysis` | Action |
| `GET /api/issues` | `getIssuesByAnalysis` | Query |
| `GET /api/issues/[id]` | `getIssue` | Query |

## Data Models

### Relationship Structure
```
Scan (1) → Analysis (1..n) → Issues (0..n)
```

### Field Mappings

#### Document → Scan Migration
- `doc_id` → `_id` (Convex auto-generated)
- `title` → `name`
- `url` → `url` (unchanged)
- `options.type` → `documentType`
- `options.language` → `language`
- `userId` → **REMOVED**
- `options.target_audience` → moved to Analysis
- `options.jurisdiction` → moved to Analysis
- `options.compliance` → moved to Analysis as `regulations`

#### Analysis Model Changes
- Add `scanId` foreign key reference
- Remove optional `doc_id` field
- Restructure to be always linked to a scan
- Add `status` field for tracking processing state

#### Issue Model Changes
- `issue_id` → `_id` (Convex auto-generated)
- `analysis_id` → `analysisId` (proper foreign key)
- Field names remain consistent
- Add proper indexing for performance

## Error Handling

### Authentication Removal
- Remove all auth-related error responses (401, 403)
- Remove user validation checks
- Simplify error handling to focus on data validation and processing errors

### Convex Error Handling
- Use Convex's built-in error handling for mutations and queries
- Implement proper validation using Convex validators
- Handle long-running action failures gracefully
- Provide meaningful error messages for client consumption

### Data Migration Errors
- Validate data integrity during migration
- Handle missing or corrupted data gracefully
- Provide rollback mechanisms for failed migrations
- Log all migration issues for debugging

## Testing Strategy

### Unit Testing
- Test individual Convex functions in isolation
- Mock external dependencies (AI SDK, Vercel Blob)
- Validate data transformations and business logic
- Test error handling scenarios

### Integration Testing
- Test complete workflows (scan → analysis → issues)
- Verify data relationships and foreign key constraints
- Test file upload and processing pipelines
- Validate AI model integration

### Migration Testing
- Test data migration scripts with sample data
- Verify data integrity before and after migration
- Test rollback procedures
- Performance testing with realistic data volumes

### End-to-End Testing
- Test complete user workflows without authentication
- Verify UI components work with new Convex integration
- Test real-time updates and data synchronization
- Cross-browser compatibility testing

## Security Considerations

### Authentication Removal Impact
- Remove all user-based access controls
- Ensure no sensitive user data remains in the system
- Update privacy policies and data handling procedures
- Consider rate limiting for public endpoints

### Data Protection
- Maintain document confidentiality without user isolation
- Implement proper input validation and sanitization
- Secure file upload handling
- Protect against injection attacks in analysis processing

### API Security
- Implement rate limiting on Convex functions
- Validate all input parameters
- Sanitize file uploads and document content
- Monitor for abuse patterns

## Performance Considerations

### Convex Optimization
- Use appropriate indexes for common queries
- Optimize query patterns for real-time updates
- Implement pagination for large result sets
- Cache frequently accessed data

### File Processing
- Maintain existing document parsing optimizations
- Implement proper error handling for large files
- Consider file size limits and processing timeouts
- Optimize AI model usage and response handling

### Database Performance
- Design efficient query patterns for the new data structure
- Implement proper indexing strategy
- Monitor query performance and optimize as needed
- Plan for data growth and scaling requirements