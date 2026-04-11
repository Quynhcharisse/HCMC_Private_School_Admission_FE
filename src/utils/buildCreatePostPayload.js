/**
 * Dựng body POST /api/v1/post đúng CreatePostRequest (BE).
 * @param {object} p
 * @param {string} p.shortDescription — content.shortDescription
 * @param {string} p.contentBody — tách thành content.contentDataList (mỗi khối non-empty = 1 đoạn, position 1..n)
 * @param {string} p.hashTagsRaw — hashtag, cách nhau bởi dấu phẩy hoặc khoảng trắng
 * @param {string} p.categoryPost — enum name
 * @param {string[]} p.imageUrlList — URL ảnh trong bài (http/https)
 * @param {string} p.thumbnail
 * @param {string} p.typeFile — MIME, ví dụ image/jpeg
 * @param {string} p.publishedDate — ISO-friendly, ví dụ 2026-04-11T19:00:00
 */
export function buildCreatePostPayload({
    shortDescription,
    contentBody,
    hashTagsRaw,
    categoryPost,
    imageUrlList,
    thumbnail,
    typeFile,
    publishedDate
}) {
    const hashTagList = String(hashTagsRaw || "")
        .split(/[,#\s]+/)
        .map((s) => s.trim().toLowerCase().replace(/^#/, ""))
        .filter(Boolean);

    const paragraphs = String(contentBody || "")
        .split(/\n\s*\n/)
        .map((t) => t.trim())
        .filter(Boolean);

    const contentDataList = paragraphs.map((text, i) => ({
        text,
        position: i + 1
    }));

    const positions = contentDataList.map((c) => c.position);
    const totalPosition = positions.length ? Math.max(...positions) : 0;

    const imageItemList = imageUrlList
        .map((url) => String(url || "").trim())
        .filter(Boolean)
        .map((url, i) => ({url, position: i + 1}));

    return {
        hashTagList,
        totalPosition,
        content: {
            type: "ARTICLE",
            shortDescription: String(shortDescription || "").trim(),
            contentDataList
        },
        image: {imageItemList},
        thumbnail: String(thumbnail || "").trim(),
        typeFile: String(typeFile || "").trim(),
        categoryPost: String(categoryPost || "").trim(),
        publishedDate: String(publishedDate || "").trim()
    };
}
