# File Attachment System Implementation Summary

## Overview

Implemented comprehensive file attachment logic across all PeerSpace project entities using Cloudinary for cloud storage with a context/context_id-based ownership tracking system.

## File Management Infrastructure

### Core Components Created

1. **FileController** (`src/controllers/FileController.ts`)

   - `createFile()`: Save file metadata after Cloudinary upload
   - `getFilesByContext()`: List files for an entity (query params: context, context_id)
   - `getFileById()`: Get single file with signed URL generation for private files
   - `deleteFile()`: Remove from Cloudinary + database (auth: uploader or admin)
   - `deleteFilesByContext()`: Bulk cleanup for entity deletion

2. **fileRoutes** (`src/routes/fileRoutes.ts`)
   - POST `/api/files` - Create file record (authenticated)
   - GET `/api/files` - List by context (query: context, context_id)
   - GET `/api/files/:id` - Get single file with signed URL
   - DELETE `/api/files/:id` - Delete file (Cloudinary + DB)
   - POST `/api/files/bulk-delete` - Bulk delete by context
   - Full Swagger documentation included

## Entity-Level Integration

### 1. PostController (`src/controllers/PostController.ts`)

- **getPostById()**: Added file retrieval - returns files array with each post
- **deletePost()**: Cascading file deletion from Cloudinary + database

### 2. NoteController (`src/controllers/NoteController.ts`)

- **getNoteById()**: Added file retrieval - returns files array with note
- **deleteNote()**: Cascading file deletion on note removal

### 3. AssignmentController (`src/controllers/AssignmentController.ts`)

- **getAssignmentById()**: Added file retrieval - returns files array
- **deleteAssignment()**: Cascading file deletion including all submission files

### 4. SubmissionController (`src/controllers/SubmissionController.ts`)

- **getSubmissionById()**: Added file retrieval - returns files array with submission
- **deleteSubmission()**: Cascading file deletion from Cloudinary + database

### 5. CommunityController (`src/controllers/CommunityController.ts`)

- **deleteCommunity()**:
  - Deletes community banner file from Cloudinary + database
  - Cascades to delete all post files within community
  - Uses Prisma transaction for atomicity

### 6. UserController (`src/controllers/UserController.ts`)

- **updateUser()**:
  - Handles avatar file replacement
  - Deletes old avatar from Cloudinary when new one assigned
- **deleteUser()**:
  - Deletes user avatar from Cloudinary
  - Cleans up all user files

## File Ownership System

### Context Types

```typescript
enum FileContext {
  POST           // Post attachments
  SUBMISSION     // Assignment submission files
  NOTE           // Note attachments
  ASSIGNMENT     // Assignment description/resources
  COMMUNITY_BANNER  // Community banner image
  USER_AVATAR    // User profile avatar
}
```

### Context-Based Queries

All file operations use `(context, context_id)` pattern:

- Index: `@@index([context, context_id], name: "idx_file_context")`
- Enables efficient bulk operations (e.g., delete all post files)
- Type-safe enum validation

## Authorization & Security

1. **File Operations**

   - Only uploader or admin can delete files
   - Signed URLs generated for private files (1-hour expiry)
   - Cloudinary privacy flags honored

2. **Entity Operations**
   - User must have appropriate role (INSTRUCTOR, ADMIN)
   - Community membership verified
   - Ownership checks enforced

## Cloudinary Integration

### Features Used

- Direct client upload with signed requests
- Public + private file support
- Automatic resource type detection
- Folder structure: `peerspace/{context}/{context_id}`

### Deletion Strategy

- Two-phase deletion: Cloudinary first, then database
- Continues on Cloudinary failure (doesn't block DB cleanup)
- Transaction support for atomic operations

## Database Cascades

All entity deletions trigger:

1. File deletion from Cloudinary (via SDK)
2. File deletion from database (direct delete)
3. Deprecated attachment table cleanup (AssignmentFileAttachment, NoteFileAttachment, etc.)

## API Responses

### File Object Format

```json
{
  "id": "uuid",
  "public_id": "peerspace/post/123/document.pdf",
  "secure_url": "https://res.cloudinary.com/...",
  "resource_type": "image|video|raw",
  "format": "jpg|pdf|mp4",
  "is_private": false,
  "created_at": "2025-01-01T00:00:00Z"
}
```

### Entity Responses Include Files

```json
{
  "id": 123,
  "title": "...",
  "body": "...",
  "files": [
    { "id": "...", "secure_url": "...", ... }
  ],
  "votes": { ... }
}
```

## Validation

### File Creation Validation

- `public_id`: Required string
- `secure_url`: Valid URL
- `resource_type`: image|video|raw|auto
- `context`: Valid FileContext enum
- `context_id`: Positive integer
- `is_private`: Optional boolean

### Query Parameter Validation

- `context`: Required enum
- `context_id`: Required positive integer

## Error Handling

### Graceful Degradation

- Cloudinary failures don't block database operations
- Missing files in responses handled gracefully
- Transaction rollback on critical errors

### Status Codes

- 201: File created
- 200: File retrieved/deleted
- 400: Validation error
- 403: Unauthorized (not uploader/admin)
- 404: File not found
- 500: Server error

## Testing Checklist

- [ ] Create file via /api/files POST
- [ ] List files by context GET /api/files?context=POST&context_id=1
- [ ] Get single file GET /api/files/{id}
- [ ] Delete file DELETE /api/files/{id}
- [ ] Bulk delete POST /api/files/bulk-delete
- [ ] Post creation includes files in response
- [ ] Post deletion cascades file cleanup
- [ ] Note creation includes files in response
- [ ] Assignment deletion cascades to submissions
- [ ] Submission files persist after creation
- [ ] Community deletion cascades to post files
- [ ] Avatar update replaces old file
- [ ] User deletion cleans up avatar

## Migration Path

### From Old System

1. FileAttachment junction tables still exist (unused)
2. Can be removed after verifying all data migrated
3. File references now use context/context_id exclusively

### Future Enhancements

1. File versioning system
2. Thumbnail generation for images
3. Upload progress tracking
4. Bulk upload endpoints
5. File search/filtering
6. Storage quota management

## Swagger Documentation

All endpoints documented with:

- Request body/query parameter schemas
- Response object schemas
- Security requirements
- Error codes and descriptions
