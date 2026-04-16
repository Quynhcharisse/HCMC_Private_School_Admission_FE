import emailjs from "@emailjs/browser";
import {getCampusQuotaRequestSummaryForEmailJs} from "./CampusService.jsx";

const WELCOME_SERVICE_ID = (import.meta.env.VITE_EMAILJS_SERVICE_ID || "").trim();
const TEMPLATE_ID = (import.meta.env.VITE_EMAILJS_TEMPLATE_ID || "").trim();
const QUOTA_REQUEST_TEMPLATE_ID = (
    import.meta.env.VITE_EMAILJS_QUOTA_REQUEST_TEMPLATE_ID || "template_ddj9q5l"
).trim();
const QUOTA_REQUEST_SERVICE_ID = (
    import.meta.env.VITE_EMAILJS_QUOTA_REQUEST_SERVICE_ID || WELCOME_SERVICE_ID
).trim();
const SCHOOL_VERIFIED_TEMPLATE_ID = (
    import.meta.env.VITE_EMAILJS_SCHOOL_VERIFIED_TEMPLATE_ID || TEMPLATE_ID || ""
).trim();
const WELCOME_PUBLIC_KEY = (import.meta.env.VITE_EMAILJS_PUBLIC_KEY || "").trim();
const QUOTA_REQUEST_PUBLIC_KEY = (
    import.meta.env.VITE_EMAILJS_QUOTA_REQUEST_PUBLIC_KEY || WELCOME_PUBLIC_KEY
).trim();

const assertEmailJsConfig = () => {
    if (!WELCOME_SERVICE_ID || !TEMPLATE_ID || !WELCOME_PUBLIC_KEY) {
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

    emailjs.init({ publicKey: WELCOME_PUBLIC_KEY });

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
            WELCOME_SERVICE_ID,
            TEMPLATE_ID,
            templateParams,
            { publicKey: WELCOME_PUBLIC_KEY }
        );

        console.log("Send email success:", response);
        return response;
    } catch (error) {
        console.error("Send email failed:", error);
        throw error;
    }
};

const SCHOOL_LOGIN_URL = "https://edubridgehcm.id.vn/login";
const SCHOOL_VERIFIED_SUBJECT =
    "[EduBridge] 🎊 Thông báo: Tài khoản trường học của bạn đã được kích hoạt thành công!";

const SCHOOL_VERIFIED_TEMPLATE_TEXT = (schoolName) => `Kính gửi Ban Giám hiệu/Bộ phận Tuyển sinh trường ${schoolName}, 🏫

Thay mặt đội ngũ quản trị hệ thống The EduBridgeHCM System, chúng tôi xin vui mừng thông báo rằng quy trình xác thực thông tin trường học của quý vị đã hoàn tất.

Hiện tại, tài khoản chính thức của trường đã được kích hoạt và sẵn sàng đi vào hoạt động. 🚀

Quý nhà trường có thể bắt đầu quản lý thông tin, đăng tin tuyển sinh và kết nối với các phụ huynh ngay bây giờ bằng cách đăng nhập tại đường dẫn dưới đây:

Địa chỉ đăng nhập: ${SCHOOL_LOGIN_URL}

---
Thông tin lưu ý dành cho nhà trường:

- Bảo mật: Hệ thống sử dụng phương thức đăng nhập đồng bộ qua Google. Quý nhà trường vui lòng sử dụng đúng địa chỉ Email đã đăng ký với chúng tôi để đăng nhập trực tiếp (không cần mật khẩu riêng cho hệ thống).
- Cập nhật hồ sơ: Để thu hút sự chú ý của phụ huynh, quý trường nên hoàn thiện hồ sơ giới thiệu sớm nhất có thể.
- Hỗ trợ: Nếu gặp bất kỳ khó khăn nào trong quá trình thao tác, quý nhà trường vui lòng phản hồi email này để được đội ngũ kỹ thuật hỗ trợ kịp thời.

Chúng tôi rất vinh dự được đồng hành cùng quý nhà trường trong việc kết nối giáo dục và mang lại những giá trị tốt nhất cho các em học sinh tại TP. Hồ Chí Minh. ✨

Trân trọng,
The EduBridgeHCM System Administration Team
Hệ thống Tư vấn Tuyển sinh Trường Tư thục TP.HCM

Đây là email tự động từ hệ thống. Quý nhà trường vui lòng không phản hồi trực tiếp vào địa chỉ này nếu không có yêu cầu hỗ trợ đặc biệt. © 2026 EduBridge. All rights reserved.`;

