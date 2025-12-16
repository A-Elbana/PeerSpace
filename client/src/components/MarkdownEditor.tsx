import React, { useEffect } from 'react';
import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from 'tiptap-markdown';
import Placeholder from '@tiptap/extension-placeholder';
import { cn } from '@/lib/utils';
import {
    Bold,
    Italic,
    Strikethrough,
    Heading1,
    Heading2,
    Heading3,
    List,
    ListOrdered,
    Quote,
    Code,
    Undo,
    Redo,
    Code2
} from 'lucide-react';

// Ensure link styling is injected once so tiptap-rendered anchors pick up our color.
const LINK_STYLE_ID = 'md-editor-link-style';
function ensureLinkStyle() {
    if (typeof document === 'undefined') return;
    if (document.getElementById(LINK_STYLE_ID)) return;
    const s = document.createElement('style');
    s.id = LINK_STYLE_ID;
    s.innerHTML = `
        .markdown-links a { color: rgb(61, 181, 194) !important; text-decoration: underline !important; cursor: pointer !important; position: relative !important; }
        .markdown-links a:hover { color: rgb(49, 144, 155) !important; }
        
        .markdown-links a[data-href]:hover::after { opacity: 1; }
    `;
    document.head.appendChild(s);
}

// Annotate anchors with a data-href attribute and title so tooltip CSS can show the target URL
function annotateLinks() {
    if (typeof document === 'undefined') return;
    const nodes = document.querySelectorAll('.markdown-links a');
    nodes.forEach((n) => {
        const a = n as HTMLAnchorElement;
        try {
            const href = a.getAttribute('href') || a.href || '';
            if (href) {
                a.setAttribute('data-href', href);
                if (!a.getAttribute('title')) a.setAttribute('title', href);
            }
        } catch (e) {
            // ignore
        }
    });
}

// Fallback for cn if it doesn't exist


interface MarkdownEditorProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    style?: React.CSSProperties;
}

interface MenuButtonProps {
    onClick: () => void;
    isActive?: boolean;
    disabled?: boolean;
    children: React.ReactNode;
    title?: string;
}

const MenuButton: React.FC<MenuButtonProps> = ({
    onClick,
    isActive,
    disabled,
    children,
    title
}) => (
    <button
        onClick={onClick}
        disabled={disabled}
        title={title}
        className={cn(
            "p-2 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground",
            isActive && "bg-muted text-foreground font-medium",
            disabled && "opacity-50 cursor-not-allowed"
        )}
        type="button"
    >
        {children}
    </button>
);

const MenuBar = ({ editor }: { editor: Editor | null }) => {
    if (!editor) {
        return null;
    }

    return (
        <div className="flex flex-wrap items-center gap-1 p-2 border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10 w-full rounded-t-xl">
            <MenuButton
                onClick={() => editor.chain().focus().toggleBold().run()}
                disabled={!editor.can().chain().focus().toggleBold().run()}
                isActive={editor.isActive('bold')}
                title="Bold"
            >
                <Bold size={16} />
            </MenuButton>
            <MenuButton
                onClick={() => editor.chain().focus().toggleItalic().run()}
                disabled={!editor.can().chain().focus().toggleItalic().run()}
                isActive={editor.isActive('italic')}
                title="Italic"
            >
                <Italic size={16} />
            </MenuButton>
            <MenuButton
                onClick={() => editor.chain().focus().toggleStrike().run()}
                disabled={!editor.can().chain().focus().toggleStrike().run()}
                isActive={editor.isActive('strike')}
                title="Strikethrough"
            >
                <Strikethrough size={16} />
            </MenuButton>

            <div className="w-px h-6 bg-border mx-1" />

            <MenuButton
                onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                isActive={editor.isActive('heading', { level: 1 })}
                title="Heading 1"
            >
                <Heading1 size={16} />
            </MenuButton>
            <MenuButton
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                isActive={editor.isActive('heading', { level: 2 })}
                title="Heading 2"
            >
                <Heading2 size={16} />
            </MenuButton>
            <MenuButton
                onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                isActive={editor.isActive('heading', { level: 3 })}
                title="Heading 3"
            >
                <Heading3 size={16} />
            </MenuButton>

            <div className="w-px h-6 bg-border mx-1" />

            <MenuButton
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                isActive={editor.isActive('bulletList')}
                title="Bullet List"
            >
                <List size={16} />
            </MenuButton>
            <MenuButton
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                isActive={editor.isActive('orderedList')}
                title="Ordered List"
            >
                <ListOrdered size={16} />
            </MenuButton>

            <div className="w-px h-6 bg-border mx-1" />

            <MenuButton
                onClick={() => editor.chain().focus().toggleCode().run()}
                isActive={editor.isActive('code')}
                title="Code"
            >
                <Code size={16} />
            </MenuButton>
            <MenuButton
                onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                isActive={editor.isActive('codeBlock')}
                title="Code Block"
            >
                <Code2 size={16} />
            </MenuButton>
            <MenuButton
                onClick={() => editor.chain().focus().toggleBlockquote().run()}
                isActive={editor.isActive('blockquote')}
                title="Blockquote"
            >
                <Quote size={16} />
            </MenuButton>

            <div className="w-px h-6 bg-border mx-1" />

            <MenuButton
                onClick={() => editor.chain().focus().undo().run()}
                disabled={!editor.can().chain().focus().undo().run()}
                title="Undo"
            >
                <Undo size={16} />
            </MenuButton>
            <MenuButton
                onClick={() => editor.chain().focus().redo().run()}
                disabled={!editor.can().chain().focus().redo().run()}
                title="Redo"
            >
                <Redo size={16} />
            </MenuButton>
        </div>
    );
};

