interface FSFLogoProps {
    width?: number;
    height?: number;
    className?: string;
}

const FSFLogo = ({
    width = 120,
    height = 40,
    className = '',
}: FSFLogoProps) => (
    <svg
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
);

export default FSFLogo;
