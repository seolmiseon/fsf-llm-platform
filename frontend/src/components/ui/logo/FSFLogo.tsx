interface FSFLogoProps {
    width?: number;
    height?: number;
    className?: string;
    onCapture?: () => void;
}

const FSFLogo = ({
    width = 180,
    height = 80,
    className = '',
    onCapture,
}: FSFLogoProps) => {
    const handleCapture = () => {
        const svgElement = document.querySelector('#fsf-logo');
        if (!svgElement) return;

        // SVG를 문자열로 변환
        const svgData = new XMLSerializer().serializeToString(svgElement);
        const svgBlob = new Blob([svgData], {
            type: 'image/svg+xml;charset=utf-8',
        });

        // SVG를 URL로 변환
        const URL = window.URL || window.webkitURL || window;
        const blobURL = URL.createObjectURL(svgBlob);

        // 이미지 생성
        const image = new Image();
        image.onload = () => {
            // 캔버스 생성
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const context = canvas.getContext('2d');
            if (!context) return;

            // 이미지를 캔버스에 그리기
            context.drawImage(image, 0, 0, width, height);

            // 캔버스를 PNG로 변환
            canvas.toBlob((blob) => {
                if (!blob) return;

                // 다운로드 링크 생성
                const downloadLink = document.createElement('a');
                downloadLink.download = 'fsf-logo.png';
                downloadLink.href = URL.createObjectURL(blob);
                downloadLink.click();

                // 리소스 정리
                URL.revokeObjectURL(downloadLink.href);
            }, 'image/png');

            // 원본 SVG URL 정리
            URL.revokeObjectURL(blobURL);
        };
        image.src = blobURL;

        if (onCapture) {
            onCapture();
        }
    };

    return (
        <div className="relative">
            <svg
                id="fsf-logo"
                width={width}
                height={height}
                viewBox="0 0 120 40"
                className={className}
            >
                {/* First F */}
                <text
                    x="10"
                    y="30"
                    fontFamily="Pretendard"
                    fontSize="28"
                    fontWeight="900"
                    fill="#FFE004"
                    stroke="#000000"
                    strokeWidth="2"
                >
                    F
                </text>

                {/* S with horns */}
                <g transform="translate(38, 30)">
                    {/* Left horn */}
                    <path
                        d="M2,-12 L4,-20 L6,-12"
                        fill="#FF0000"
                        stroke="#000000"
                        strokeWidth="1.5"
                    />
                    {/* Right horn */}
                    <path
                        d="M8,-12 L10,-20 L12,-12"
                        fill="#FF0000"
                        stroke="#000000"
                        strokeWidth="1.5"
                    />
                    {/* S text */}
                    <text
                        x="0"
                        y="0"
                        fontFamily="Pretendard"
                        fontSize="24"
                        fontWeight="900"
                        fill="#FF0000"
                        stroke="#000000"
                        strokeWidth="2"
                    >
                        s
                    </text>
                </g>

                {/* Last F */}
                <text
                    x="66"
                    y="30"
                    fontFamily="Pretendard"
                    fontSize="28"
                    fontWeight="900"
                    fill="#FFE004"
                    stroke="#000000"
                    strokeWidth="2"
                >
                    F
                </text>
            </svg>
            <button
                onClick={handleCapture}
                className="absolute top-0 right-0 -mt-2 -mr-2 p-2 bg-white rounded-full shadow-md hover:shadow-lg transition-shadow"
            >
                <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
            </button>
        </div>
    );
};

export default FSFLogo;
