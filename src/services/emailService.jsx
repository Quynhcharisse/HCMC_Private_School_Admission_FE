import emailjs from "@emailjs/browser";

const SERVICE_ID = (import.meta.env.VITE_EMAILJS_SERVICE_ID || "").trim();
const TEMPLATE_ID = (import.meta.env.VITE_EMAILJS_TEMPLATE_ID || "").trim();
const PUBLIC_KEY = (import.meta.env.VITE_EMAILJS_PUBLIC_KEY || "").trim();

const assertEmailJsConfig = () => {
    if (!SERVICE_ID || !TEMPLATE_ID || !PUBLIC_KEY) {
        throw new Error(
            "Thiếu cấu hình EmailJS. Thêm VITE_EMAILJS_SERVICE_ID, VITE_EMAILJS_TEMPLATE_ID và VITE_EMAILJS_PUBLIC_KEY vào file .env"
        );
    }
};

export const sendWelcomeEmail = async ({ name, email }) => {
    assertEmailJsConfig();

    const trimmedEmail = (email || "").trim();
    const trimmedName =
        (name || "").trim() ||
        trimmedEmail.split("@")[0] ||
        "Tư vấn viên";

    if (!trimmedEmail) {
        throw new Error("Email người nhận không hợp lệ.");
    }

    emailjs.init({ publicKey: PUBLIC_KEY });

    // Gửi đủ alias: HTML của bạn dùng {{userName}} / {{userEmail}}; trường "To Email"
    // trên EmailJS thường là {{email}}, {{user_email}} hoặc {{to_email}} — nếu không khớp,
    // người nhận rỗng và API sẽ lỗi.
    const templateParams = {
        userName: trimmedName,
        userEmail: trimmedEmail,
        user_name: trimmedName,
        user_email: trimmedEmail,
        email: trimmedEmail,
        to_email: trimmedEmail,
        to_name: trimmedName,
    };

    try {
        const response = await emailjs.send(
            SERVICE_ID,
            TEMPLATE_ID,
            templateParams,
            { publicKey: PUBLIC_KEY }
        );

        console.log("Send email success:", response);
        return response;
    } catch (error) {
        console.error("Send email failed:", error);
        throw error;
    }
};