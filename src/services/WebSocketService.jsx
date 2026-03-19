import {Client} from "@stomp/stompjs";
import SockJS from "sockjs-client/dist/sockjs";

let stompClient = null;
const messageListeners = new Set();

const getWsHttpBase = () => import.meta.env.VITE_SERVER_BE || "http://localhost:8080";
const getWsEndpoint = () => import.meta.env.VITE_WS_ENDPOINT || "/ws";

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
            ["/user/queue/private-messages", "/user/queue/messages"].forEach((destination) => {
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
