/** MIME phổ biến → danh sách phần mở rộng được coi là khớp (theo cấu hình admin). */
const MIME_IMAGE_EXTS = {
    "image/jpeg": ["jpg", "jpeg"],
    "image/jpg": ["jpg"],
    "image/pjpeg": ["jpg", "jpeg"],
    "image/png": ["png"],
    "image/x-png": ["png"],
    "image/webp": ["webp"],
    "image/gif": ["gif"],
    "image/svg+xml": ["svg"],
    "image/bmp": ["bmp"],
    "image/x-ms-bmp": ["bmp"],
    "image/tiff": ["tif", "tiff"],
    "image/x-tiff": ["tif", "tiff"],
    "image/heic": ["heic"],
    "image/heif": ["heif", "heic"],
    "image/avif": ["avif"],
};

export function extractConfigBodyFromSystemConfigResponse(res) {
    return res?.data?.body ?? res?.data?.data ?? res?.data ?? null;
}

export function extractMediaFromConfig(cfg) {
    if (!cfg || typeof cfg !== "object") return {};
    return cfg.mediaData ?? cfg.media ?? {};
}

export function getMediaFromSystemConfigResponse(res) {
    const cfg = extractConfigBodyFromSystemConfigResponse(res);
    return extractMediaFromConfig(cfg);
}

export function normalizeImageFormatExtension(raw) {
    let s = String(raw ?? "")
        .trim()
        .toLowerCase();
    if (!s) return "";
    if (s.startsWith(".")) s = s.slice(1);
    return s;
}

export function parseImageFormatsFromMedia(media) {
    if (!media || typeof media !== "object") return [];
    const keys = ["imgFormats", "imgFormat"];
    const source = keys.find((k) => Array.isArray(media[k]));
    if (!source) return [];
    return media[source]
        .map((item) => (typeof item === "string" ? item : item?.format))
        .map(normalizeImageFormatExtension)
        .filter(Boolean);
}

export function parseDocFormatsFromMedia(media) {
    if (!media || typeof media !== "object") return [];
    const keys = ["docFormats", "docFormat"];
    const source = keys.find((k) => Array.isArray(media[k]));
    if (!source) return [];
    return media[source]
        .map((item) => (typeof item === "string" ? item : item?.format))
        .map(normalizeImageFormatExtension)
        .filter(Boolean);
}

