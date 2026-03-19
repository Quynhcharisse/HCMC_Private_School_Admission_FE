import React, { useMemo, useState } from "react";
import {
  Avatar,
  Box,
  Divider,
  IconButton,
  InputBase,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Paper,
  Typography,
  Tooltip,
  Badge,
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import SearchIcon from "@mui/icons-material/Search";
import MoreVertIcon from "@mui/icons-material/MoreVert";

const mockConversations = [
  {
    id: 1,
    name: "Nguyễn Thị Mai",
    lastMessage: "Cô cho em xin thêm thông tin về chương trình 2 buổi/tuần ạ?",
    time: "Vừa xong",
    unread: 2,
    avatarColor: "#f97316",
  },
  {
    id: 2,
    name: "Trần Văn Long",
    lastMessage: "Dạ em đã nhận được lịch tư vấn, cảm ơn cô.",
    time: "1 giờ trước",
    unread: 0,
    avatarColor: "#6366f1",
  },
  {
    id: 3,
    name: "Lê Hồng Anh",
    lastMessage: "Thầy cho em xin học phí dự kiến giúp em với ạ.",
    time: "3 giờ trước",
    unread: 0,
    avatarColor: "#ec4899",
  },
  {
    id: 4,
    name: "Phạm Minh Khoa",
    lastMessage: "Em sẽ sắp xếp cho bé tới tham quan trường vào tuần sau.",
    time: "Hôm qua",
    unread: 0,
    avatarColor: "#22c55e",
  },
];

const mockMessages = [
  {
    id: 1,
    from: "parent",
    time: "10:15",
    text: "Chào thầy/cô, em muốn tìm hiểu thêm về chương trình học dành cho bé lớp 6.",
  },
  {
    id: 2,
    from: "counsellor",
    time: "10:17",
    text: "Chào anh/chị, em rất vui được hỗ trợ. Anh/chị quan tâm nhiều hơn về chương trình học hay môi trường ngoại khoá ạ?",
  },
  {
    id: 3,
    from: "parent",
    time: "10:19",
    text: "Cả hai ạ, em muốn chương trình không quá nặng mà vẫn giúp bé phát triển tốt.",
  },
  {
    id: 4,
    from: "counsellor",
    time: "10:22",
    text: "Dạ, em sẽ gửi anh/chị lộ trình học chi tiết và một số hoạt động ngoại khoá nổi bật của trường để mình tham khảo thêm nhé.",
  },
];

export default function CounsellorParentConsultation() {
  const [selectedId, setSelectedId] = useState(null);
  const [inputValue, setInputValue] = useState("");

  const selectedConversation = useMemo(
    () => mockConversations.find((c) => c.id === selectedId) || null,
    [selectedId]
  );

  const handleSend = () => {
    if (!inputValue.trim() || !selectedConversation) return;
    setInputValue("");
  };

  return (
    <Box
      sx={{
        height: "calc(100vh - 110px)",
        display: "flex",
        flexDirection: "column",
        bgcolor: "radial-gradient(circle at top left, #dbeafe 0, #eff6ff 35%, #f9fafb 70%, #ffffff 100%)",
        px: { xs: 0, md: 1 },
      }}
    >
      <Box sx={{ mb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, color: "#0f172a", mb: 0.5 }}>
          Tư vấn Phụ Huynh
        </Typography>
      </Box>

      <Paper
        elevation={0}
        sx={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "320px 1fr" },
          borderRadius: 4,
          overflow: "hidden",
          border: "1px solid rgba(59,130,246,0.45)",
          boxShadow: "0 22px 55px rgba(15, 23, 42, 0.14)",
          bgcolor: "rgba(255,255,255,0.98)",
          backdropFilter: "blur(6px)",
        }}
      >
        <Box
          sx={{
            borderRight: { xs: "none", md: "1px solid #e2e8f0" },
            display: "flex",
            flexDirection: "column",
            bgcolor: "#f8fafc",
            px: 2,
          }}
        >
          <Box sx={{ pt: 2.25, pb: 1.75 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 700, color: "#0f172a", mb: 1 }}>
              Tin nhắn
            </Typography>
            <Paper
              variant="outlined"
              sx={{
                display: "flex",
                alignItems: "center",
                px: 1.5,
                py: 0.75,
                borderRadius: 999,
                borderColor: "rgba(148,163,184,0.8)",
                bgcolor: "#ffffff",
                boxShadow: "0 8px 22px rgba(15,23,42,0.12)",
              }}
            >
              <SearchIcon fontSize="small" sx={{ color: "#94a3b8", mr: 1 }} />
              <InputBase
                placeholder="Tìm tên phụ huynh..."
                sx={{ fontSize: 13, flex: 1 }}
                inputProps={{ "aria-label": "search conversations" }}
              />
            </Paper>
          </Box>

          <List
            sx={{
              flex: 1,
              overflowY: "auto",
              py: 0.5,
              px: 0,
            }}
          >
            {mockConversations.map((c) => {
              const isActive = c.id === selectedId;
              return (
                <ListItem
                  key={c.id}
                  disablePadding
                  sx={{
                    px: 0,
                    "&:not(:last-of-type)": { mb: 0.5 },
                  }}
                >
                  <Paper
                    onClick={() => setSelectedId(c.id)}
                    elevation={0}
                    sx={{
                      px: 1.5,
                      py: 1,
                      borderRadius: 2.5,
                      display: "flex",
                      alignItems: "center",
                      width: "100%",
                      cursor: "pointer",
                      bgcolor: isActive ? "rgba(59,130,246,0.08)" : "transparent",
                      border: isActive ? "1px solid rgba(59,130,246,0.4)" : "1px solid transparent",
                      boxShadow: isActive ? "0 8px 20px rgba(37,99,235,0.20)" : "none",
                      transition:
                        "background 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease, transform 0.08s ease",
                      "&:hover": {
                        bgcolor: isActive ? "rgba(59,130,246,0.12)" : "#f1f5f9",
                        transform: "translateY(-1px)",
                      },
                    }}
                  >
                    <ListItemAvatar sx={{ minWidth: 44 }}>
                      <Badge
                        color="error"
                        overlap="circular"
                        variant={c.unread ? "dot" : "standard"}
                        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                      >
                        <Avatar
                          sx={{
                            width: 32,
                            height: 32,
                            fontSize: 14,
                            bgcolor: c.avatarColor,
                          }}
                        >
                          {c.name.charAt(0).toUpperCase()}
                        </Avatar>
                      </Badge>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <Typography
                            sx={{
                              fontSize: 14,
                              fontWeight: isActive ? 600 : 500,
                              color: "#0f172a",
                              mr: 1,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {c.name}
                          </Typography>
                          <Typography sx={{ fontSize: 11, color: "#94a3b8", flexShrink: 0 }}>{c.time}</Typography>
                        </Box>
                      }
                      secondary={
                        <Typography
                          component="span"
                          sx={{
                            fontSize: 12,
                            color: "#64748b",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            display: "block",
                          }}
                        >
                          {c.lastMessage}
                        </Typography>
                      }
                    />
                  </Paper>
                </ListItem>
              );
            })}
          </List>
        </Box>

        <Box sx={{ display: "flex", flexDirection: "column" }}>
          <Box
            sx={{
              px: 3,
              py: 1.75,
              borderBottom: "1px solid #e2e8f0",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            {selectedConversation ? (
              <>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                  <Avatar
                    sx={{
                      width: 40,
                      height: 40,
                      bgcolor: selectedConversation.avatarColor,
                      fontSize: 16,
                    }}
                  >
                    {selectedConversation.name.charAt(0).toUpperCase()}
                  </Avatar>
                  <Box>
                    <Typography sx={{ fontSize: 15, fontWeight: 600, color: "#0f172a" }}>
                      {selectedConversation.name}
                    </Typography>
                    <Typography sx={{ fontSize: 12, color: "#22c55e" }}>Đang hoạt động</Typography>
                  </Box>
                </Box>
                <Tooltip title="Tuỳ chọn thêm">
                  <IconButton size="small">
                    <MoreVertIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </>
            ) : (
              <Typography sx={{ fontSize: 14, fontWeight: 500, color: "#64748b" }}>
                Chọn một cuộc trò chuyện ở bên trái để xem nội dung.
              </Typography>
            )}
          </Box>

          {selectedConversation ? (
            <Box
              sx={{
                flex: 1,
                px: 3,
                py: 2,
                overflowY: "auto",
                bgcolor: "#f8fafc",
              }}
            >
              <Typography
                align="center"
                sx={{ fontSize: 11, color: "#94a3b8", mb: 2 }}
              >
                Hôm nay
              </Typography>
              {mockMessages.map((m) => {
                const isMe = m.from === "counsellor";
                return (
                  <Box
                    key={m.id}
                    sx={{
                      display: "flex",
                      justifyContent: isMe ? "flex-end" : "flex-start",
                      mb: 1.5,
                    }}
                  >
                    <Box
                      sx={{
                        maxWidth: "70%",
                        bgcolor: isMe ? "#2563eb" : "#e5e7eb",
                        color: isMe ? "#ffffff" : "#111827",
                        px: 1.75,
                        py: 1,
                        borderRadius: 2,
                        borderTopRightRadius: isMe ? 4 : 2,
                        borderTopLeftRadius: isMe ? 2 : 4,
                        boxShadow: "0 1px 4px rgba(15,23,42,0.15)",
                      }}
                    >
                      <Typography sx={{ fontSize: 13 }}>{m.text}</Typography>
                      <Typography
                        sx={{
                          fontSize: 10,
                          textAlign: "right",
                          opacity: 0.8,
                          mt: 0.25,
                        }}
                      >
                        {m.time}
                      </Typography>
                    </Box>
                  </Box>
                );
              })}
            </Box>
          ) : (
            <Box
              sx={{
                flex: 1,
                px: 3,
                py: 2,
                bgcolor: "linear-gradient(135deg, #f8fafc 0, #f1f5f9 40%, #e5e7eb 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Typography sx={{ fontSize: 14, color: "#94a3b8" }}>
                Chưa có cuộc trò chuyện nào được chọn.
              </Typography>
            </Box>
          )}

          <Box
            sx={{
              px: 3,
              py: 1.5,
              borderTop: "1px solid #e2e8f0",
              bgcolor: "#ffffff",
            }}
          >
            <Paper
              elevation={0}
              sx={{
                display: "flex",
                alignItems: "center",
                borderRadius: 999,
                border: "1px solid #e2e8f0",
                px: 2,
                py: 0.75,
                bgcolor: "#f8fafc",
              }}
            >
              <InputBase
                placeholder={
                  selectedConversation
                    ? "Nhập tin nhắn cho phụ huynh..."
                    : "Chọn một cuộc trò chuyện để bắt đầu nhắn tin..."
                }
                sx={{ flex: 1, fontSize: 13 }}
                value={inputValue}
                disabled={!selectedConversation}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />
              <IconButton
                color="primary"
                onClick={handleSend}
                disabled={!inputValue.trim() || !selectedConversation}
                sx={{
                  ml: 0.5,
                  bgcolor: inputValue.trim() && selectedConversation ? "#2563eb" : "transparent",
                  color: inputValue.trim() && selectedConversation ? "#ffffff" : "primary.main",
                  "&:hover": {
                    bgcolor:
                      inputValue.trim() && selectedConversation
                        ? "#1d4ed8"
                        : "rgba(37,99,235,0.08)",
                  },
                }}
              >
                <SendIcon fontSize="small" />
              </IconButton>
            </Paper>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}
