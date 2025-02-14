export function generateSearchKeywords(text: string): string[] {
    const keywords = new Set<string>();

    if (!text) return [];

    // 원본 텍스트 추가
    keywords.add(text);

    // 소문자 변환
    const lowercase = text.toLowerCase();
    keywords.add(lowercase);

    // 공백 제거
    const noSpace = text.replace(/\s+/g, '');
    keywords.add(noSpace);
    keywords.add(noSpace.toLowerCase());

    // 한글 초성 추출
    const chosung = getChosung(text);
    if (chosung) {
        keywords.add(chosung);
    }

    const words = text.split(/\s+/);
    words.forEach((word) => {
        if (word.length > 1) {
            keywords.add(word);
            keywords.add(word.toLowerCase());
        }
    });

    return Array.from(keywords);
}

function getChosung(text: string): string {
    const pattern = /[가-힣]/g;
    let result = '';

    for (const char of text) {
        if (pattern.test(char)) {
            const code = char.charCodeAt(0) - 44032;
            if (code > -1 && code < 11172) {
                const cho = Math.floor(code / 588);
                result += String.fromCharCode(cho + 0x1100);
            }
        }
    }

    return result;
}