export const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
    value,
    onChange,
    placeholder,
    className,
    style,
}) => {
    const editor = useEditor({
        extensions: [
            StarterKit,
            Markdown.configure({
                html: false, // Force markdown output
                transformPastedText: true,
                transformCopiedText: true,
            }),
            Placeholder.configure({
                placeholder: placeholder || 'Write something...',
            }),
        ],
        content: value, // Initial content
        editorProps: {
            attributes: {
                class: cn(
                    'prose prose-sm sm:prose-base dark:prose-invert focus:outline-none max-w-none min-h-[300px] p-4',
                    // Manual typography overrides in case prose plugin is missing
                    '[&_h1]:text-3xl [&_h1]:font-bold [&_h1]:mb-4',
                    '[&_h2]:text-2xl [&_h2]:font-bold [&_h2]:mb-3',
                    '[&_h3]:text-xl [&_h3]:font-bold [&_h3]:mb-2',
                    '[&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-4',
                    '[&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-4',
                    '[&_blockquote]:border-l-4 [&_blockquote]:border-frosted-blue-500 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:my-4',
                    '[&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:font-mono [&_code]:text-sm',
                    '[&_pre]:bg-muted [&_pre]:p-4 [&_pre]:rounded-lg [&_pre]:my-4 [&_pre_code]:bg-transparent [&_pre_code]:p-0',
                    className,
                    'markdown-links'
                ),
            },
        },
        onUpdate: ({ editor }) => {
            const markdownOutput = (editor.storage as { markdown?: { getMarkdown: () => string } }).markdown?.getMarkdown() || '';
            onChange(markdownOutput);
        },
    });

    // Update editor content if value changes externally
    useEffect(() => {
        // inject link style so anchors inside tiptap get the correct color
        ensureLinkStyle();
        if (editor && value !== (editor.storage as any).markdown.getMarkdown()) {
            // We use standard setContent, trusting that Markdown extension patches it or we might need a workaround if not.
            // But typically with tiptap-markdown, we might need to parse, but let's try setContent first.
            // If the user types, onUpdate fires, onChange fires, value updates. value == getMarkdown(). No loop.
            // If parent resets value, value != getMarkdown(). setContent(value).
            editor.commands.setContent(value);
        }
        // annotate any anchors rendered by tiptap so tooltip shows
        annotateLinks();
    }, [value, editor]);

    if (!editor) {
        return null;
    }

    return (
        <div
            className="flex flex-col w-full border border-border rounded-xl bg-card overflow-hidden shadow-sm"
            style={style}
        >
            <MenuBar editor={editor} />
            <div className="flex-1 overflow-auto bg-background">
                <EditorContent editor={editor} className="h-full" />
            </div>

            {/* Optional: Status bar or char count could go here */}
        </div>
    );
};

// Read-only Markdown Preview component
interface MarkdownPreviewProps {
    content: string;
    className?: string;
}

export const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({ content, className }) => {
    const editor = useEditor({
        extensions: [
            StarterKit,
            Markdown.configure({
                html: false,
                transformPastedText: false,
                transformCopiedText: false,
            }),
        ],
        content: content,
        editable: false,
        editorProps: {
            attributes: {
                class: cn(
                    'prose prose-sm sm:prose-base dark:prose-invert max-w-none',
                    '[&_h1]:text-3xl [&_h1]:font-bold [&_h1]:mb-4',
                    '[&_h2]:text-2xl [&_h2]:font-bold [&_h2]:mb-3',
                    '[&_h3]:text-xl [&_h3]:font-bold [&_h3]:mb-2',
                    '[&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-4',
                    '[&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-4',
                    '[&_blockquote]:border-l-4 [&_blockquote]:border-frosted-blue-500 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:my-4',
                    '[&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:font-mono [&_code]:text-sm',
                    '[&_pre]:bg-muted [&_pre]:p-4 [&_pre]:rounded-lg [&_pre]:my-4 [&_pre_code]:bg-transparent [&_pre_code]:p-0',
                    className,
                    'markdown-links'
                ),
            },
        },
    });

    // Update content when it changes
    useEffect(() => {
        ensureLinkStyle();
        if (editor && content !== editor.getText()) {
            editor.commands.setContent(content);
        }
        annotateLinks();
    }, [content, editor]);

    if (!editor) {
        return null;
    }

    return <EditorContent editor={editor} />;
};