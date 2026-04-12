import React from "react";
import {useEditor, EditorContent} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import {Box, Divider, IconButton, Tooltip} from "@mui/material";
import FormatBoldIcon from "@mui/icons-material/FormatBold";
import FormatItalicIcon from "@mui/icons-material/FormatItalic";
import FormatUnderlinedIcon from "@mui/icons-material/FormatUnderlined";
import FormatListBulletedIcon from "@mui/icons-material/FormatListBulleted";
import FormatListNumberedIcon from "@mui/icons-material/FormatListNumbered";
import {APP_PRIMARY_MAIN} from "../../constants/homeLandingTheme";

const toolbarBtnSx = (active) => ({
    borderRadius: "8px",
    color: active ? APP_PRIMARY_MAIN : "rgba(30, 41, 59, 0.65)",
    bgcolor: active ? "rgba(59, 130, 246, 0.12)" : "transparent",
    "&:hover": {
        bgcolor: active ? "rgba(59, 130, 246, 0.18)" : "rgba(59, 130, 246, 0.08)"
    }
});

export default function CreatePostRichTextEditor({
    initialHtml = "",
    onChange,
    disabled = false,
    minEditorHeight = 220,
    maxEditorHeight = 360,
    fillHeight = false
}) {
    const onChangeRef = React.useRef(onChange);
    onChangeRef.current = onChange;

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: false,
                blockquote: false,
                codeBlock: false,
                horizontalRule: false,
                strike: false,
                code: false
            }),
            Underline
        ],
        content: initialHtml?.trim() ? initialHtml : "<p></p>",
        editable: !disabled,
        onUpdate: ({editor: ed}) => {
            onChangeRef.current(ed.getHTML());
        }
    });

    React.useEffect(() => {
        if (editor) editor.setEditable(!disabled);
    }, [disabled, editor]);

    if (!editor) {
        return null;
    }

    return (
        <Box
            sx={{
                border: `1px solid rgba(59, 130, 246, 0.22)`,
                borderRadius: "10px",
                overflow: "hidden",
                bgcolor: "#ffffff",
                ...(fillHeight
                    ? {
                          flex: 1,
                          minHeight: 0,
                          display: "flex",
                          flexDirection: "column",
                          height: "100%"
                      }
                    : {})
            }}
        >
            <Box
                sx={{
                    display: "flex",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 0.25,
                    px: 0.75,
                    py: 0.5,
                    borderBottom: `1px solid rgba(59, 130, 246, 0.15)`,
                    bgcolor: "#f8fbff",
                    flexShrink: 0
                }}
            >
                <Tooltip title="Chữ đậm" placement="top" enterDelay={400}>
                    <span>
                        <IconButton
                            type="button"
                            size="small"
                            disabled={disabled}
                            onClick={() => editor.chain().focus().toggleBold().run()}
                            aria-label="Chữ đậm"
                            sx={toolbarBtnSx(editor.isActive("bold"))}
                        >
                            <FormatBoldIcon fontSize="small" />
                        </IconButton>
                    </span>
                </Tooltip>
                <Tooltip title="Chữ nghiêng" placement="top" enterDelay={400}>
                    <span>
                        <IconButton
                            type="button"
                            size="small"
                            disabled={disabled}
                            onClick={() => editor.chain().focus().toggleItalic().run()}
                            aria-label="Chữ nghiêng"
                            sx={toolbarBtnSx(editor.isActive("italic"))}
                        >
                            <FormatItalicIcon fontSize="small" />
                        </IconButton>
                    </span>
                </Tooltip>
                <Tooltip title="Gạch chân" placement="top" enterDelay={400}>
                    <span>
                        <IconButton
                            type="button"
                            size="small"
                            disabled={disabled}
                            onClick={() => editor.chain().focus().toggleUnderline().run()}
                            aria-label="Gạch chân"
                            sx={toolbarBtnSx(editor.isActive("underline"))}
                        >
                            <FormatUnderlinedIcon fontSize="small" />
                        </IconButton>
                    </span>
                </Tooltip>
                <Divider orientation="vertical" flexItem sx={{mx: 0.5, borderColor: "rgba(59, 130, 246, 0.2)"}} />
                <Tooltip title="Danh sách dấu đầu dòng" placement="top" enterDelay={400}>
                    <span>
                        <IconButton
                            type="button"
                            size="small"
                            disabled={disabled}
                            onClick={() => editor.chain().focus().toggleBulletList().run()}
                            aria-label="Danh sách dấu đầu dòng"
                            sx={toolbarBtnSx(editor.isActive("bulletList"))}
                        >
                            <FormatListBulletedIcon fontSize="small" />
                        </IconButton>
                    </span>
                </Tooltip>
                <Tooltip title="Danh sách đánh số" placement="top" enterDelay={400}>
                    <span>
                        <IconButton
                            type="button"
                            size="small"
                            disabled={disabled}
                            onClick={() => editor.chain().focus().toggleOrderedList().run()}
                            aria-label="Danh sách đánh số"
                            sx={toolbarBtnSx(editor.isActive("orderedList"))}
                        >
                            <FormatListNumberedIcon fontSize="small" />
                        </IconButton>
                    </span>
                </Tooltip>
            </Box>
            <Box
                sx={{
                    ...(fillHeight
                        ? {
                              flex: 1,
                              minHeight: 0,
                              overflowY: "auto"
                          }
                        : {}),
                    "& .ProseMirror": {
                        minHeight: minEditorHeight,
                        maxHeight: fillHeight ? "none" : maxEditorHeight,
                        overflowY: "auto",
                        px: 1.5,
                        py: 1.25,
                        outline: "none",
                        color: "rgba(30, 41, 59, 0.92)",
                        fontSize: "0.9375rem",
                        lineHeight: 1.6,
                        "& p": {margin: "0.35em 0"},
                        "& ul, & ol": {paddingLeft: "1.5rem", margin: "0.35em 0"},
                        "& a": {color: APP_PRIMARY_MAIN}
                    },
                    "& .ProseMirror-focused": {
                        outline: "none"
                    }
                }}
            >
                <EditorContent editor={editor} />
            </Box>
        </Box>
    );
}
