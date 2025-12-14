# Multiple File Attachments - API Changes

## Overview

All entities (Posts, Assignments, Submissions, Notes) now support **multiple file attachments** using dedicated attachment tables in the database.

## Database Schema

The following attachment tables are used:

- `PostFileAttachment` (pid, fid)
- `AssignmentFileAttachment` (aid, fid)
- `SubmissionFileAttachment` (subid, fid)
- `NoteFileAttachment` (nid, fid)

## API Changes

### 1. Posts (`/api/posts`)

#### Create Post

**Endpoint:** `POST /api/posts`

**Request Body:**

```json
{
  "title": "Post title",
  "type": "discussion",
  "body": "Post content",
  "cid": "community-uuid",
  "file_ids": ["file-uuid-1", "file-uuid-2"] // NEW: Array of file IDs
}
```

#### Update Post

**Endpoint:** `PUT /api/posts/:id`

**Request Body:**

```json
{
  "title": "Updated title",
  "body": "Updated content",
  "file_ids": ["file-uuid-1", "file-uuid-3"] // NEW: Replaces all attachments
}
```

#### Get Posts Response

```json
{
  "data": [
    {
      "id": 1,
      "title": "Post title",
      "PostFileAttachment": [
        // NEW: Includes attachment data
        {
          "fid": "file-uuid-1",
          "File": {
            "id": "file-uuid-1",
            "secure_url": "https://...",
            "resource_type": "image",
            "format": "jpg",
            "is_private": false
          }
        }
      ]
    }
  ]
}
```

---

### 2. Assignments (`/api/assignments`)

#### Create Assignment

**Endpoint:** `POST /api/assignments`

**Request Body:**

```json
{
  "title": "Homework 1",
  "description": "Complete exercises",
  "cid": "community-uuid",
  "due_date": "2025-12-31T23:59:59Z",
  "max_points": 100,
  "file_ids": ["file-uuid-1", "file-uuid-2"] // NEW: Array of file IDs
}
```

#### Update Assignment

**Endpoint:** `PUT /api/assignments/:id`

**Request Body:**

```json
{
  "title": "Updated Homework 1",
  "max_points": 120,
  "file_ids": ["file-uuid-1", "file-uuid-3"] // NEW: Replaces all attachments
}
```

#### Get Assignments Response

```json
{
  "data": [
    {
      "id": 1,
      "title": "Homework 1",
      "AssignmentFileAttachment": [
        // NEW: Includes attachment data
        {
          "fid": "file-uuid-1",
          "File": {
            "id": "file-uuid-1",
            "secure_url": "https://...",
            "resource_type": "raw",
            "format": "pdf",
            "is_private": false
          }
        }
      ]
    }
  ]
}
```

---

### 3. Submissions (`/api/submissions`)

#### Create Submission

**Endpoint:** `POST /api/submissions`

**Request Body:**

```json
{
  "aid": 1,
  "fileIds": ["file-uuid-1", "file-uuid-2"], // NEW: Array of file IDs
  "feedback": "Optional feedback"
}
```

#### Update Submission

**Endpoint:** `PUT /api/submissions/:id`

**Request Body:**

```json
{
  "feedback": "Updated feedback",
  "fileIds": ["file-uuid-3", "file-uuid-4"] // NEW: Replaces all attachments
}
```

#### Get Submissions Response

```json
{
  "data": [
    {
      "id": 1,
      "aid": 1,
      "SubmissionFileAttachment": [
        // NEW: Includes attachment data
        {
          "fid": "file-uuid-1",
          "File": {
            "id": "file-uuid-1",
            "secure_url": "https://...",
            "resource_type": "raw",
            "format": "pdf",
            "is_private": false
          }
        }
      ]
    }
  ]
}
```

---

### 4. Notes (`/api/notes`)

#### Create Note

**Endpoint:** `POST /api/notes`

**Request Body:**

```json
{
  "title": "My Note",
  "body": "Note content",
  "notebook_id": 1,
  "file_ids": ["file-uuid-1", "file-uuid-2"] // NEW: Array of file IDs
}
```

#### Update Note

**Endpoint:** `PUT /api/notes/:id`

**Request Body:**

```json
{
  "title": "Updated Note",
  "body": "Updated content",
  "file_ids": ["file-uuid-3"] // NEW: Replaces all attachments
}
```

#### Get Notes Response

```json
{
  "data": [
    {
      "id": 1,
      "title": "My Note",
      "NoteFileAttachment": [
        // NEW: Includes attachment data
        {
          "fid": "file-uuid-1",
          "File": {
            "id": "file-uuid-1",
            "secure_url": "https://...",
            "resource_type": "image",
            "format": "png",
            "is_private": false
          }
        }
      ]
    }
  ]
}
```

---

## Migration Guide

### Backend Changes ✅ (Already Implemented)

All controllers now:

1. Accept `file_ids` (or `fileIds`) arrays in create/update endpoints
2. Create attachment records in the appropriate junction tables
3. Include attachment data with file information in GET responses
4. Replace all attachments when updating (delete old, create new)

### Frontend Changes Needed

Update your API client and components to:

1. **When creating entities**, send file IDs as an array:

   ```typescript
   const response = await postApi.create({
     title: "My Post",
     body: "Content",
     cid: communityId,
     file_ids: selectedFileIds, // Array of UUIDs from file upload
   });
   ```

2. **When displaying entities**, access attachments from the new structure:

   ```typescript
   // Old (single file via context query):
   const files = await api.get(`/files?context=POST&context_id=${postId}`);

   // New (included in response):
   const post = await postApi.getById(postId);
   const attachments = post.PostFileAttachment.map((att) => att.File);
   ```

3. **Update TypeScript types** to reflect the new structure:
   ```typescript
   interface Post {
     id: number;
     title: string;
     PostFileAttachment?: Array<{
       fid: string;
       File: {
         id: string;
         secure_url: string;
         resource_type: string;
         format: string;
         is_private: boolean;
       };
     }>;
   }
   ```

## File Upload Workflow

1. **Upload files** to get file IDs:

   ```typescript
   // Sign upload
   const { signature, timestamp, api_key } = await api.post("/uploads/sign", {
     context: "POST",
     context_id: "temp", // Can use temp ID before entity creation
   });

   // Upload to Cloudinary
   const formData = new FormData();
   formData.append("file", file);
   formData.append("signature", signature);
   // ... other params
   const cloudinaryResponse = await uploadToCloudinary(formData);

   // Save file record
   const fileRecord = await api.post("/files", {
     public_id: cloudinaryResponse.public_id,
     secure_url: cloudinaryResponse.secure_url,
     // ... other file metadata
     context: "POST",
     context_id: "temp",
   });

   // Collect file IDs
   fileIds.push(fileRecord.id);
   ```

2. **Create entity with file IDs**:
   ```typescript
   await postApi.create({
     title: "Post with files",
     body: "Content",
     cid: communityId,
     file_ids: fileIds, // Pass the collected file IDs
   });
   ```

## Benefits

✅ **Multiple attachments** - No longer limited to single files  
✅ **Proper relationships** - Uses junction tables with foreign keys  
✅ **Better queries** - Can include attachments in single query  
✅ **Type safety** - Clear schema with proper relations  
✅ **Cascading deletes** - Attachments deleted when entity deleted

## Testing Recommendations

1. Test creating entities with 0, 1, and multiple attachments
2. Test updating entities to add/remove/replace attachments
3. Verify attachment records are properly created in junction tables
4. Confirm orphaned file records don't remain after updates
5. Test that deleting an entity cascades to delete attachments
