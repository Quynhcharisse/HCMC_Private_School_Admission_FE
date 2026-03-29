import React, { useState, useRef, useEffect } from 'react';
import {
    Box,
    Paper,
    TextField,
    IconButton,
    Typography,
    Avatar,
    Fade,
    Slide
} from '@mui/material';
import {
    Send as SendIcon,
    Close as CloseIcon,
    SmartToy as BotIcon
} from '@mui/icons-material';
import {APP_PRIMARY_DARK, APP_PRIMARY_MAIN} from '../../constants/homeLandingTheme';

const Chatbot = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        {
            id: 1,
            text: 'Xin chào! Tôi là trợ lý tư vấn tuyển sinh của EduBridgeHCM. Tôi có thể giúp gì cho bạn?',
            sender: 'bot',
            timestamp: new Date()
        }
    ]);
    const [inputMessage, setInputMessage] = useState('');
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            setTimeout(() => {
                inputRef.current?.focus();
            }, 300);
        }
    }, [isOpen]);

    const handleSendMessage = () => {
        if (inputMessage.trim() === '') return;

        const userMessage = {
            id: messages.length + 1,
            text: inputMessage,
            sender: 'user',
            timestamp: new Date()
        };

        setMessages([...messages, userMessage]);
        setInputMessage('');

        setTimeout(() => {
            const botResponses = [
                'Cảm ơn bạn đã liên hệ! Tôi đang xử lý câu hỏi của bạn...',
                'Đây là một câu hỏi hay! Để tôi tìm thông tin phù hợp cho bạn.',
                'Tôi hiểu câu hỏi của bạn. Hãy để tôi hỗ trợ bạn tìm thông tin cần thiết.',
                'Cảm ơn bạn đã quan tâm! Tôi sẽ cung cấp thông tin chi tiết trong giây lát.'
            ];
            const randomResponse = botResponses[Math.floor(Math.random() * botResponses.length)];
            
            const botMessage = {
                id: messages.length + 2,
                text: randomResponse,
                sender: 'bot',
                timestamp: new Date()
            };
            setMessages(prev => [...prev, botMessage]);
        }, 1000);
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const quickQuestions = [
        'Tìm trường THPT tại Quận 1',
        'Học phí các trường công lập',
        'Thủ tục đăng ký tuyển sinh',
        'Học bổng có sẵn'
    ];

    const handleQuickQuestion = (question) => {
        setInputMessage(question);
        setTimeout(() => {
            handleSendMessage();
        }, 100);
    };

    return (
        <>
            <Box
                onClick={() => setIsOpen(true)}
                sx={{
                    position: 'fixed',
                    bottom: 24,
                    right: 24,
                    zIndex: 1000,
                    cursor: 'pointer',
                    animation: isOpen ? 'none' : 'pulse 2s infinite',
                    display: isOpen ? 'none' : 'block'
                }}
            >
                <Paper
                    elevation={8}
                    sx={{
                        width: 64,
                        height: 64,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: APP_PRIMARY_MAIN,
                        color: 'white',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                            bgcolor: APP_PRIMARY_DARK,
                            transform: 'scale(1.1)',
                            boxShadow: '0 8px 24px rgba(37,99,235,0.4)'
                        }
                    }}
                >
                    <BotIcon sx={{ fontSize: 32 }} />
                </Paper>
            </Box>
            <Fade in={isOpen}>
                <Box
                    sx={{
                        position: 'fixed',
                        bottom: 24,
                        right: 24,
                        width: { xs: 'calc(100vw - 48px)', sm: 400 },
                        maxWidth: 'calc(100vw - 48px)',
                        height: { xs: 'calc(100vh - 120px)', sm: 600 },
                        maxHeight: { xs: 'calc(100vh - 120px)', sm: 600 },
                        zIndex: 1001,
                        display: isOpen ? 'block' : 'none'
                    }}
                >
                    <Slide direction="up" in={isOpen} mountOnEnter unmountOnExit>
                        <Paper
                            elevation={24}
                            sx={{
                                height: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                borderRadius: 3,
                                overflow: 'hidden',
                                bgcolor: '#ffffff',
                                boxShadow: '0 12px 48px rgba(0,0,0,0.15)'
                            }}
                        >
                            {/* Header */}
                            <Box
                                sx={{
                                    bgcolor: APP_PRIMARY_MAIN,
                                    color: 'white',
                                    p: 2,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                                }}
                            >
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                    <Avatar
                                        sx={{
                                            bgcolor: 'rgba(255,255,255,0.2)',
                                            width: 40,
                                            height: 40
                                        }}
                                    >
                                        <BotIcon />
                                    </Avatar>
                                    <Box>
                                        <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1rem' }}>
                                            Trợ lý Tư vấn
                                        </Typography>
                                        <Typography variant="caption" sx={{ opacity: 0.9, fontSize: '0.75rem' }}>
                                            Thường trực 24/7
                                        </Typography>
                                    </Box>
                                </Box>
                                <IconButton
                                    onClick={() => setIsOpen(false)}
                                    sx={{
                                        color: 'white',
                                        '&:hover': {
                                            bgcolor: 'rgba(255,255,255,0.1)'
                                        }
                                    }}
                                >
                                    <CloseIcon />
                                </IconButton>
                            </Box>
                            <Box
                                sx={{
                                    flex: 1,
                                    overflowY: 'auto',
                                    p: 2,
                                    bgcolor: '#f5f7fa',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 2,
                                    '&::-webkit-scrollbar': {
                                        width: '8px'
                                    },
                                    '&::-webkit-scrollbar-track': {
                                        bgcolor: '#f1f1f1',
                                        borderRadius: '4px'
                                    },
                                    '&::-webkit-scrollbar-thumb': {
                                        bgcolor: '#c1c1c1',
                                        borderRadius: '4px',
                                        '&:hover': {
                                            bgcolor: '#a8a8a8'
                                        }
                                    }
                                }}
                            >
                                {messages.map((message) => (
                                    <Box
                                        key={message.id}
                                        sx={{
                                            display: 'flex',
                                            justifyContent: message.sender === 'user' ? 'flex-end' : 'flex-start',
                                            gap: 1.5,
                                            animation: 'fadeIn 0.3s ease'
                                        }}
                                    >
                                        {message.sender === 'bot' && (
                                            <Avatar
                                                sx={{
                                                    bgcolor: APP_PRIMARY_MAIN,
                                                    width: 32,
                                                    height: 32,
                                                    order: 0
                                                }}
                                            >
                                                <BotIcon sx={{ fontSize: 18 }} />
                                            </Avatar>
                                        )}
                                        <Box
                                            sx={{
                                                maxWidth: '75%',
                                                bgcolor: message.sender === 'user' ? APP_PRIMARY_MAIN : '#ffffff',
                                                color: message.sender === 'user' ? 'white' : '#333',
                                                p: 1.5,
                                                borderRadius: 2,
                                                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                                                order: message.sender === 'user' ? 0 : 1
                                            }}
                                        >
                                            <Typography
                                                variant="body2"
                                                sx={{
                                                    fontSize: '0.875rem',
                                                    lineHeight: 1.5,
                                                    wordBreak: 'break-word'
                                                }}
                                            >
                                                {message.text}
                                            </Typography>
                                            <Typography
                                                variant="caption"
                                                sx={{
                                                    display: 'block',
                                                    mt: 0.5,
                                                    opacity: 0.7,
                                                    fontSize: '0.7rem'
                                                }}
                                            >
                                                {message.timestamp.toLocaleTimeString('vi-VN', {
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </Typography>
                                        </Box>
                                        {message.sender === 'user' && (
                                            <Avatar
                                                sx={{
                                                    bgcolor: '#dbeafe',
                                                    color: APP_PRIMARY_MAIN,
                                                    width: 32,
                                                    height: 32,
                                                    order: 1
                                                }}
                                            >
                                                <Typography sx={{ fontSize: '0.75rem', fontWeight: 600 }}>
                                                    U
                                                </Typography>
                                            </Avatar>
                                        )}
                                    </Box>
                                ))}
                                <div ref={messagesEndRef} />
                            </Box>

                            {messages.length === 1 && (
                                <Box
                                    sx={{
                                        p: 1.5,
                                        bgcolor: '#ffffff',
                                        borderTop: '1px solid #e5e7eb'
                                    }}
                                >
                                    <Typography
                                        variant="caption"
                                        sx={{
                                            display: 'block',
                                            mb: 1,
                                            color: '#6b7280',
                                            fontSize: '0.75rem',
                                            fontWeight: 600
                                        }}
                                    >
                                        Câu hỏi thường gặp:
                                    </Typography>
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                        {quickQuestions.map((question, index) => (
                                            <Box
                                                key={index}
                                                onClick={() => handleQuickQuestion(question)}
                                                sx={{
                                                    px: 1.5,
                                                    py: 0.75,
                                                    borderRadius: 2,
                                                    bgcolor: '#dbeafe',
                                                    color: APP_PRIMARY_MAIN,
                                                    fontSize: '0.75rem',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s ease',
                                                    '&:hover': {
                                                        bgcolor: '#bfdbfe',
                                                        transform: 'translateY(-2px)'
                                                    }
                                                }}
                                            >
                                                {question}
                                            </Box>
                                        ))}
                                    </Box>
                                </Box>
                            )}

                            <Box
                                sx={{
                                    p: 2,
                                    bgcolor: '#ffffff',
                                    borderTop: '1px solid #e5e7eb',
                                    display: 'flex',
                                    gap: 1,
                                    alignItems: 'flex-end'
                                }}
                            >
                                <TextField
                                    inputRef={inputRef}
                                    fullWidth
                                    multiline
                                    maxRows={4}
                                    placeholder="Nhập câu hỏi của bạn..."
                                    value={inputMessage}
                                    onChange={(e) => setInputMessage(e.target.value)}
                                    onKeyPress={handleKeyPress}
                                    variant="outlined"
                                    size="small"
                                    sx={{
                                        '& .MuiOutlinedInput-root': {
                                            borderRadius: 2,
                                            bgcolor: '#f5f7fa',
                                            '& fieldset': {
                                                borderColor: '#e5e7eb'
                                            },
                                            '&:hover fieldset': {
                                                borderColor: APP_PRIMARY_MAIN
                                            },
                                            '&.Mui-focused fieldset': {
                                                borderColor: APP_PRIMARY_MAIN
                                            }
                                        }
                                    }}
                                />
                                <IconButton
                                    onClick={handleSendMessage}
                                    disabled={inputMessage.trim() === ''}
                                    sx={{
                                        bgcolor: APP_PRIMARY_MAIN,
                                        color: 'white',
                                        width: 40,
                                        height: 40,
                                        '&:hover': {
                                            bgcolor: APP_PRIMARY_DARK
                                        },
                                        '&.Mui-disabled': {
                                            bgcolor: '#e0e0e0',
                                            color: '#9e9e9e'
                                        }
                                    }}
                                >
                                    <SendIcon />
                                </IconButton>
                            </Box>
                        </Paper>
                    </Slide>
                </Box>
            </Fade>

            {isOpen && (
                <Box
                    onClick={() => setIsOpen(false)}
                    sx={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        bgcolor: 'rgba(0,0,0,0.3)',
                        zIndex: 1000,
                        backdropFilter: 'blur(2px)'
                    }}
                />
            )}

            <style>
                {`
                    @keyframes pulse {
                        0%, 100% {
                            transform: scale(1);
                        }
                        50% {
                            transform: scale(1.05);
                        }
                    }
                    @keyframes fadeIn {
                        from {
                            opacity: 0;
                            transform: translateY(10px);
                        }
                        to {
                            opacity: 1;
                            transform: translateY(0);
                        }
                    }
                `}
            </style>
        </>
    );
};

export default Chatbot;
