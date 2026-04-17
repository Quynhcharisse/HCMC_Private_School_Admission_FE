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
 * Luôn trả về int hợp lệ cho JSON/Java primitive int.
 * Lưu ý: JSON.stringify(NaN) → "null" — không được để campusId thành NaN khi gửi.
 */
export const normalizeCampusId = (value) => {
    if (value == null || value === "") return 0;
    if (typeof value === "number") {
        if (!Number.isFinite(value)) return 0;
        return Math.trunc(value);
    }
    const s = String(value).trim();
    if (s === "" || s === "null" || s === "undefined" || s === "NaN") return 0;
    const n = Number(s);
    if (!Number.isFinite(n)) return 0;
    return Math.trunc(n);
};

/**
 * Body for {@code /app/private-message} — must match the server DTO (senderName, receiverName, campusId, message, conversationId, timestamp).
 * Spring {@code convertAndSendToUser(username, "/private", ...)} dùng {@code username} trùng principal (thường là email) — gửi email, không gửi tên hiển thị.
 * Includes {@code content} / {@code sentAt} aliases for older handlers.
 */
export const buildPrivateChatPayload = ({conversationId, message, senderName, receiverName, campusId}) => {
    const text = message ?? "";
    const ts = toLocalDateTimeIso();
    return {
        senderName: senderName ?? "",
        receiverName: receiverName ?? "",
        campusId: normalizeCampusId(campusId),
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
                        if (import.meta.env.DEV) {
                            // Tab phụ huynh: nếu counsellor gửi mà không thấy log này → BE chưa push vào queue /user của phụ huynh
                            console.debug("[STOMP ←]", destination, payload);
                        }
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

/**
 * Gỡ một listener (vd unmount CounsellorParentConsultation) mà không đóng socket của listener khác (vd Header phụ huynh).
 */
export const removePrivateMessageListener = (listener) => {
    if (listener == null || typeof listener !== "function") return;
    messageListeners.delete(listener);
    /** Không deactivate khi hết listener — các trang unmount lần lượt có thể tắt WS sớm; kết nối giữ để listener khác (sidebar, trang Liên hệ) vẫn nhận tin. */
};

export const sendMessage = (message) => {
    if (!stompClient?.active) return false;

    const payload =
        message && typeof message === "object" && !Array.isArray(message)
            ? {...message, campusId: normalizeCampusId(message.campusId)}
            : message;
    stompClient.publish({
        destination: "/app/private-message",
        body: JSON.stringify(payload)
    });
    return true;
};

export const disconnect = () => {
    messageListeners.clear();
    if (stompClient) {
        try {
            if (stompClient.active) stompClient.deactivate();
        } catch {
            /* ignore */
        }
        stompClient = null;
    }
};
