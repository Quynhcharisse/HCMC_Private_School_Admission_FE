import {useCallback, useEffect, useState} from "react";
import {fetchSystemMediaConfig} from "../services/SystemConfigService.jsx";
import {buildMediaImageRulesFromMedia} from "../utils/platformMediaConfig.js";

/**
 * maxImgSize (MB) và định dạng ảnh từ media config (admin).
 * @returns {{ loading: boolean, rules: { extensions: string[], maxImgSizeMb: number, maxBytes: number } | null, refetch: () => Promise<void> }}
 */
export function usePlatformMediaImageRules() {
    const [loading, setLoading] = useState(true);
    const [rules, setRules] = useState(null);

    const load = useCallback(async ({force = false} = {}) => {
        setLoading(true);
        try {
            const media = await fetchSystemMediaConfig({force, staleTimeMs: 10 * 60 * 1000});
            setRules(buildMediaImageRulesFromMedia(media));
        } catch {
            setRules(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void load();
    }, [load]);

    const refetch = useCallback(() => load({force: true}), [load]);
    return {loading, rules, refetch};
}
