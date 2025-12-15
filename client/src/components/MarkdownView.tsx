import React from 'react';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';

interface MarkdownViewProps {
    content: string;
    className?: string;
    truncate?: boolean; // Option to truncate content (e.g., for previews)
}

export const MarkdownView: React.FC<MarkdownViewProps> = ({ content, className, truncate }) => {
    // Styles copied from MarkdownEditor.tsx to ensure consistency
    const markdownStyles = cn(
        'prose prose-sm sm:prose-base dark:prose-invert max-w-none',
        // Manual typography overrides
        '[&_h1]:text-3xl [&_h1]:font-bold [&_h1]:mb-4',
        '[&_h2]:text-2xl [&_h2]:font-bold [&_h2]:mb-3',
        '[&_h3]:text-xl [&_h3]:font-bold [&_h3]:mb-2',
        '[&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-4',
        '[&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-4',
        '[&_blockquote]:border-l-4 [&_blockquote]:border-primary [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:my-4',
        '[&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:font-mono [&_code]:text-sm',
        '[&_pre]:bg-muted [&_pre]:p-4 [&_pre]:rounded-lg [&_pre]:my-4 [&_pre_code]:bg-transparent [&_pre_code]:p-0',
        className
    );

    if (truncate) {
        return (
            <div className={cn(markdownStyles, "line-clamp-3")}>
                {/*  We render specific markdown elements for truncated view to avoid breaking layout, 
                      or just simple ReactMarkdown with a wrapper that clamps. 
                      However, line-clamp on rich HTML structure (h1, etc) might behave oddly.
                      For safety in feeds, we might just want to render text. 
                      But user asked for markdown. Let's try clamping the container. */}
                <ReactMarkdown>{content}</ReactMarkdown>
            </div>
        );
    }

    return (
        <div className={markdownStyles}>
            <ReactMarkdown>{content}</ReactMarkdown>
        </div>
    );
};
