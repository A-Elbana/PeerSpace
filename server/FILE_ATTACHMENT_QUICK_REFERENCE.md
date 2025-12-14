# File Attachment System - Quick Reference Guide

## For Frontend Developers

### Workflow: Upload & Attach File

#### Step 1: Get Upload Signature

```javascript
// Request upload signature from backend
const response = await fetch("/api/uploads/sign", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    context: "POST", // POST|SUBMISSION|NOTE|ASSIGNMENT|COMMUNITY_BANNER|USER_AVATAR
    context_id: 123, // The entity ID
    is_private: false, // Optional, default false
    folder: "my-folder", // Optional custom folder
    resource_type: "auto", // Optional
  }),
});

const { uploadUrl, timestamp, signature, folder, cloudName, apiKey } =
  await response.json();
```

#### Step 2: Upload to Cloudinary

```javascript
// Use the signature to upload directly to Cloudinary
const formData = new FormData();
formData.append("file", fileInput.files[0]);
formData.append("upload_preset", "unsigned_upload"); // Or use signature
formData.append("timestamp", timestamp);
formData.append("signature", signature);
formData.append("api_key", apiKey);

const uploadResponse = await fetch(uploadUrl, {
  method: "POST",
  body: formData,
});

const uploadedFile = await uploadResponse.json();
// Returns: { public_id, secure_url, resource_type, format, ... }
```

#### Step 3: Save File Record in Backend

```javascript
// Create file record in database
const fileResponse = await fetch("/api/files", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    public_id: uploadedFile.public_id,
    secure_url: uploadedFile.secure_url,
    resource_type: uploadedFile.resource_type,
    format: uploadedFile.format,
    context: "POST",
    context_id: 123,
    is_private: false,
  }),
});

const fileRecord = await fileResponse.json();
// { id: uuid, public_id, secure_url, ... }
```

#### Step 4: Use File in Entity

```javascript
// When creating/updating entity, files are automatically linked
// via context/context_id, no need to manually associate

// When fetching entity:
const post = await fetch("/api/posts/123", {
  headers: { Authorization: `Bearer ${token}` },
});
const postData = await post.json();
// postData.files will be populated automatically
```

---

## For Backend Developers

### Add File Support to New Entity

#### 1. Ensure FileContext Enum Includes Your Type

```prisma
enum FileContext {
  POST
  SUBMISSION
  NOTE
  ASSIGNMENT
  COMMUNITY_BANNER
  USER_AVATAR
  YOUR_NEW_TYPE  // Add here
}
```

#### 2. Add File Retrieval to GET Endpoint

```typescript
export const getYourEntityById = async (req: Request, res: Response) => {
  const entityId = req.params.id;

  try {
    // ... fetch your entity ...

    // Get attached files
    const files = await prisma.file.findMany({
      where: {
        context: "YOUR_ENTITY_TYPE",
        context_id: entityId,
      },
      select: {
        id: true,
        public_id: true,
        secure_url: true,
        resource_type: true,
        format: true,
        is_private: true,
        created_at: true,
      },
    });

    res.status(200).json({
      ...entity,
      files, // Include files in response
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ message: "Failed to fetch entity" });
  }
};
```

#### 3. Add Cascade File Deletion to DELETE Endpoint

```typescript
export const deleteYourEntity = async (req: Request, res: Response) => {
  const entityId = req.params.id;

  try {
    // Delete associated files
    const files = await prisma.file.findMany({
      where: {
        context: "YOUR_ENTITY_TYPE",
        context_id: entityId,
      },
    });

    // Delete from Cloudinary
    const cloudinary = require("../config/cloudinary").default;
    for (const file of files) {
      try {
        await cloudinary.uploader.destroy(file.public_id);
      } catch (error) {
        console.error(
          `Failed to delete from Cloudinary: ${file.public_id}`,
          error
        );
      }
    }

    // Delete from database
    await prisma.file.deleteMany({
      where: {
        context: "YOUR_ENTITY_TYPE",
        context_id: entityId,
      },
    });

    // Delete entity
    await prisma.yourEntity.delete({ where: { id: entityId } });

    res.status(200).json({ message: "Deleted successfully" });
  } catch (error) {
    console.error("Delete Error:", error);
    res.status(500).json({ message: "Failed to delete" });
  }
};
```

#### 4. Use Transaction for Complex Operations

```typescript
await prisma.$transaction(async (tx) => {
  // Delete files from Cloudinary
  const files = await tx.file.findMany({
    where: { context: "TYPE", context_id: id }
  });

  for (const file of files) {
    // ... delete from Cloudinary ...
  }

  // Delete file records
  await tx.file.deleteMany({
    where: { context: "TYPE", context_id: id }
  });

  // Delete related records
  await tx.relatedModel.deleteMany({ where: { ... } });

  // Delete main entity
  await tx.yourEntity.delete({ where: { id } });
});
```

---

## Common Queries

### Get All Files for an Entity

