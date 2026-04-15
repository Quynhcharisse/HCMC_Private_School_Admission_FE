import React from "react";
import {useEditor, EditorContent} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import {Box, Divider, IconButton, Popover, Tooltip} from "@mui/material";
import FormatBoldIcon from "@mui/icons-material/FormatBold";
import FormatItalicIcon from "@mui/icons-material/FormatItalic";
import FormatUnderlinedIcon from "@mui/icons-material/FormatUnderlined";
import FormatListBulletedIcon from "@mui/icons-material/FormatListBulleted";
import FormatListNumberedIcon from "@mui/icons-material/FormatListNumbered";
import EmojiEmotionsOutlinedIcon from "@mui/icons-material/EmojiEmotionsOutlined";
import {APP_PRIMARY_MAIN} from "../../constants/homeLandingTheme";

const COMMON_EMOJIS = [
    "📢",
    "🔔",
    "⚠️",
    "🛠️",
    "📅",
    "📍",
    "👉",
    "✅",
    "📩",
    "🔗",
    "🎉",
    "🥳",
    "🎆",
    "✨",
    "🌟",
    "🏆",
    "🏅",
    "🎓",
    "📜",
    "❤️",
    "🔥",
    "📁",
    "📄",
    "📰",
    "📚",
    "📖",
    "📝",
    "🖊️",
    "✏️",
    "📊",
    "📋",
    "📲",
    "💻",
    "🌐",
    "📧",
    "📞",
    "🤝",
    "⚙️",
    "🎨",
    "🎬",
    "🎤",
    "⚽",
    "🏀",
    "🧑‍🏫",
    "🧑‍🎓",
    "🏫",
    "🌟"
];

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
    const [emojiAnchorEl, setEmojiAnchorEl] = React.useState(null);

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

    const emojiPickerOpen = Boolean(emojiAnchorEl);
    const emojiPickerId = emojiPickerOpen ? "create-post-emoji-picker" : undefined;

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
                <Divider orientation="vertical" flexItem sx={{mx: 0.5, borderColor: "rgba(59, 130, 246, 0.2)"}} />
                <Tooltip title="Chèn emoji" placement="top" enterDelay={400}>
                    <span>
                        <IconButton
                            type="button"
                            size="small"
                            disabled={disabled}
                            aria-label="Chèn emoji"
                            aria-describedby={emojiPickerId}
                            onClick={(e) => setEmojiAnchorEl((prev) => (prev ? null : e.currentTarget))}
                            sx={toolbarBtnSx(emojiPickerOpen)}
                        >
                            <EmojiEmotionsOutlinedIcon fontSize="small" />
                        </IconButton>
                    </span>
                </Tooltip>
            </Box>
            <Popover
                id={emojiPickerId}
                open={emojiPickerOpen}
                anchorEl={emojiAnchorEl}
                onClose={() => setEmojiAnchorEl(null)}
                anchorOrigin={{vertical: "top", horizontal: "right"}}
                transformOrigin={{vertical: "top", horizontal: "left"}}
                slotProps={{
                    paper: {
                        sx: {
                            ml: 1,
                            p: 1,
                            borderRadius: "10px",
                            border: "1px solid rgba(59, 130, 246, 0.24)",
                            bgcolor: "#ffffff",
                            boxShadow: "0 14px 34px rgba(15, 23, 42, 0.16)",
                            maxHeight: 320,
                            overflowY: "auto"
                        }
                    }
                }}
            >
                <Box
                    id={emojiPickerId}
                    sx={{
                        display: "grid",
                        gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
                        gap: 0.5,
                        width: 240
                    }}
                >
                    {COMMON_EMOJIS.map((emoji, idx) => (
                        <IconButton
                            key={`${emoji}-${idx}`}
                            size="small"
                            onClick={() => {
                                editor.chain().focus().insertContent(emoji).run();
                                setEmojiAnchorEl(null);
                            }}
                            sx={{
                                borderRadius: "8px",
                                fontSize: "1.2rem",
                                opacity: 1,
                                color: "#0f172a",
                                fontFamily: '"Segoe UI Emoji","Noto Color Emoji","Apple Color Emoji",sans-serif',
                                filter: "saturate(1.2) contrast(1.08)",
                                "&:hover": {bgcolor: "rgba(59, 130, 246, 0.1)"}
                            }}
                        >
                            {emoji}
                        </IconButton>
                    ))}
                </Box>
            </Popover>
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