export function parseMaxImgSizeMbFromMedia(media) {
    if (!media || typeof media !== "object") return null;
    const n = Number(media.maxImgSize);
    return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * @returns {{ extensions: string[], maxImgSizeMb: number, maxBytes: number } | null}
 */
export function buildMediaImageRulesFromMedia(media) {
    const extensions = parseImageFormatsFromMedia(media);
    const maxImgSizeMb = parseMaxImgSizeMbFromMedia(media);
    if (!extensions.length || maxImgSizeMb == null) return null;
    return {
        extensions,
        maxImgSizeMb,
        maxBytes: maxImgSizeMb * 1024 * 1024,
    };
}

const DEFAULT_FALLBACK_IMG_EXT = ["jpg", "jpeg", "png"];
const DEFAULT_FALLBACK_MAX_IMG_MB = 5;

/**
 * Khi không đọc được GET /system/config (403 guest, lỗi mạng, v.v.) — dùng cho luồng public.
 * Ghi đè bằng env: VITE_PUBLIC_FALLBACK_MAX_IMG_MB, VITE_PUBLIC_FALLBACK_IMG_FORMATS (vd: jpg,png,webp).
 */
export function getFallbackMediaImageRules() {
    const rawMb = import.meta.env.VITE_PUBLIC_FALLBACK_MAX_IMG_MB;
    const mbParsed = rawMb != null && String(rawMb).trim() !== "" ? Number(rawMb) : NaN;
    const maxImgSizeMb =
        Number.isFinite(mbParsed) && mbParsed > 0 ? mbParsed : DEFAULT_FALLBACK_MAX_IMG_MB;
    const rawFormats = import.meta.env.VITE_PUBLIC_FALLBACK_IMG_FORMATS;
    let extensions;
    if (rawFormats != null && String(rawFormats).trim() !== "") {
        extensions = String(rawFormats)
            .split(/[,;\s]+/)
            .map((s) => normalizeImageFormatExtension(s))
            .filter(Boolean);
    } else {
        extensions = [...DEFAULT_FALLBACK_IMG_EXT];
    }
    if (!extensions.length) extensions = [...DEFAULT_FALLBACK_IMG_EXT];
    return {
        extensions,
        maxImgSizeMb,
        maxBytes: maxImgSizeMb * 1024 * 1024,
    };
}

/** Phần mở rộng tài liệu (không dấu chấm), mặc định pdf. Env: VITE_PUBLIC_FALLBACK_DOC_FORMATS */
export function getFallbackDocFormatExtensions() {
    const raw = import.meta.env.VITE_PUBLIC_FALLBACK_DOC_FORMATS;
    if (raw != null && String(raw).trim() !== "") {
        const list = String(raw)
            .split(/[,;\s]+/)
            .map((s) => normalizeImageFormatExtension(s))
            .filter(Boolean);
        if (list.length) return list;
    }
    return ["pdf"];
}

/**
 * Trang `/register` + chưa có user trong localStorage: BE thường chặn GET /system/config (403).
 * Tránh gọi API và dùng fallback để không lỗi Network / không khóa upload logo vô cớ.
 */
export function shouldUsePublicMediaFallbackInsteadOfSystemConfig() {
    if (typeof window === "undefined") return false;
    const p = window.location.pathname || "";
    if (!/^\/register(\/|$)/i.test(p)) return false;
    try {
        const raw = localStorage.getItem("user");
        if (!raw || raw === "null") return true;
        const u = JSON.parse(raw);
        return !u || typeof u !== "object";
    } catch {
        return true;
    }
}

function getExtensionFromFileName(name) {
    const n = String(name || "")
        .trim()
        .toLowerCase();
    const i = n.lastIndexOf(".");
    if (i < 0 || i === n.length - 1) return "";
    return n.slice(i + 1);
}

export function fileMatchesImageFormats(file, extensions) {
    const allowed = new Set(extensions.map((e) => normalizeImageFormatExtension(e)).filter(Boolean));
    if (!allowed.size) return false;

    const ext = normalizeImageFormatExtension(getExtensionFromFileName(file?.name));
    if (ext && allowed.has(ext)) return true;

    const mime = String(file?.type || "")
        .trim()
        .toLowerCase();
    if (mime) {
        const fromMime = MIME_IMAGE_EXTS[mime];
        if (fromMime?.some((e) => allowed.has(e))) return true;
        const m = mime.match(/^image\/([a-z0-9.+-]+)$/i);
        if (m) {
            let sub = m[1].toLowerCase();
            if (sub === "svg+xml") sub = "svg";
            if (allowed.has(sub)) return true;
        }
    }
    return false;
}

export function formatBytesHuman(n) {
    const x = typeof n === "number" && Number.isFinite(n) ? n : 0;
    if (x < 1024) return `${Math.round(x)} B`;
    if (x < 1024 * 1024) return `${(x / 1024).toFixed(1)} KB`;
    return `${(x / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Kiểm tra theo thứ tự: có file → dung lượng → định dạng (extension/mime).
 * @param {File} file
 * @param {{ extensions: string[], maxBytes: number, maxImgSizeMb?: number }} rules
 * @returns {{ ok: true } | { ok: false, message: string }}
 */
export function validateMediaImageFile(file, rules) {
    if (!file) return {ok: false, message: "Chưa chọn file."};
    if (!rules?.extensions?.length || !rules?.maxBytes) {
        return {
            ok: false,
            message: "Chưa tải được cấu hình giới hạn ảnh từ hệ thống. Vui lòng thử lại sau.",
        };
    }
    const size = typeof file.size === "number" ? file.size : 0;
    if (size <= 0) {
        return {ok: false, message: "File rỗng hoặc không đọc được dung lượng."};
    }
    if (size > rules.maxBytes) {
        const mb = rules.maxImgSizeMb ?? rules.maxBytes / (1024 * 1024);
        const mbLabel = Number.isInteger(mb) ? String(mb) : mb.toFixed(1);
        return {
            ok: false,
            message: `Ảnh vượt quá dung lượng cho phép (${mbLabel} MB theo cấu hình). Hiện tại: ${formatBytesHuman(size)}.`,
        };
    }
    if (!fileMatchesImageFormats(file, rules.extensions)) {
        const list = [...new Set(rules.extensions.map((e) => `.${normalizeImageFormatExtension(e)}`))].join(", ");
        return {
            ok: false,
            message: `Định dạng ảnh không hợp lệ. Chỉ chấp nhận: ${list} (theo cấu hình).`,
        };
    }
    return {ok: true};
}

export function buildImageInputAcceptFromExtensions(extensions) {
    const exts = [...new Set(extensions.map(normalizeImageFormatExtension).filter(Boolean))];
    if (!exts.length) return "image/*";
    const dotted = exts.map((e) => `.${e}`).join(",");
    const mimeSet = new Set();
    for (const e of exts) {
        const hits = Object.entries(MIME_IMAGE_EXTS)
            .filter(([, arr]) => arr.includes(e))
            .map(([m]) => m);
        if (hits.length) hits.forEach((m) => mimeSet.add(m));
        else mimeSet.add(e === "jpg" || e === "jpeg" ? "image/jpeg" : `image/${e}`);
    }
    return [dotted, ...mimeSet].join(",");
}

export function formatMediaImageRulesCaption(rules) {
    if (!rules?.extensions?.length || !rules.maxBytes) return "";
    const exts = [...new Set(rules.extensions.map((e) => `.${normalizeImageFormatExtension(e)}`))].join(", ");
    const mb = rules.maxImgSizeMb ?? rules.maxBytes / (1024 * 1024);
    const mbLabel = Number.isInteger(mb) ? String(mb) : mb.toFixed(1);
    return `Định dạng: ${exts} · Tối đa ${mbLabel} MB (theo cấu hình hệ thống)`;
}

export function acceptDeclaresImageOnly(accept) {
    const a = String(accept || "")
        .trim()
        .toLowerCase();
    if (!a) return false;
    const parts = a.split(",").map((x) => x.trim()).filter(Boolean);
    return parts.length > 0 && parts.every((p) => p === "image/*" || p.startsWith("image/"));
}

export function shouldApplyMediaImageValidation(file, accept) {
    const name = String(file?.name || "");
    if (/\.pdf$/i.test(name)) return false;
    const t = String(file?.type || "").toLowerCase();
    if (t === "application/pdf") return false;
    if (t.startsWith("image/")) return true;
    if (t) return false;
    return acceptDeclaresImageOnly(accept);
}
