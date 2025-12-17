import React, { useEffect, useMemo, useState } from 'react';
import { Image as ImageIcon, X, Send, ChevronDown, Search, FileIcon } from 'lucide-react';
import api, { communityApi, postApi } from '../../services/api';
import { useResolvedFileUrl } from '../../hooks/useResolvedFileUrl';
import { MarkdownEditor } from '../MarkdownEditor';
import { toast } from 'sonner';
import TagChip from '../common/TagChip';

type CommunityOption = { id: string; name: string; memberCount?: number; postCount?: number; isEnrolled?: boolean };

interface CurrentUser {
  id: number;
  fname: string;
  lname: string;
  avatar_file_id?: string | null;
}

interface CreatePostWidgetProps {
  currentUser?: CurrentUser | null;
  defaultCommunityId?: string;
  onCreated?: (newPost?: any) => void; // callback receives created post when available
}

const CreatePostWidget: React.FC<CreatePostWidgetProps> = ({ currentUser, defaultCommunityId, onCreated }) => {
  const [expanded, setExpanded] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [tagsArr, setTagsArr] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [communityId, setCommunityId] = useState<string>(defaultCommunityId || '');
  const [communities, setCommunities] = useState<CommunityOption[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [showCommunityDropdown, setShowCommunityDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [displayedCount, setDisplayedCount] = useState(15);

  const lockedCommunity = useMemo(() => !!defaultCommunityId, [defaultCommunityId]);

  const avatarUrl = useResolvedFileUrl(currentUser?.avatar_file_id ?? null);

  useEffect(() => {
    if (lockedCommunity) return;
    let mounted = true;
    (async () => {
      try {
        const res = await communityApi.getMyCommunities({ limit: 100 });
        if (!mounted) return;
        // Fetch full community data with member info for better metadata
        const opts = (res.data || []).map((c: any) => ({
          id: c.id,
          name: c.name,
          memberCount: c._count?.members || 0,
          postCount: c._count?.Post || 0,
          isEnrolled: true,
        }));
        // Sort by recent activity or member count
        opts.sort((a, b) => (b.postCount || 0) - (a.postCount || 0));
        setCommunities(opts);
        // Auto-select first enrolled community if none selected
        if (!communityId && opts.length > 0) {
          setCommunityId(opts[0].id);
        }
      } catch {
        // ignore
      }
    })();
    return () => { mounted = false; };
  }, [lockedCommunity, communityId]);

  const onPickFile: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const newFiles = Array.from(e.target.files || []);
    setFiles(prev => [...prev, ...newFiles]);

    // Generate previews for images
    newFiles.forEach(f => {
      const key = `${f.name}-${f.size}`;
      if (f.type.startsWith('image/')) {
        const url = URL.createObjectURL(f);
        setFilePreviews(prev => ({ ...prev, [key]: url }));
      }
    });
  };

  const removeFile = (index: number) => {
    const fileToRemove = files[index];
    const key = `${fileToRemove.name}-${fileToRemove.size}`;
    if (filePreviews[key]) {
      URL.revokeObjectURL(filePreviews[key]);
      setFilePreviews(prev => {
        const updated = { ...prev };
        delete updated[key];
        return updated;
      });
    }
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Filter and sort communities intelligently
  const filteredCommunities = useMemo(() => {
    let filtered = communities;

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = communities.filter(c => c.name.toLowerCase().includes(query));
    }

    // Sort: enrolled first, then by post count (activity)
    filtered.sort((a, b) => {
      if (a.isEnrolled !== b.isEnrolled) return (b.isEnrolled ? 1 : 0) - (a.isEnrolled ? 1 : 0);
      return (b.postCount || 0) - (a.postCount || 0);
    });

    return filtered;
  }, [communities, searchQuery]);

  const selectedCommunity = communities.find(c => c.id === communityId);

  const canSubmit = title.trim().length > 0 && (communityId || defaultCommunityId);

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      // Step 1: Upload all files to Cloudinary and create file records FIRST
      const fileIds: string[] = [];
      for (const file of files) {
        try {
          const signResponse = await api.post('/uploads/sign', {
            context: 'POST',
            context_id: '0', // temporary; backend accepts and associates file later via file_ids
            is_private: false,
            resource_type: 'auto',
          });
          const { timestamp, signature, folder, cloudName, apiKey } = signResponse.data;

          const uploadForm = new FormData();
          uploadForm.append('file', file);
          uploadForm.append('timestamp', String(timestamp));
          uploadForm.append('signature', signature);
          uploadForm.append('api_key', apiKey);
          uploadForm.append('folder', folder);
          const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`;
          const uploadResponse = await fetch(uploadUrl, { method: 'POST', body: uploadForm });
          if (!uploadResponse.ok) throw new Error('Cloudinary upload failed');
          const cloudinaryData = await uploadResponse.json();

          const fileResponse = await api.post('/files', {
            public_id: cloudinaryData.public_id,
            secure_url: cloudinaryData.secure_url,
            resource_type: cloudinaryData.resource_type,
            format: cloudinaryData.format,
            context: 'POST',
            context_id: '0',
            is_private: false,
          });
          const createdFileId = fileResponse.data?.data?.id || fileResponse.data?.id || fileResponse.data;
          if (createdFileId) fileIds.push(String(createdFileId));
        } catch (err) {
          console.error('File upload error:', err);
        }
      }

      // Step 2: Create the post with file_ids so backend can attach them
      const selectedTags = tagsArr.map(t => t.trim()).filter(Boolean);
      const hasAnnouncementTag = selectedTags.some(t => t.toLowerCase() === 'announcement');
      // If 'announcement' is used as a tag, treat post type as announcement and remove it from tags
      const payloadTags = selectedTags.filter(t => t.toLowerCase() !== 'announcement');
      const payloadType = hasAnnouncementTag ? 'announcement' : 'discussion';

      const created = await postApi.create({
        title: title.trim(),
        body: body.trim() || undefined,
        type: payloadType,
        cid: (communityId || defaultCommunityId) as string,
        file_ids: fileIds.length ? fileIds : undefined,
        // send tags array so server can persist PostTag relations
        tags: payloadTags.length ? payloadTags : undefined,
      } as any);

      // Reset form
      setTitle('');
      setBody('');
      setTagsArr([]);
      Object.values(filePreviews).forEach(url => URL.revokeObjectURL(url));
      setFiles([]);
      setFilePreviews({});
      if (!lockedCommunity) setCommunityId('');
      setExpanded(false);
      onCreated?.(created);
    } catch (err: any) {
      console.error('Post creation error:', err);
      toast.error(err?.response?.data?.message || 'Failed to create post');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-card border border-border rounded-lg shadow-sm p-4 transition-all">
      {/* Collapsed */}
      {!expanded && (
        <div
          className="flex items-center gap-3 cursor-text"
          onClick={() => setExpanded(true)}
        >
          <div className="w-10 h-10 rounded-full bg-linear-to-br from-frosted-blue-500 to-turf-green-500 text-white flex items-center justify-center overflow-hidden">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="font-bold">
                {currentUser?.fname?.[0] || 'U'}
              </span>
            )}
          </div>
          <input
            readOnly
            placeholder="What's on your mind?"
            className="flex-1 h-11 px-4 rounded-full bg-muted/50 border border-input text-sm focus:outline-none"
          />
        </div>
      )}

      {/* Expanded */}
      {expanded && (
        <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-linear-to-br from-frosted-blue-500 to-turf-green-500 text-white flex items-center justify-center overflow-hidden">
              {avatarUrl ? (
                <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="font-bold">{currentUser?.fname?.[0] || 'U'}</span>
              )}
            </div>
            {lockedCommunity ? (
              <span className="text-sm text-muted-foreground">Posting to selected community</span>
            ) : (
              <div className="relative flex-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowCommunityDropdown(!showCommunityDropdown);
                    if (!showCommunityDropdown) setSearchQuery('');
                    setDisplayedCount(15);
                  }}
                  className="w-full px-3 py-2 text-sm bg-muted/50 border border-input rounded-md text-left flex items-center justify-between hover:bg-muted transition-colors"
                >
                  <span className="text-foreground font-medium">
                    {selectedCommunity ? selectedCommunity.name : 'Select community'}
                  </span>
                  <div className="flex items-center gap-2">
                    {selectedCommunity && selectedCommunity.memberCount && (
                      <span className="text-xs text-muted-foreground">{selectedCommunity.memberCount} members</span>
                    )}
                    <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${showCommunityDropdown ? 'rotate-180' : ''}`} />
                  </div>
                </button>

                {showCommunityDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-input rounded-md shadow-lg z-50 max-h-80 overflow-hidden flex flex-col">
                    {/* Search box */}
                    <div className="sticky top-0 p-2 bg-background border-b border-border">
                      <div className="relative">
                        <Search className="absolute left-2 top-2.5 w-4 h-4 text-muted-foreground" />
                        <input
                          type="text"
                          placeholder="Search communities..."
                          value={searchQuery}
                          onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setDisplayedCount(15);
                          }}
                          className="w-full pl-8 pr-3 py-1.5 text-sm border border-input rounded-md bg-muted/50 focus:outline-none focus:ring-1 focus:ring-frosted-blue-500"
                          autoFocus
                        />
                      </div>
                    </div>

                    {/* Communities list */}
                    <div className="overflow-y-auto flex-1">
                      {filteredCommunities.length === 0 ? (
                        <div className="px-3 py-4 text-xs text-muted-foreground text-center">
                          {searchQuery ? 'No communities match your search' : 'No communities available'}
                        </div>
                      ) : (
                        <>
                          {filteredCommunities.slice(0, displayedCount).map((community) => (
                            <button
                              key={community.id}
                              type="button"
                              onClick={() => {
                                setCommunityId(community.id);
                                setShowCommunityDropdown(false);
                                setSearchQuery('');
                              }}
                              className={`w-full text-left px-3 py-2 text-sm transition-colors border-b border-border last:border-b-0 hover:bg-muted ${communityId === community.id ? 'bg-turf-green-500/10 text-turf-green-600' : 'text-foreground'
                                }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-medium truncate">{community.name}</span>
                                {community.isEnrolled && (
                                  <span className="text-xs bg-turf-green-500/20 text-turf-green-600 px-2 py-1 rounded-full shrink-0 ml-2">Enrolled</span>
                                )}
                              </div>
                              {(community.memberCount || community.postCount) && (
                                <div className="flex gap-2 text-xs text-muted-foreground mt-1">
                                  {community.memberCount && <span>{community.memberCount} members</span>}
                                  {community.postCount && <span>•</span>}
                                  {community.postCount && <span>{community.postCount} posts</span>}
                                </div>
                              )}
                            </button>
                          ))}

                          {/* Load more button */}
                          {displayedCount < filteredCommunities.length && (
                            <button
                              type="button"
                              onClick={() => setDisplayedCount(prev => prev + 15)}
                              className="w-full px-3 py-2 text-xs text-center text-frosted-blue-600 hover:bg-muted transition-colors border-t border-border font-medium"
                            >
                              Load {Math.min(15, filteredCommunities.length - displayedCount)} more
                            </button>
                          )}
                        </>
                      )}
                    </div>

                    {/* Info footer */}
                    {filteredCommunities.length > 0 && (
                      <div className="sticky bottom-0 px-3 py-1 bg-muted/50 border-t border-border text-xs text-muted-foreground">
                        Showing {Math.min(displayedCount, filteredCommunities.length)} of {filteredCommunities.length}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
            className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-frosted-blue-500"
          />

          <MarkdownEditor
            value={body}
            onChange={setBody}
            placeholder="Write something..."
            className="min-h-50"
          />

          <div>
              <div className="flex flex-wrap gap-2 mb-2">
                {tagsArr.map((t) => (
                  <TagChip
                    key={t}
                    label={t}
                    removable
                    onRemove={() => setTagsArr(prev => prev.filter(x => x !== t))}
                  />
                ))}
              </div>
            <input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === ' ' || e.key === 'Spacebar' || e.key === 'Enter') {
                  e.preventDefault();
                  const val = tagInput.trim();
                  if (val) {
                    setTagsArr(prev => prev.includes(val) ? prev : [...prev, val]);
                    setTagInput('');
                  }
                }
              }}
              placeholder="Press space to add tag"
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none"
            />
          </div>

          {/* Attachments preview */}
          {files.length > 0 && (
            <div className="space-y-2 rounded-md border border-dashed border-border p-3 bg-muted/20">
              <div className="text-xs font-medium text-muted-foreground mb-2">
                Attachments ({files.length})
              </div>
              <div className="grid grid-cols-2 gap-2">
                {files.map((file, idx) => {
                  const key = `${file.name}-${file.size}`;
                  const preview = filePreviews[key];
                  const isImage = file.type.startsWith('image/');

                  return (
                    <div
                      key={`${key}-${idx}`}
                      className="relative group rounded-lg overflow-hidden bg-background border border-border hover:border-frosted-blue-500 transition-all"
                    >
                      {isImage && preview ? (
                        <img
                          src={preview}
                          alt={file.name}
                          className="w-full h-20 object-cover"
                        />
                      ) : (
                        <div className="w-full h-20 flex flex-col items-center justify-center bg-muted/50">
                          <FileIcon size={20} className="text-muted-foreground mb-1" />
                          <span className="text-xs text-muted-foreground truncate px-1 text-center">
                            {file.name.length > 12 ? `${file.name.slice(0, 12)}...` : file.name}
                          </span>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => removeFile(idx)}
                        className="absolute top-1 right-1 p-1 rounded-full bg-red-500/90 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                        aria-label="Remove file"
                      >
                        <X className="w-3 h-3" />
                      </button>

                      <div className="absolute bottom-0 left-0 right-0 px-1 py-0.5 bg-black/40 text-white text-xs truncate">
                        {formatFileSize(file.size)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-muted cursor-pointer text-sm text-muted-foreground">
              <input type="file" className="hidden" onChange={onPickFile} multiple />
              <ImageIcon className="w-4 h-4" /> Image / File
            </label>

            <div className="flex items-center gap-2">
              <button
                type="button"
                className="px-3 py-2 text-sm rounded-md hover:bg-muted"
                onClick={() => setExpanded(false)}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={!canSubmit || submitting}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-white text-sm transition-colors ${canSubmit && !submitting ? 'bg-turf-green-600 hover:bg-turf-green-700' : 'bg-muted text-muted-foreground cursor-not-allowed'}`}
              >
                <Send className="w-4 h-4" />
                {submitting ? 'Posting...' : 'Post'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreatePostWidget;
