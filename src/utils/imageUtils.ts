const placeholderCache = new Map<string, string>();

export const getPlaceholderImageUrl = (
    type: 'badge' | 'player' | 'manager' | 'team' | 'league'
) => {
    if (placeholderCache.has(type)) {
        return placeholderCache.get(type)!;
    }

    const encodedSVG = encodeURIComponent(`
        <svg width="150" height="150" xmlns="http://www.w3.org/2000/svg">
            <rect width="150" height="150" fill="#f0f0f0"/>
            <text x="75" y="75" font-family="Arial" font-size="14" 
                  fill="#666" text-anchor="middle" dominant-baseline="middle">
                ${type}
            </text>
        </svg>
    `);

    const url = `data:image/svg+xml;utf8,${encodedSVG}`;

    placeholderCache.set(type, url);

    return url;
};
