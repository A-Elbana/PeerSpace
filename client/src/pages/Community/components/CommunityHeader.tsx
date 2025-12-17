import React, { useEffect, useState, useRef } from 'react';
import { Users, FileText, Globe, Lock, Copy, Check, X, Link } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/services/api';
import './CommunityHeader.css';

interface CommunityHeaderProps {
  name: string;
  id: string;
  description: string | null;
  type: 'PUBLIC' | 'PRIVATE';
  memberCount: number;
  postCount: number;
  bannerUrl?: string | null;
  isInstructor?: boolean;
  isEnrolled?: boolean;
  onEnroll?: () => void;
  onLeave?: () => void;
  userRole?: 'student' | 'instructor' | 'admin';
}

const CommunityHeader: React.FC<CommunityHeaderProps> = ({
  name,
  id,
  description,
  type,
  memberCount,
  postCount,
  bannerUrl,
  isInstructor = false,
  isEnrolled = false,
  onEnroll,
  onLeave,
  userRole,
}) => {
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [resolvedBannerUrl, setResolvedBannerUrl] = useState<string | null>(bannerUrl ?? null);
  const [session, setSession] = useState<any | null>(null);
  const [showSessionHover, setShowSessionHover] = useState(false);
  const hoverHideTimeout = useRef<number | null>(null);
  const [localStartTime, setLocalStartTime] = useState<string | null>(null);
  const [isUpdatingSession, setIsUpdatingSession] = useState(false);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [sessionForm, setSessionForm] = useState({ title: '', meet_url: '', start_time_local: '' });
  // Validation errors
  const [formErrors, setFormErrors] = useState<{ title?: string; meet_url?: string; start_time_local?: string }>({});

  const validateForm = (f: { title: string; meet_url: string; start_time_local: string }) => {
    const errors: { title?: string; meet_url?: string; start_time_local?: string } = {};
    if (!f.title || f.title.trim() === '') errors.title = 'Title is required';
    try {
      // Accept full URLs or protocol-less hostnames (e.g. example.com)
      // Try parsing as-is, otherwise attempt with https:// prepended for validation only
      try {
        new URL(f.meet_url);
      } catch (e) {
        new URL(`https://${f.meet_url}`);
      }
    } catch (e) {
      errors.meet_url = 'Please provide a valid URL';
    }
    if (!f.start_time_local) {
      errors.start_time_local = 'Start time is required';
    } else {
      const t = new Date(f.start_time_local).getTime();
      if (isNaN(t) || t <= Date.now()) errors.start_time_local = 'Start time must be in the future';
    }
    return errors;
  };

  const liveErrors = validateForm(sessionForm);
  const isFormValid = Object.keys(liveErrors).length === 0;
  const [isSavingSession, setIsSavingSession] = useState(false);
  const [isDeletingSession, setIsDeletingSession] = useState(false);

  const sessionIsLive = !!(session && session.start_time && new Date(session.start_time).getTime() <= Date.now());
  const normalizedSessionUrl = session?.meet_url
    ? (session.meet_url.startsWith('http://') || session.meet_url.startsWith('https://')
        ? session.meet_url
        : `https://${session.meet_url}`)
    : null;

  // Hover handlers keep the hover card visible when hovering either the badge or the card
  const handleHoverEnter = () => {
    if (hoverHideTimeout.current) {
      window.clearTimeout(hoverHideTimeout.current);
      hoverHideTimeout.current = null;
    }
    setShowSessionHover(true);
  };

  const handleHoverLeave = () => {
    if (hoverHideTimeout.current) window.clearTimeout(hoverHideTimeout.current);
    // Slightly longer delay so the user can move between badge and card without flicker
    hoverHideTimeout.current = window.setTimeout(() => {
      setShowSessionHover(false);
      hoverHideTimeout.current = null;
    }, 300);
  };

  useEffect(() => {
    return () => {
      if (hoverHideTimeout.current) window.clearTimeout(hoverHideTimeout.current);
    };
  }, []);

  useEffect(() => {
    const isUrl = (v?: string | null) => !!v && (v.startsWith('http://') || v.startsWith('https://'));
    if (!bannerUrl) {
      if (resolvedBannerUrl !== null) setResolvedBannerUrl(null);
      return;
    }
    if (isUrl(bannerUrl)) {
      setResolvedBannerUrl(bannerUrl);
      return;
    }
    // bannerUrl is actually a File UUID; fetch its secure_url
    (async () => {
      try {
        const res = await api.get(`/files/${bannerUrl}`);
        const file = res.data?.data;
        const url: string | undefined = file?.signed_url || file?.secure_url;
        setResolvedBannerUrl(url ?? null);
      } catch (err) {
        console.error('Failed to resolve banner file URL', err);
        setResolvedBannerUrl(null);
      }
    })();
  }, [bannerUrl]);

  // Fetch session info when user can see it (enrolled or instructor)
  useEffect(() => {
    const fetchSession = async () => {
      if (!isEnrolled && !isInstructor) return;
      try {
        const res = await api.get(`/sessions?cid=${id}`);
        const s = res.data?.data ?? res.data; // tolerate different shapes
        if (s) {
          setSession(s);
          setLocalStartTime(s.start_time ? new Date(s.start_time).toISOString().slice(0, 16) : null);
        } else {
          setSession(null);
        }
      } catch (err: any) {
        // ignore 404/no session
        if (err.response && err.response.status !== 404) console.error('Failed to fetch session', err);
      }
    };

    fetchSession();
    // Optionally refresh occasionally if needed
  }, [id, isEnrolled, isInstructor]);

  const handleSaveStartTime = async () => {
    if (!isInstructor || !localStartTime) return;
    try {
      setIsUpdatingSession(true);
      // Convert local datetime-local value to ISO
      const iso = new Date(localStartTime).toISOString();
      await api.put(`/sessions/${id}`, { start_time: iso });
      toast.success('Session start time updated');
      // refresh session
      const res = await api.get(`/sessions?cid=${id}`);
      const s = res.data?.data ?? res.data;
      setSession(s ?? null);
    } catch (err) {
      console.error('Failed to update session', err);
      toast.error('Failed to update session');
    } finally {
      setIsUpdatingSession(false);
    }
  };

  const handleCopyId = async () => {
    try {
      await navigator.clipboard.writeText(id);
      setCopied(true);
      toast.success('Community ID copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy ID');
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      toast.success('Community link copied');
      setTimeout(() => setCopiedLink(false), 1800);
    } catch {
      toast.error('Failed to copy link');
    }
  };

  const openSessionModal = () => {
    setSessionForm({
      title: session?.title ?? '',
      meet_url: session?.meet_url ?? '',
      start_time_local: session?.start_time ? new Date(session.start_time).toISOString().slice(0, 16) : ''
    });
    setShowSessionModal(true);
  };

  const closeSessionModal = () => {
    setShowSessionModal(false);
  };

  const handleSaveSession = async () => {
    // Validate before sending using shared validator
    const errors = validateForm(sessionForm);
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) {
      toast.error('Please fix validation errors');
      return;
    }
    try {
      setIsSavingSession(true);
      const payload: any = {
        title: sessionForm.title,
        meet_url: sessionForm.meet_url
      };
      if (sessionForm.start_time_local) payload.start_time = new Date(sessionForm.start_time_local).toISOString();

      if (session) {
        // update
        const res = await api.put(`/sessions/${id}`, payload);
        const s = res.data?.data ?? res.data;
        setSession(s ?? null);
        toast.success('Session updated');
      } else {
        // create
        const res = await api.post(`/sessions`, { cid: id, ...payload });
        const s = res.data?.data ?? res.data;
        setSession(s ?? null);
        toast.success('Session created');
      }
      setShowSessionModal(false);
    } catch (err) {
      console.error('Failed to save session', err);
      toast.error('Failed to save session');
    } finally {
      setIsSavingSession(false);
    }
  };

  const handleDeleteSession = async () => {
    if (!session) return;
    if (!window.confirm('Are you sure you want to delete this live session?')) return;
    try {
      setIsDeletingSession(true);
      await api.delete(`/sessions/${id}`);
      setSession(null);
      toast.success('Session deleted');
      setShowSessionModal(false);
    } catch (err) {
      console.error('Failed to delete session', err);
      toast.error('Failed to delete session');
    } finally {
      setIsDeletingSession(false);
    }
  };

  return (
    <>
      <div className="mb-6 space-y-0">
        {/* Banner Section */}
        <div className="relative h-48 overflow-hidden rounded-t-2xl border border-b-0 border-border bg-card">
          {resolvedBannerUrl ? (
            <img
              src={resolvedBannerUrl}
              alt={`${name} banner`}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          ) : (
            <div className="w-full h-full bg-linear-to-br from-primary/30 via-teal-400/20 to-indigo-500/25" />
          )}
        </div>

        {/* Content Card */}
        <div className="relative bg-card border border-border rounded-b-2xl shadow-lg shadow-primary/5">
          <div className="p-6 md:p-7 lg:p-8 flex flex-col gap-6">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
              <div className="flex items-start gap-4">
                <div className="h-16 w-16 rounded-xl bg-card border-2 border-primary/25 text-primary font-bold text-2xl flex items-center justify-center shadow-lg -mt-10">
                  {name?.charAt(0)?.toUpperCase()}
                </div>
                <div className="space-y-3 flex-1">
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <h1 className="text-3xl font-bold text-foreground leading-tight">{name}</h1>
                  <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${type === 'PUBLIC'
                    ? 'bg-turf-green-500/20 text-turf-green-700 border-turf-green-500/40'
                    : 'bg-royal-gold-500/20 text-royal-gold-700 border-royal-gold-500/40'
                    }`}>
                    {type === 'PUBLIC' ? <Globe className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                    {type}
                  </span>

                  {session && (isEnrolled || isInstructor) && (
                    <div
                      className="relative inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-card text-xs font-medium text-foreground shadow-sm"
                      onMouseEnter={handleHoverEnter}
                      onMouseLeave={handleHoverLeave}
                    >
                      <div className={`session-dot ${sessionIsLive ? 'live' : 'scheduled'}`}>
                        <span className="outer" aria-hidden />
                        <span className="glow" aria-hidden />
                        <span className="core" aria-hidden />
                      </div>
                      <span className="whitespace-nowrap">{sessionIsLive ? 'Session live' : 'Session scheduled'}</span>

                      <div
                        onMouseEnter={handleHoverEnter}
                        onMouseLeave={handleHoverLeave}
                        className={`absolute left-0 top-full mt-2 w-80 bg-card border border-border rounded-lg p-3 shadow-lg z-50 transition-all duration-300 ease-in-out ${showSessionHover ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-2 pointer-events-none'}`}
                      >
                        <div className="text-sm text-muted-foreground mb-1">{sessionIsLive ? 'A session is live' : 'A live session is scheduled'}</div>
                        <div className="text-base font-semibold text-foreground mb-1">{session.title ?? 'Untitled session'}</div>
                        {session?.start_time && (
                          <div className="text-xs text-muted-foreground mb-3">{new Date(session.start_time).toLocaleString()}</div>
                        )}

                        {normalizedSessionUrl && (
                          <div className="flex items-center gap-2 mb-3">
                            <a
                              href={normalizedSessionUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 inline-flex items-center justify-center px-3 py-1.5 bg-primary/30 text-foreground rounded-md text-sm hover:bg-primary/20"
                            >
                              <Link className="w-4 h-4 mr-2" />Go To Link
                            </a>
                          </div>
                        )}

                        {isInstructor && (
                          <div className="flex items-center gap-2">
                            <input
                              type="datetime-local"
                              value={localStartTime ?? ''}
                              onChange={(e) => setLocalStartTime(e.target.value)}
                              className="flex-1 bg-transparent border border-border rounded px-2 py-1 text-sm text-foreground"
                            />
                            <button
                              onClick={handleSaveStartTime}
                              disabled={isUpdatingSession}
                              className="px-3 py-1 bg-tech-blue-500 text-white rounded text-sm disabled:opacity-60"
                            >
                              Save
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {description && (
                  <p className="text-muted-foreground max-w-3xl leading-relaxed">
                    {description}
                  </p>
                )}

                <div className="flex flex-wrap gap-3">
                  <div className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-muted/50 border border-border text-sm font-medium text-foreground">
                    <Users className="w-4 h-4 text-primary" />
                    <span>{memberCount} members</span>
                  </div>
                  <div className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-muted/50 border border-border text-sm font-medium text-foreground">
                    <FileText className="w-4 h-4 text-primary" />
                    <span>{postCount} posts</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 md:justify-end">
              {!isEnrolled && !isInstructor && userRole !== 'admin' && onEnroll && (
                <button
                  onClick={onEnroll}
                  className="flex items-center gap-2 px-4 py-2 bg-tech-blue-500 hover:bg-tech-blue-600 text-white text-sm font-medium rounded-lg transition-all duration-300 hover:shadow-lg hover:shadow-tech-blue-500/30"
                >
                  Join community
                </button>
              )}

              {isEnrolled && !isInstructor && userRole !== 'admin' && onLeave && (
                <button
                  onClick={onLeave}
                  className="flex items-center gap-2 px-4 py-2 bg-red-500/90 hover:bg-red-600 text-white text-sm font-medium rounded-lg transition-all duration-300"
                >
                  Leave community
                </button>
              )}

              {isInstructor && (
                <button
                  onClick={() => setShowInviteModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-tech-blue-500 hover:bg-tech-blue-600 text-white text-sm font-medium rounded-lg transition-all duration-300 hover:shadow-lg hover:shadow-tech-blue-500/30"
                >
                  <Copy className="w-4 h-4" />
                  Share Community ID
                </button>
              )}

              <button
                onClick={handleCopyLink}
                className="flex items-center gap-2 px-4 py-2 bg-background/60 hover:bg-background text-foreground border border-border rounded-lg text-sm font-medium transition-all duration-200"
              >
                {copiedLink ? <Check className="w-4 h-4 text-turf-green-600" /> : <Link className="w-4 h-4" />}
                {copiedLink ? 'Link copied' : 'Copy link'}
              </button>

              {isInstructor && (
                <button
                  onClick={openSessionModal}
                  className="flex items-center gap-2 px-3 py-2 bg-rose-500 hover:bg-rose-600 text-white text-sm font-medium rounded-lg transition-all duration-300"
                >
                  {session ? 'Edit Live Session' : 'Add Live Session'}
                </button>
              )}
            </div>
          </div>

          {session && (isEnrolled || isInstructor) && (
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 bg-muted/50 border border-border rounded-xl px-4 py-3">
              <div className="flex items-start gap-3">
                <div className={`session-dot ${sessionIsLive ? 'live' : 'scheduled'} mt-0.5`}>
                  <span className="outer" aria-hidden />
                  <span className="glow" aria-hidden />
                  <span className="core" aria-hidden />
                </div>
                <div>
                  <div className="text-sm font-semibold text-foreground">{session.title ?? 'Untitled session'}</div>
                  <div className="text-xs text-muted-foreground">{session.start_time ? new Date(session.start_time).toLocaleString() : 'Start time pending'}</div>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {normalizedSessionUrl && (
                  <a
                    href={normalizedSessionUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/15 text-primary hover:bg-primary/20 text-sm font-semibold"
                  >
                    <Link className="w-4 h-4" />
                    Join session
                  </a>
                )}
              </div>
            </div>
          )}
          </div>
        </div>
      </div>

      {/* Invite Modal */}
          {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background border border-border rounded-xl p-6 w-full max-w-md mx-4 shadow-2xl text-foreground">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-foreground">Share Community ID</h2>
              <button
                onClick={() => setShowInviteModal(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-muted-foreground mb-4">
              Share this ID with students to invite them to join <span className="font-semibold text-foreground">{name}</span>
            </p>

            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg border border-border">
              <input
                type="text"
                value={id}
                readOnly
                className="flex-1 bg-transparent text-sm text-foreground font-mono focus:outline-none truncate"
              />
              <button
                onClick={handleCopyId}
                className={`p-2 rounded-md transition-all ${copied
                  ? 'bg-turf-green-500/20 text-turf-green-600'
                  : 'bg-primary/10 text-primary hover:bg-primary/20'
                  }`}
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            <p className="text-xs text-muted-foreground mt-3">
              Students can use this ID in their dashboard to join the community.
            </p>
          </div>
        </div>
      )}

      {/* Session Modal (Add / Edit) - instructors only */}
      {showSessionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background border border-border rounded-xl p-6 w-full max-w-md mx-4 shadow-2xl text-foreground">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-foreground">{session ? 'Edit Live Session' : 'Add Live Session'}</h2>
              <button onClick={closeSessionModal} className="text-muted-foreground hover:text-foreground transition-colors"><X className="w-5 h-5" /></button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-sm text-muted-foreground block mb-1">Title</label>
                <input
                  type="text"
                  value={sessionForm.title}
                  onChange={(e) => setSessionForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full bg-transparent border border-border rounded px-3 py-2 text-sm text-foreground"
                />
                {(formErrors.title || liveErrors.title) && <p className="text-xs text-red-500 mt-1">{formErrors.title || liveErrors.title}</p>}
              </div>

              <div>
                <label className="text-sm text-muted-foreground block mb-1">Meeting URL</label>
                <input
                  type="url"
                  value={sessionForm.meet_url}
                  onChange={(e) => setSessionForm(prev => ({ ...prev, meet_url: e.target.value }))}
                  className="w-full bg-transparent border border-border rounded px-3 py-2 text-sm text-foreground"
                />
                {(formErrors.meet_url || liveErrors.meet_url) && <p className="text-xs text-red-500 mt-1">{formErrors.meet_url || liveErrors.meet_url}</p>}
              </div>

              <div>
                <label className="text-sm text-muted-foreground block mb-1">Start time</label>
                <input
                  type="datetime-local"
                  value={sessionForm.start_time_local}
                  onChange={(e) => setSessionForm(prev => ({ ...prev, start_time_local: e.target.value }))}
                  className="w-full bg-transparent border border-border rounded px-3 py-2 text-sm text-foreground"
                />
                {(formErrors.start_time_local || liveErrors.start_time_local) && <p className="text-xs text-red-500 mt-1">{formErrors.start_time_local || liveErrors.start_time_local}</p>}
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <div className="flex gap-2">
                <button
                  onClick={handleSaveSession}
                  disabled={!isFormValid || isSavingSession}
                  className="px-4 py-2 bg-tech-blue-500 hover:bg-tech-blue-600 text-white rounded disabled:opacity-60"
                >
                  {isSavingSession ? 'Saving...' : session ? 'Save Changes' : 'Create Session'}
                </button>
                {session && (
                  <button
                    onClick={handleDeleteSession}
                    disabled={isDeletingSession}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded"
                  >
                    {isDeletingSession ? 'Deleting...' : 'Delete'}
                  </button>
                )}
              </div>
              <button onClick={closeSessionModal} className="text-sm text-muted-foreground">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CommunityHeader;
