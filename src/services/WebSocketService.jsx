import {Client} from "@stomp/stompjs";
import SockJS from "sockjs-client/dist/sockjs";

let stompClient = null;
const messageListeners = new Set();

const getWsHttpBase = () => import.meta.env.VITE_API_SERVER || "http://localhost:8080";
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
 * Body gửi {@code /app/private-message} — khớp DTO tin nhắn chat phía BE:
 * {@code senderName}, {@code receiverName}, {@code campusId}, {@code message}, {@code conversationId}, {@code timestamp}
 * (+ alias {@code content}/{@code sentAt} nếu BE/handler cũ cần; không thêm {@code type}).
 *
 * Sự kiện {@code CONVERSATION_READ} sau mark-read: BE gửi tới {@code /user/queue/conversation-read};
 * {@code /user/queue/private} chỉ {@code ChatMessage}.
 *
 * Spring {@code convertAndSendToUser} cần principal khớp email — dùng email trong sender/receiver, không dùng tên hiển thị.
 * Khi {@code receiverName} rỗng và {@code campusId > 0}, thêm {@code broadcastToCampus: true} (fan-out TVV cơ sở).
 * {@code studentProfileId} tùy chọn — route/push đúng phiên phụ huynh.
 */
export const buildPrivateChatPayload = ({
    conversationId,
    message,
    senderName,
    receiverName,
    campusId,
    studentProfileId,
}) => {
    const text = String(message ?? "").trim();
    const ts = toLocalDateTimeIso();
    const recv = String(receiverName ?? "").trim();
    const send = String(senderName ?? "").trim();
    const cid = normalizeCampusId(campusId);
    const broadcastToCampus = recv === "" && cid > 0;

    let convOut = conversationId;
    if (convOut != null && String(convOut).trim() !== "") {
        const n = Number(convOut);
        convOut = Number.isFinite(n) ? Math.trunc(n) : convOut;
    }

    const out = {
        senderName: send,
        receiverName: recv,
        campusId: cid,
        message: text,
        conversationId: convOut,
        timestamp: ts,
        content: text,
        sentAt: ts,
    };
    if (broadcastToCampus) {
        out.broadcastToCampus = true;
    }
    const sp = studentProfileId;
    if (sp != null && String(sp).trim() !== "") {
        const n = Number(sp);
        if (Number.isFinite(n)) {
            out.studentProfileId = Math.trunc(n);
        } else {
            out.studentProfileId = String(sp).trim();
        }
    }
    return out;
};

/** Subscribe STOMP — khớp {@code convertAndSendToUser(..., "/queue/...", ...)} phía Spring. */
const USER_CHAT_MESSAGE_QUEUES = [
    "/user/queue/private",
    "/user/queue/private-messages",
    "/user/queue/messages",
];

/**
 * Đích user-queue cho payload điều khiển (vd type CONVERSATION_READ) — tách khỏi tin chat.
 * BE: {@code simpMessagingTemplate.convertAndSendToUser(email, "/queue/conversation-read", payload)}.
 */
const USER_READ_EVENT_QUEUES = ["/user/queue/conversation-read"];

const dispatchIncomingStompFrame = (destination, frame) => {
    try {
        const payload = JSON.parse(frame.body || "{}");
        if (import.meta.env.DEV) {
            console.debug("[STOMP ←]", destination, payload);
        }
        messageListeners.forEach((listener) => {
            try {
                listener?.(payload);
            } catch (err) {
                console.error("[STOMP listener error]", err);
            }
        });
    } catch (error) {
        console.error("Invalid websocket payload:", error);
    }
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
            [...USER_CHAT_MESSAGE_QUEUES, ...USER_READ_EVENT_QUEUES].forEach((destination) => {
                stompClient.subscribe(destination, (frame) => {
                    dispatchIncomingStompFrame(destination, frame);
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