export const sendSchoolVerifiedEmail = async ({ schoolName, email }) => {
    assertEmailJsConfig();

    const trimmedEmail = (email || "").trim();
    const normalizedSchoolName = (schoolName || "").trim() || "quý nhà trường";

    if (!trimmedEmail) {
        throw new Error("Email trường học không hợp lệ.");
    }

    if (!SCHOOL_VERIFIED_TEMPLATE_ID) {
        throw new Error(
            "Thiếu template EmailJS cho thông báo xác thực trường học. Thêm VITE_EMAILJS_SCHOOL_VERIFIED_TEMPLATE_ID vào file .env"
        );
    }

    emailjs.init({ publicKey: WELCOME_PUBLIC_KEY });

    const templateParams = {
        // Recipient aliases
        email: trimmedEmail,
        userEmail: trimmedEmail,
        user_email: trimmedEmail,
        to_email: trimmedEmail,
        schoolEmail: trimmedEmail,
        school_email: trimmedEmail,
        to_name: normalizedSchoolName,
        userName: normalizedSchoolName,
        user_name: normalizedSchoolName,
        schoolName: normalizedSchoolName,
        school_name: normalizedSchoolName,
        // Content aliases
        subject: SCHOOL_VERIFIED_SUBJECT,
        email_subject: SCHOOL_VERIFIED_SUBJECT,
        title: SCHOOL_VERIFIED_SUBJECT,
        loginUrl: SCHOOL_LOGIN_URL,
        login_url: SCHOOL_LOGIN_URL,
        bodyText: SCHOOL_VERIFIED_TEMPLATE_TEXT(normalizedSchoolName),
        body_text: SCHOOL_VERIFIED_TEMPLATE_TEXT(normalizedSchoolName),
    };

    try {
        const response = await emailjs.send(
            WELCOME_SERVICE_ID,
            SCHOOL_VERIFIED_TEMPLATE_ID,
            templateParams,
            { publicKey: WELCOME_PUBLIC_KEY }
        );
        console.log("Send school verified email success:", response);
        return response;
    } catch (error) {
        console.error("Send school verified email failed:", error);
        throw error;
    }
};

const assertQuotaRequestEmailJsConfig = () => {
    if (!QUOTA_REQUEST_SERVICE_ID || !QUOTA_REQUEST_TEMPLATE_ID || !QUOTA_REQUEST_PUBLIC_KEY) {
        throw new Error(
            "Thiếu cấu hình EmailJS cho yêu cầu hạn ngạch. Thêm VITE_EMAILJS_QUOTA_REQUEST_SERVICE_ID, VITE_EMAILJS_QUOTA_REQUEST_PUBLIC_KEY và VITE_EMAILJS_QUOTA_REQUEST_TEMPLATE_ID (hoặc dùng fallback) vào file .env"
        );
    }
};

/**
 * Campus phụ: lấy tóm tắt từ BE rồi gửi email tới email campus chính (EmailJS).
 * @param {{ requestedAmount: number; userNote?: string }} params
 */
export const sendCampusQuotaRequestEmail = async ({requestedAmount, userNote = ""}) => {
    assertQuotaRequestEmailJsConfig();

    const n = Number(requestedAmount);
    if (!Number.isFinite(n) || n < 1) {
        throw new Error("Số lượng yêu cầu phải là số nguyên dương.");
    }

    const summary = await getCampusQuotaRequestSummaryForEmailJs();
    if (!summary || typeof summary !== "object") {
        throw new Error("Không lấy được dữ liệu từ máy chủ.");
    }

    const toEmail = String(summary.primaryBranchEmail || "").trim();
    if (!toEmail) {
        throw new Error("Trường chưa cấu hình email trụ sở chính để nhận yêu cầu.");
    }

    const schoolName = String(summary.schoolName ?? "").trim() || "—";
    const campusName = String(summary.campusName ?? "").trim() || "—";
    const currentUsage = summary.currentUsage != null ? Number(summary.currentUsage) : 0;
    const maxQuota = summary.maxQuota != null ? Number(summary.maxQuota) : 0;
    const note = String(userNote ?? "").trim();
    const noteDisplay = note || "—";
    const requestedStr = String(Math.floor(n));

    /** Nội dung đã ghép sẵn — dùng trong EmailJS: {{message}} hoặc {{message_html}} (EmailJS chỉ map với {{tên_biến}}, không phải {tên_biến}). */
    const message = `Kính gửi Ban Quản trị trường ${schoolName},

Cơ sở ${campusName} hiện đã sử dụng hết hạn ngạch Tư vấn viên (${currentUsage}/${maxQuota}).

Chúng tôi kính đề nghị cấp thêm: ${requestedStr} chỉ tiêu.

Lý do: ${noteDisplay}

Trân trọng,
Hệ thống Edubridge`;
    const message_html = message.split("\n").join("<br />");

    emailjs.init({publicKey: QUOTA_REQUEST_PUBLIC_KEY});

    const usageStr = String(currentUsage);
    const maxStr = String(maxQuota);

    const templateParams = {
        schoolName,
        campusName,
        currentUsage: usageStr,
        maxQuota: maxStr,
        requestedAmount: requestedStr,
        userNote: noteDisplay,

        school_name: schoolName,
        campus_name: campusName,
        current_usage: usageStr,
        max_quota: maxStr,
        requested_amount: requestedStr,
        user_note: noteDisplay,

        message,
        message_html,
        email_body: message,
        body: message,
        bodyText: message,
        body_text: message,

        to_email: toEmail,
        email: toEmail,
        user_email: toEmail,
        userEmail: toEmail,
    };

    try {
        const response = await emailjs.send(QUOTA_REQUEST_SERVICE_ID, QUOTA_REQUEST_TEMPLATE_ID, templateParams, {
            publicKey: QUOTA_REQUEST_PUBLIC_KEY,
        });
        console.log("Send campus quota request email success:", response);
        return response;
    } catch (error) {
        console.error("Send campus quota request email failed:", error);
        throw error;
    }
};
