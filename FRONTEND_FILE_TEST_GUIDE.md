# File Attachment Testing Guide - Frontend Edition

## 🎯 Quick Start

I've added a simple file attachment testing interface to your frontend. Here's how to test it:

### Option 1: Dedicated Test Page (Recommended)

1. **Start your servers:**

   ```bash
   # Terminal 1 - Backend
   cd server
   npm run dev

   # Terminal 2 - Frontend
   cd client
   npm run dev
   ```

2. **Login to your app** (use your existing credentials)

3. **Navigate to test page:**

   - Go to: `http://localhost:5173/file-test`
   - Or add this link to your dashboard navigation temporarily

4. **Run the tests:**
   - Click "Test Upload" - Creates a small text file and uploads it
   - Click "Test Retrieve" - Fetches files from database
   - Click trash icon - Deletes specific files
   - Click "Run All Tests" - Automated test sequence

### Option 2: Test via Community Creation

1. **Go to Dashboard** (`/dashboard`)

2. **Click "Create Community"** button

3. **Fill in community details:**

   - Name: "Test Community"
   - Description: "Testing file upload"
   - Type: Public or Private

4. **Upload a banner image:**

   - Click "Upload Banner Image" button
   - Select an image (max 5MB)
   - Watch it upload (you'll see a preview)

5. **Create the community**
   - The banner will be attached to the community
   - You can verify it in the community page

## 🔧 What I Added

### New Components

1. **FileUpload.tsx** - Reusable file upload component

   - Location: `client/src/components/FileUpload.tsx`
   - Features:
     - Cloudinary integration
     - Preview for images
     - Progress indication
     - Error handling
     - File size validation

2. **FileAttachmentTest Page** - Dedicated testing page
   - Location: `client/src/pages/FileTest/index.tsx`
   - Features:
     - Upload test files
     - Retrieve files by context
     - Delete files
     - View test results
     - See uploaded files list

### Updated Files

1. **CreateCommunityModal.tsx**

   - Added banner file upload
   - Integrated FileUpload component
   - Passes banner_file_id to API

2. **api.ts**

   - Added `fileApi` with methods:
     - `create()` - Save file record
     - `getByContext()` - Get files by context
     - `getById()` - Get single file
     - `delete()` - Delete file
   - Updated `communityApi.create()` to accept `banner_file_id`

3. **App.tsx**
   - Added `/file-test` route

## 📝 Testing Workflow

### Full Upload Flow (How it works):

```
1. User selects file
   ↓
2. Frontend requests upload signature from backend
   POST /api/uploads/sign
   ↓
3. Frontend uploads file directly to Cloudinary
   (using signature)
   ↓
4. Frontend saves file record to database
   POST /api/files
   ↓
5. Frontend gets file ID back
   ↓
6. File ID can be attached to entities
   (communities, users, posts, etc.)
```

### Test Scenarios

#### Scenario 1: Community Banner

```
1. Create community with banner
2. Verify banner shows in community page
3. Update community with new banner
4. Old banner should be deleted
5. Delete community
6. Banner should be deleted (cascade)
```

#### Scenario 2: Direct File Upload

```
1. Go to /file-test
2. Upload a file
3. See it in "Uploaded Files" list
4. Click retrieve - should show in results
5. Click delete - should remove from list
```

## ✅ Success Indicators

You'll know it's working when:

- ✅ Files upload without errors
- ✅ You see preview images
- ✅ File IDs are returned (UUID format)
- ✅ Files appear in uploaded files list
- ✅ Retrieve returns your uploaded files
- ✅ Delete removes files from list
- ✅ Communities can be created with banners
- ✅ No console errors

## 🐛 Troubleshooting

### "Upload failed" or 401 errors

- Make sure you're logged in
- Token might be expired - logout and login again

### "Cloudinary upload failed"

- Check backend `.env` has Cloudinary credentials:
  ```
  CLOUDINARY_CLOUD_NAME=your_cloud_name
  CLOUDINARY_API_KEY=your_api_key
  CLOUDINARY_API_SECRET=your_api_secret
  ```

### "File not found" errors

- Make sure backend is running
- Check `/api/files` endpoint is registered
- Verify database migration ran

### Files upload but don't show

- Check browser console for errors
- Verify `context` and `context_id` are correct
- Try retrieve test to see if files exist

## 🎨 UI Features

### FileUpload Component Props

```tsx
<FileUpload
  context="COMMUNITY_BANNER" // File context type
  contextId={123} // Entity ID
  onFileUploaded={(id, url) => {}} // Callback with file ID & URL
  onError={(error) => {}} // Error callback
  accept="image/*" // File type filter
  maxSizeMB={5} // Size limit
  label="Upload Banner" // Button label
  preview={true} // Show image preview
/>
```

### Available Contexts

- `POST` - Post attachments
- `SUBMISSION` - Assignment submissions
- `NOTE` - Note attachments
- `ASSIGNMENT` - Assignment files
- `COMMUNITY_BANNER` - Community banners
- `USER_AVATAR` - User profile pictures

## 🚀 Next Steps

### Extend the feature:

1. **Add to other entities:**

   - User avatar upload (Settings page)
   - Post attachments (Create post modal)
   - Assignment files (Assignment creation)
   - Note attachments (Notes editor)

2. **Enhance UI:**

   - Multiple file uploads
   - Drag and drop
   - File gallery view
   - Download buttons

3. **Add features:**
   - Image cropping
   - File compression
   - Video support
   - PDF preview

## 📊 API Endpoints Used

```
POST   /api/uploads/sign       - Get upload signature
POST   /api/files              - Create file record
GET    /api/files              - List files (by context)
GET    /api/files/:id          - Get single file
DELETE /api/files/:id          - Delete file

POST   /api/communities        - Create with banner_file_id
```

## 💡 Tips

1. **Test incrementally:** Upload → Retrieve → Delete
2. **Check browser console:** See exactly what's happening
3. **Use test page first:** Easier to debug than full workflow
4. **Small files first:** Use small images/text files for testing
5. **Watch network tab:** See API calls and responses

## 📁 File Structure

```
client/src/
├── components/
│   ├── FileUpload.tsx          ← New file upload component
│   └── dashboard/
│       └── CreateCommunityModal.tsx  ← Updated with file upload
├── pages/
│   └── FileTest/
│       └── index.tsx           ← New test page
├── services/
│   └── api.ts                  ← Added fileApi methods
└── App.tsx                     ← Added /file-test route
```

## 🎯 Ready to Test!

Everything is set up. Just:

1. Start both servers
2. Login to the app
3. Visit `/file-test` or create a community
4. Upload some files!

The system will handle:

- ✅ Cloudinary upload
- ✅ Database storage
- ✅ File retrieval
- ✅ Cascade deletion
- ✅ Error handling

**Happy Testing! 🚀**
