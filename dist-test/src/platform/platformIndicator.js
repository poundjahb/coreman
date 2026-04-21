export function buildPlatformIndicator(input) {
    const { target, label, initials, backgroundColor, textColor = "#ffffff" } = input;
    const svg = [
        '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" role="img" aria-label="platform">',
        '<rect x="0.5" y="0.5" width="15" height="15" rx="4" fill="' + backgroundColor + '"/>',
        '<text x="8" y="11" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="7" font-weight="700" fill="' + textColor + '">' + initials + '</text>',
        '</svg>'
    ].join("");
    return {
        target,
        label,
        iconDataUrl: "data:image/svg+xml," + encodeURIComponent(svg)
    };
}
