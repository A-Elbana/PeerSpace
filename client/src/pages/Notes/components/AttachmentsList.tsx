import React from 'react'
import { File, Image, Video, FileText, Trash2, ExternalLink } from 'lucide-react'

type Attachment = {
    id: string
    secure_url?: string
    name?: string
    resource_type?: string
}

type Props = {
    files: Attachment[]
    onDelete?: (id: string, name?: string) => Promise<void> | void
    className?: string
    isDeleting?: boolean
    deletingId?: string
}

const getIcon = (file: Attachment) => {
    const t = (file.resource_type || '').toLowerCase()
    const name = (file.name || '').toLowerCase()
    if (t.startsWith('image') || name.match(/\.(png|jpe?g|gif|webp)$/)) return <Image className="w-5 h-5 text-sky-500" />
    if (t.startsWith('video') || name.match(/\.(mp4|webm|mov)$/)) return <Video className="w-5 h-5 text-rose-500" />
    if (name.match(/\.(txt|md|rtf)$/) || t === 'text') return <FileText className="w-5 h-5 text-emerald-500" />
    return <File className="w-5 h-5 text-muted-foreground" />
}

const fileExtension = (name?: string) => {
    if (!name) return ''
    const parts = name.split('.')
    return parts.length > 1 ? parts[parts.length - 1].toUpperCase() : ''
}

function AttachmentItem({ f, onDelete, isDeleting, deletingId }: { f: Attachment; onDelete?: Props['onDelete']; isDeleting?: boolean; deletingId?: string }) {
    const ext = fileExtension(f.name)

    const handleOpen = (e: React.MouseEvent) => {
        e.preventDefault()
        if (f.secure_url) window.open(f.secure_url, '_blank', 'noopener')
    }

    return (
        <div
            key={f.id}
            className="grid grid-cols-[auto_1fr_72px] items-start gap-4 px-3 py-3 hover:bg-muted/20 transition-colors group cursor-default rounded-md"
            tabIndex={0}
            aria-label={`Attachment ${f.name || f.id}`}
        >
            <div className="flex items-center justify-center w-10 h-10 rounded-md bg-muted/10 mt-1">{getIcon(f)}</div>

            <div className="min-w-0">
                <a href={f.secure_url} target="_blank" rel="noreferrer" onClick={handleOpen} className="font-medium block truncate">{f.name || f.id}</a>

                <div className="mt-2 flex items-center gap-3">
                    <a href={f.secure_url} target="_blank" rel="noreferrer" onClick={handleOpen} className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground">
                        <ExternalLink className="w-4 h-4" />
                        <span>Open</span>
                    </a>

                    <button
                        onClick={() => onDelete?.(f.id, f.name)}
                        disabled={isDeleting && deletingId === f.id}
                        className={`inline-flex items-center gap-2 rounded px-2 py-1 text-xs ${isDeleting && deletingId === f.id ? 'text-slate-400 bg-red-50' : 'text-slate-600 hover:bg-red-50 hover:text-red-600'}`}
                        title="Remove attachment"
                        aria-label={`Remove ${f.name || f.id}`}
                    >
                        {isDeleting && deletingId === f.id ? (
                            <>
                                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10" strokeWidth="3" strokeOpacity="0.25"/><path d="M22 12a10 10 0 00-10-10" strokeWidth="3" strokeLinecap="round"/></svg>
                                <span>Removing</span>
                            </>
                        ) : (
                            <>
                                <Trash2 className="w-4 h-4" />
                                <span>Remove</span>
                            </>
                        )}
                    </button>
                </div>
            </div>

            <div className="ml-2 flex items-center justify-end">
                <div className="rounded bg-muted/10 px-2 py-1 text-xs font-medium text-slate-700">{ext}</div>
            </div>
        </div>
    )
}

const AttachmentsList: React.FC<Props> = ({ files, onDelete, className, isDeleting, deletingId }) => {
    if (!files || files.length === 0) return null

    return (
        <div className={`border border-border rounded-lg p-2 bg-card/50 ${className || ''}`}>
            <div className="flex items-center justify-between mb-3 px-3">
                <div className="flex items-center gap-2">
                    <ExternalLink className="w-6 h-6 text-muted-foreground" />
                    <h4 className="text-base md:text-lg font-semibold">Attachments</h4>
                </div>
            </div>

            <div className="h-[640px] max-h-[80vh] overflow-y-auto">
                <div className="flex flex-col">
                    {files.map((f) => (
                        <AttachmentItem key={f.id} f={f} onDelete={onDelete} isDeleting={isDeleting} deletingId={deletingId} />
                    ))}
                </div>
            </div>
        </div>
    )
}

export default AttachmentsList
