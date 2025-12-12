import { Editable, useEditor } from "@wysimark/react";
import React from "react";

interface MarkdownEditorProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    style?: React.CSSProperties;
}

export const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
    value,
    onChange,
    placeholder,
    className,
    style,
}) => {
    const editor = useEditor({});

    return (
        <Editable
            editor={editor}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            className={className}
            style={style}
        />
    );
};
