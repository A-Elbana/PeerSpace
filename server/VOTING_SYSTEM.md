# Post Voting System - Backend Implementation

## Overview
This implementation provides a complete backend voting system for posts in the PeerSpace application. The system supports upvoting and downvoting posts, with proper access control for public and private communities.

## Database Schema

The voting system uses the existing `Voted` model in Prisma:

```prisma
model Voted {
  sid      Int      // Student ID who voted
  pid      Int      // Post ID being voted on
  voteType Boolean  // true = upvote, false = downvote
  Post     Post     @relation(fields: [pid], references: [id], onDelete: Cascade, onUpdate: Cascade)
  Student  Student  @relation(fields: [sid], references: [uid], onDelete: Cascade, onUpdate: Cascade)

  @@id([sid, pid])  // Composite primary key ensures one vote per student per post
}
```

## API Endpoints

### 1. Vote on a Post
**POST** `/api/votes`

**Authentication**: Required (Student only)

**Request Body**:
```json
{
  "postId": 1,
  "voteType": true  // true for upvote, false for downvote
}
```

**Responses**:
- **201**: Vote recorded successfully
- **200**: Vote updated or already recorded
- **400**: Invalid input
- **403**: Not a student or not enrolled in private community
- **404**: Post not found

**Behavior**:
- If the user hasn't voted → creates a new vote
- If the user has voted differently → updates the vote
- If the user has voted the same way → no change (returns existing vote)
- For PRIVATE communities → checks enrollment before allowing vote

---

### 2. Remove Vote from a Post
**DELETE** `/api/votes/:postId`

**Authentication**: Required (Student only)

**Parameters**:
- `postId` (path): The ID of the post

**Responses**:
- **200**: Vote removed successfully
- **400**: Invalid post ID
- **403**: Not a student
- **404**: Vote not found

---

### 3. Get Vote Information
**GET** `/api/votes/:postId`

**Authentication**: Optional (public for vote counts, authenticated students see their vote)

**Parameters**:
- `postId` (path): The ID of the post

**Response**:
```json
{
  "postId": 1,
  "upvotes": 25,
  "downvotes": 3,
  "score": 22,
  "userVote": true  // null if not voted, true if upvoted, false if downvoted
}
```

**Responses**:
- **200**: Vote information retrieved successfully
- **400**: Invalid post ID
- **404**: Post not found

---

## Enhanced Post Endpoints

The existing post endpoints now include vote information:

### Get Post by ID
**GET** `/api/posts/:id`

Response now includes:
```json
{
  "id": 1,
  "title": "Example Post",
  // ... other post fields
  "votes": {
    "upvotes": 25,
    "downvotes": 3,
    "score": 22,
    "userVote": true  // Only for authenticated students
  }
}
```

### Get Posts by Community
**GET** `/api/posts?cid=<community-uuid>`

Each post in the response now includes vote information:
```json
{
  "data": [
    {
      "id": 1,
      "title": "Example Post",
      // ... other post fields
      "votes": {
        "upvotes": 25,
        "downvotes": 3,
        "score": 22,
        "userVote": null
      }
    }
  ],
  "meta": { /* pagination info */ }
}
```

---

## Access Control

### Who Can Vote?
- **Only Students** can vote on posts
- Instructors and Admins cannot vote (they can only moderate)

### Community-Based Access:
- **Public Communities**: Any student can vote on posts
- **Private Communities**: Only enrolled students can vote on posts

---

## Implementation Details

### Files Created/Modified:

1. **VoteController.ts** (NEW)
   - `votePost()`: Handle voting on posts
   - `removeVote()`: Remove a user's vote
   - `getVoteInfo()`: Get vote counts and user's vote

2. **voteMiddleware.ts** (NEW)
   - `requireStudentRole`: Ensures only students can vote
   - `validateVoteRequest`: Validates vote request body

3. **voteRoutes.ts** (NEW)
   - Defines all voting endpoints with Swagger documentation

4. **PostController.ts** (MODIFIED)
   - Enhanced `getPostById()` to include vote data
   - Enhanced `getPostsByCommunity()` to include vote data for each post

5. **app.ts** (MODIFIED)
   - Registered vote routes at `/api/votes`

---

## Usage Examples

### Example 1: Upvote a Post
```bash
curl -X POST http://localhost:3000/api/votes \
  -H "Authorization: Bearer <student-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "postId": 1,
    "voteType": true
  }'
```

### Example 2: Change Vote from Upvote to Downvote
```bash
curl -X POST http://localhost:3000/api/votes \
  -H "Authorization: Bearer <student-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "postId": 1,
    "voteType": false
  }'
```

### Example 3: Remove Vote
```bash
curl -X DELETE http://localhost:3000/api/votes/1 \
  -H "Authorization: Bearer <student-token>"
```

### Example 4: Get Vote Information (as guest)
```bash
curl http://localhost:3000/api/votes/1
```

### Example 5: Get Vote Information (as authenticated student)
```bash
curl http://localhost:3000/api/votes/1 \
  -H "Authorization: Bearer <student-token>"
```

---

## Business Logic

### Vote Score Calculation:
```
score = upvotes - downvotes
```

### Vote Update Logic:
1. Check if student has already voted
2. If not voted → Create new vote
3. If voted with same type → Return existing (no change)
4. If voted with different type → Update to new vote type

### Community Access:
- **PUBLIC**: No enrollment check
- **PRIVATE**: Must be enrolled to vote

---

## Error Handling

All endpoints include proper error handling:
- **400**: Bad request (invalid input)
- **401**: Unauthorized (not authenticated)
- **403**: Forbidden (not a student, not enrolled)
- **404**: Not found (post/vote doesn't exist)
- **500**: Server error (database issues)

---

## Testing Checklist

- [ ] Students can upvote posts in public communities
- [ ] Students can downvote posts in public communities
- [ ] Students can change their vote (upvote → downvote and vice versa)
- [ ] Students can remove their vote
- [ ] Students cannot vote twice on the same post (same vote type)
- [ ] Enrolled students can vote in private communities
- [ ] Non-enrolled students cannot vote in private communities
- [ ] Instructors cannot vote (403 error)
- [ ] Admins cannot vote (403 error)
- [ ] Guests can view vote counts but not vote
- [ ] Vote counts update correctly
- [ ] User's vote status is returned correctly
- [ ] Post endpoints return vote information

---

## Future Enhancements (Optional)

1. **Sorting by Score**: Add sorting options to get posts by vote score
2. **Hot/Trending Algorithm**: Combine vote score with time decay
3. **Vote Notifications**: Notify post authors when they receive votes
4. **Vote History**: Track when votes were cast/changed
5. **Rate Limiting**: Prevent vote manipulation by limiting votes per time period
6. **Analytics**: Track voting patterns and popular content
