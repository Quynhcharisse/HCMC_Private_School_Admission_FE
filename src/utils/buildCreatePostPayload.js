export function isRichTextEmpty(html) {
    const t = String(html || "")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/gi, " ")
        .replace(/\s+/g, " ")
        .trim();
    return t.length === 0;
}

function stripHtmlSegmentToPlain(html) {
    return String(html || "")
        .replace(/<br\s*\/?>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/gi, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/\s+/g, " ")
        .trim();
}

function buildContentDataListFromHtml(html) {
    const raw = String(html || "").trim();
    if (!raw || isRichTextEmpty(raw)) return [];

    const fromP = [];
    const pRe = /<p[^>]*>([\s\S]*?)<\/p>/gi;
    let pm;
    while ((pm = pRe.exec(raw)) !== null) {
        const t = stripHtmlSegmentToPlain(pm[1]);
        if (t) fromP.push(t);
    }
    if (fromP.length > 0) {
        return fromP.map((text, i) => ({text, position: i + 1}));
    }

    const fromLi = [];
    const liRe = /<li[^>]*>([\s\S]*?)<\/li>/gi;
    let lm;
    while ((lm = liRe.exec(raw)) !== null) {
        const t = stripHtmlSegmentToPlain(lm[1]);
        if (t) fromLi.push(t);
    }
    if (fromLi.length > 0) {
        return fromLi.map((text, i) => ({text, position: i + 1}));
    }

    const plain = stripHtmlSegmentToPlain(raw);
    return plain ? [{text: plain, position: 1}] : [];
}

function buildContentDataList(contentBody) {
    const raw = String(contentBody || "").trim();
    if (!raw) return [];

    const looksLikeHtml = /<[a-z][\s\S]*>/i.test(raw);
    if (looksLikeHtml) {
        return buildContentDataListFromHtml(raw);
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
    documentItems,
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

    const rawDocs = Array.isArray(documentItems) ? documentItems : [];
    const documentItemList = rawDocs
        .filter((d) => d && typeof d === "object")
        .map((d, i) => ({
            position: i + 1,
            fileName: String(d.fileName ?? "").trim(),
            fileUrl: d.fileUrl == null || d.fileUrl === "" ? null : String(d.fileUrl).trim(),
            storagePath: String(d.storagePath ?? "").trim(),
            category: String(d.category ?? "").trim()
        }))
        .filter((d) => d.fileName || d.storagePath);

    return {
        hashTagList,
        totalPosition,
        content: {
            type: "ARTICLE",
            shortDescription: String(shortDescription || "").trim(),
            contentDataList
        },
        image: {imageItemList},
        ...(documentItemList.length > 0 ? {document: {documentItemList}} : {}),
        thumbnail: String(thumbnail || "").trim(),
        typeFile: String(typeFile || "").trim(),
        categoryPost: String(categoryPost || "").trim(),
        publishedDate: String(publishedDate || "").trim()
    };
}
