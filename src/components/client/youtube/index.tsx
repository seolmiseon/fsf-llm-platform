'use client';

import YouTube from 'react-youtube';

import styles from '@/components/boardsWrite/styles.module.css';

interface YoutubeProps {
    videoId: string;
    onVideoSelect: (videoId: string) => void;
}

export default function Youtube({ videoId, onVideoSelect }: YoutubeProps) {
    const getVideoUrl = (url: string): string | undefined => {
        const regex =
            /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
        const match = url.match(regex);
        return match ? match[1] : undefined;
    };

    const handleYoutubeUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const url = e.target.value;
        const gettingVideoUrl = getVideoUrl(url);
        if (gettingVideoUrl) {
            onVideoSelect(gettingVideoUrl);
        }
    };

    return (
        <>
            <div className={styles.formContent}>
                <input
                    id="youtubeUrl"
                    className={styles.youtubeUrl}
                    type="url"
                    placeholder="링크를 입력해주세요"
                    onChange={handleYoutubeUrlChange}
                    autoComplete="url"
                />

                {videoId && (
                    <YouTube
                        videoId={videoId}
                        opt={{
                            width: '100%',
                            height: '310px',
                            playerVars: { autoplay: 1 },
                        }}
                        onEnd={(e: {
                            target: { stopVideo: (arg0: number) => void };
                        }) => {
                            e.target.stopVideo(0);
                        }}
                    />
                )}
            </div>
        </>
    );
}