```typescript
const files = await prisma.file.findMany({
  where: {
    context: "POST",
    context_id: postId,
  },
  orderBy: { created_at: "desc" },
});
```

### Get File with Uploader Info

```typescript
const file = await prisma.file.findUnique({
  where: { id: fileId },
  include: {
    User: {
      select: { id: true, fname: true, lname: true },
    },
  },
});
```

### Count Files for Entity

```typescript
const count = await prisma.file.count({
  where: {
    context: "SUBMISSION",
    context_id: submissionId,
  },
});
```

### Delete All Files of Type

```typescript
await prisma.file.deleteMany({
  where: {
    context: "POST",
  },
});
```

---

## API Endpoints Reference

### File Management

| Method | Endpoint                               | Purpose                |
| ------ | -------------------------------------- | ---------------------- |
| POST   | /api/files                             | Create file record     |
| GET    | /api/files?context=POST&context_id=123 | List files by context  |
| GET    | /api/files/:id                         | Get single file        |
| DELETE | /api/files/:id                         | Delete file            |
| POST   | /api/files/bulk-delete                 | Bulk delete by context |

### Entity Endpoints (with files)

| Method | Endpoint             | Files Included   |
| ------ | -------------------- | ---------------- |
| GET    | /api/posts/:id       | Yes              |
| GET    | /api/notes/:id       | Yes              |
| GET    | /api/assignments/:id | Yes              |
| GET    | /api/submissions/:id | Yes              |
| GET    | /api/communities/:id | (banner_file_id) |
| GET    | /api/users/:id       | (avatar_file_id) |

---

## Error Handling Patterns

### Graceful Cloudinary Failure

```typescript
try {
  await cloudinary.uploader.destroy(file.public_id);
} catch (error) {
  // Log but continue - don't block database deletion
  console.error(`Cloudinary deletion failed: ${file.public_id}`, error);
}

// Always delete from database even if Cloudinary fails
await prisma.file.delete({ where: { id: fileId } });
```

### Transaction Rollback

```typescript
try {
  await prisma.$transaction(async (tx) => {
    // All operations here - if any fails, all rollback
  });
} catch (error) {
  // Transaction automatically rolled back
  console.error("Transaction failed:", error);
  res.status(500).json({ message: "Operation failed" });
}
```

---

## Security Checklist

- ✅ User must be authenticated for file operations
- ✅ Only uploader or admin can delete files
- ✅ Private files get signed URLs (1-hour expiry)
- ✅ Entity ownership verified before file attachment
- ✅ File type validation (resource_type)
- ✅ Context enum validation (type-safe)
- ✅ context_id must be valid for entity type

---

## Debugging Tips

### Check File in Database

```typescript
const file = await prisma.file.findUnique({
  where: { id: "uuid-here" },
});
console.log(file);
```

### List All Files for Entity

```typescript
const files = await prisma.file.findMany({
  where: {
    context: "POST",
    context_id: 123,
  },
});
console.log(files);
```

### Verify Cloudinary Asset

```
Visit: https://res.cloudinary.com/peerspace/image/upload/PUBLIC_ID
```

### Check Upload History

```typescript
// In Cloudinary dashboard:
// Dashboard → Media Library → Filter by folder name
// peerspace/{context}/{context_id}
```

---

## Performance Tips

1. **Use Select/Omit** - Don't load unnecessary fields
2. **Index on (context, context_id)** - Already in place
3. **Batch Deletions** - Use deleteMany for bulk operations
4. **Cache Signed URLs** - They're valid for 1 hour
5. **Lazy Load Files** - Only fetch if needed
6. **Pagination** - Implement for large file lists

---

## Common Issues & Solutions

### Issue: Files not appearing after upload

**Solution**: Ensure context and context_id match when creating file record

### Issue: Cloudinary delete fails but DB succeeds

**Solution**: This is expected and safe - Cloudinary failure is logged but doesn't block

### Issue: Private files not accessible

**Solution**: Frontend must request signed URL via GET /api/files/:id

### Issue: Old avatar not deleted when updating

**Solution**: updateUser() now handles this - old file is deleted automatically

### Issue: Files not deleted when entity removed

**Solution**: Cascade deletion implemented - entity delete automatically cleans files

---

## Testing Command Examples

```bash
# Create file record
curl -X POST http://localhost:3000/api/files \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "public_id": "peerspace/post/123/file",
    "secure_url": "https://...",
    "resource_type": "image",
    "context": "POST",
    "context_id": 123
  }'

# List files by context
curl http://localhost:3000/api/files?context=POST&context_id=123 \
  -H "Authorization: Bearer TOKEN"

# Get single file
curl http://localhost:3000/api/files/uuid-here \
  -H "Authorization: Bearer TOKEN"

# Delete file
curl -X DELETE http://localhost:3000/api/files/uuid-here \
  -H "Authorization: Bearer TOKEN"
```

---

**Last Updated**: 2025-01-14  
**Status**: ✅ Production Ready
