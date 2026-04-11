export function isRichTextEmpty(html) {
    const t = String(html || "")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/gi, " ")
        .replace(/\s+/g, " ")
        
        .trim();
    return t.length === 0;
}

function buildContentDataList(contentBody) {
    const raw = String(contentBody || "").trim();
    if (!raw) return [];

    const looksLikeHtml = /<[a-z][\s\S]*>/i.test(raw);
    if (looksLikeHtml) {
        if (isRichTextEmpty(raw)) return [];
        return [{text: raw, position: 1}];
    }

    const paragraphs = raw
        .split(/\n\s*\n/)
        .map((t) => t.trim())
        .filter(Boolean);

    return paragraphs.map((text, i) => ({
        text,
        position: i + 1
    }));
}

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

    const contentDataList = buildContentDataList(contentBody);

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
