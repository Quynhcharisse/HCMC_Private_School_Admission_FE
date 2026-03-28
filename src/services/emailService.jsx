import emailjs from "@emailjs/browser";

const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID;
const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

const assertEmailJsConfig = () => {
    if (!SERVICE_ID || !TEMPLATE_ID || !PUBLIC_KEY) {
        throw new Error(
            "Thiếu cấu hình EmailJS. Thêm VITE_EMAILJS_SERVICE_ID, VITE_EMAILJS_TEMPLATE_ID và VITE_EMAILJS_PUBLIC_KEY vào file .env"
        );
    }
};

/**
 * Gửi email welcome cho user.
 * Template trên EmailJS phải dùng biến khớp với object gửi đi (ví dụ {{name}}, {{email}}).
 */
export const sendWelcomeEmail = async ({ name, email }) => {
    assertEmailJsConfig();
    try {
        const res = await emailjs.send(
            SERVICE_ID,
            TEMPLATE_ID,
            {
                name,
                email,
            },
            PUBLIC_KEY
        );
        return res;
    } catch (error) {
        console.error("Email error:", error);
        throw error;
    }
};
