import React, { useState } from 'react';
import { Send, Loader2, Tag, X } from 'lucide-react';
import { toast } from 'sonner';
import { postApi, type PostResponse } from '../../../services/api';

// Available post tags
const POST_TAGS = [
  { id: 'math', label: 'Math', color: 'bg-blue-500', textColor: 'text-blue-500', bgLight: 'bg-blue-500/10' },
  { id: 'scientific', label: 'Scientific', color: 'bg-green-500', textColor: 'text-green-500', bgLight: 'bg-green-500/10' },
  { id: 'puzzles', label: 'Puzzles', color: 'bg-purple-500', textColor: 'text-purple-500', bgLight: 'bg-purple-500/10' },
] as const;

interface CreatePostProps {
  communityId: string;
  userFirstName: string;
  userId: number;
  userLastName: string;
  userAvatarUrl?: string | null;
  onPostCreated: (post: PostResponse) => void;
}

const CreatePost: React.FC<CreatePostProps> = ({
  communityId,
  userFirstName,
  userId,
  userLastName,
  userAvatarUrl,
  onPostCreated,
}) => {
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostBody, setNewPostBody] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isCreatingPost, setIsCreatingPost] = useState(false);

  const handleCreatePost = async () => {
    if (!newPostTitle.trim() || !newPostBody.trim()) return;

    setIsCreatingPost(true);
    try {
      const newPost = await postApi.create({
        title: newPostTitle.trim(),
        body: newPostBody.trim(),
        type: selectedTags.length > 0 ? selectedTags.join(',') : 'discussion',
        cid: communityId,
      });

      // Call the callback with the new post including user info
      onPostCreated({
        ...newPost,
        User: {
          id: userId,
          fname: userFirstName,
          lname: userLastName,
          avatar_url: userAvatarUrl || null,
        },
        _count: { Comment: 0 },
      });

      // Reset form
      setNewPostTitle('');
      setNewPostBody('');
      setSelectedTags([]);
      toast.success('Post created successfully!');
    } catch (err: any) {
      console.error('Failed to create post:', err);
      toast.error(err.response?.data?.message || 'Failed to create post');
    } finally {
      setIsCreatingPost(false);
    }
  };

  return (
    <div className="bg-card p-4 rounded-xl border border-border flex flex-col gap-3 relative overflow-hidden group mb-6">
      {/* Animated border gradient on hover */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-purple-500/0 to-pink-500/0 group-hover:from-blue-500/5 group-hover:via-purple-500/5 group-hover:to-pink-500/5 transition-all duration-500 rounded-xl" />

      <div className="flex items-start gap-3 relative">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold flex-shrink-0 shadow-lg shadow-blue-500/20">
          {userFirstName[0]}
        </div>
        <div className="flex-1 bg-muted/50 border border-input rounded-md flex flex-col overflow-hidden focus-within:border-ring transition-colors">
          {/* Tags Selection */}
          <div className="px-3 py-2 border-b border-input bg-muted/30 flex items-center gap-2 flex-wrap">
            <Tag size={12} className="text-muted-foreground flex-shrink-0" />
            {POST_TAGS.map((tag) => {
              const isSelected = selectedTags.includes(tag.id);
              return (
                <button
                  key={tag.id}
                  onClick={() => {
                    if (isSelected) {
                      setSelectedTags(prev => prev.filter(t => t !== tag.id));
                    } else {
                      setSelectedTags(prev => [...prev, tag.id]);
                    }
                  }}
                  className={`text-xs font-medium px-2 py-0.5 rounded-full transition-all ${isSelected
                      ? `${tag.bgLight} ${tag.textColor} ring-1 ring-current`
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                >
                  {tag.label}
                </button>
              );
            })}
            {selectedTags.length > 0 && (
              <button
                onClick={() => setSelectedTags([])}
                className="ml-auto text-muted-foreground hover:text-foreground transition-colors"
              >
                <X size={12} />
              </button>
            )}
          </div>

          <input
            type="text"
            placeholder="Post title..."
            value={newPostTitle}
            onChange={(e) => setNewPostTitle(e.target.value)}
            className="bg-transparent px-4 py-2 text-sm font-medium focus:outline-none text-foreground placeholder-muted-foreground border-b border-input"
          />
          <textarea
            placeholder="What's on your mind? (Shift+Enter for new line)"
            value={newPostBody}
            onChange={(e) => setNewPostBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && newPostTitle.trim() && newPostBody.trim()) {
                e.preventDefault();
                handleCreatePost();
              }
            }}
            rows={2}
            className="flex-1 bg-transparent px-4 py-2 text-sm focus:outline-none text-foreground placeholder-muted-foreground resize-none min-h-[60px]"
          />
        </div>
        <button
          onClick={handleCreatePost}
          disabled={!newPostTitle.trim() || !newPostBody.trim() || isCreatingPost}
          className="p-2.5 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 rounded-full text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:scale-110 hover:shadow-lg hover:shadow-blue-500/30 group/btn mt-1"
        >
          {isCreatingPost ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <Send size={18} className="transform -rotate-45 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform duration-300" />
          )}
        </button>
      </div>
    </div>
  );
};

export default CreatePost;
