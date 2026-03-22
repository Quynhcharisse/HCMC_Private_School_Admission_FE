import {Client} from "@stomp/stompjs";
import SockJS from "sockjs-client/dist/sockjs";

let stompClient = null;
const messageListeners = new Set();

const getWsHttpBase = () => import.meta.env.VITE_SERVER_BE || "http://localhost:8080";
const getWsEndpoint = () => import.meta.env.VITE_WS_ENDPOINT || "/ws";

/** Local ISO-8601 date-time (no zone) for Jackson LocalDateTime on the server. */
export const toLocalDateTimeIso = (date = new Date()) => {
    const pad = (n) => String(n).padStart(2, "0");
    const ms = String(date.getMilliseconds()).padStart(3, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${ms}`;
};

/**
 * Body for {@code /app/private-message} — must match the server DTO (senderName, receiverName, message, conversationId, timestamp).
 * Spring {@code convertAndSendToUser(username, "/private", ...)} dùng {@code username} trùng principal (thường là email) — gửi email, không gửi tên hiển thị.
 * Includes {@code content} / {@code sentAt} aliases for older handlers.
 */
export const buildPrivateChatPayload = ({conversationId, message, senderName, receiverName}) => {
    const text = message ?? "";
    const ts = toLocalDateTimeIso();
    return {
        senderName: senderName ?? "",
        receiverName: receiverName ?? "",
        message: text,
        conversationId,
        timestamp: ts,
        content: text,
        sentAt: ts,
    };
};

export const connectPrivateMessageSocket = ({onMessage}) => {
    if (stompClient?.active) {
        if (onMessage) messageListeners.add(onMessage);
        return stompClient;
    }

    const socketUrl = `${getWsHttpBase()}${getWsEndpoint()}`;

    stompClient = new Client({
        webSocketFactory: () => new SockJS(socketUrl),
        reconnectDelay: 5000,
        heartbeatIncoming: 10000,
        heartbeatOutgoing: 10000,
        onConnect: () => {
            // Spring convertAndSendToUser(..., "/private", ...) thường tới /user/queue/private
            ["/user/queue/private", "/user/queue/private-messages", "/user/queue/messages"].forEach((destination) => {
                stompClient.subscribe(destination, (frame) => {
                    try {
                        const payload = JSON.parse(frame.body || "{}");
                        messageListeners.forEach((listener) => listener?.(payload));
                    } catch (error) {
                        console.error("Invalid websocket payload:", error);
                    }
                });
            });
        },
        onStompError: (frame) => {
            console.error("STOMP error:", frame.headers?.message, frame.body);
        }
    });

    if (onMessage) messageListeners.add(onMessage);
    stompClient.activate();
    return stompClient;
};

export const sendMessage = (message) => {
    if (!stompClient?.active) return false;

    stompClient.publish({
        destination: "/app/private-message",
        body: JSON.stringify(message)
    });
    return true;
};

export const disconnect = () => {
    if (stompClient) {
        stompClient.deactivate();
    }
    messageListeners.clear();
};
