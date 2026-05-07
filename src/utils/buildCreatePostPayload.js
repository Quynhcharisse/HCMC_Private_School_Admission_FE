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
    if (!raw || isRichTextEmpty(raw)) return [];

    return [{text: raw, position: 1}];
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

    const normalizedTypeFile = String(typeFile || "").trim();
    const thumbnailUrl = String(thumbnail || "").trim();
    const firstDocumentFileUrl = documentItemList
        .map((d) => String(d.fileUrl || "").trim())
        .find(Boolean);
    const resolvedTypeFile =
        firstDocumentFileUrl ||
        (/^https?:\/\//i.test(normalizedTypeFile) || normalizedTypeFile.startsWith("/")
            ? normalizedTypeFile
            : "");

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
        thumbnail: thumbnailUrl,
        typeFile: resolvedTypeFile,
        categoryPost: String(categoryPost || "").trim(),
        publishedDate: String(publishedDate || "").trim()
    };
}
