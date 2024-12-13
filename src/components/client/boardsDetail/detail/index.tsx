'use client';

import Image from 'next/image';
import styles from './styles.module.css';
import { getDate } from '@/commons/units/date';
import { useBoardsDetail } from './hook';
import Link from 'next/link';
import CommentWriteUI from '../commentWrite/index';
import CommentListUI from '../commentList/index';
import { Tooltip } from '@mui/material';
import { useYoutube } from '@/components/youtube/hook';
import Youtube from '@/components/youtube';

export default function BoardsDetailUI(): JSX.Element {
    const { data, boardId, loading, error, handleOnClickList } =
        useBoardsDetail();
    const { selectedVideoId, handleVideoSelect } = useYoutube();

    if (loading) return <p>Loading...</p>;
    if (error) return <p>Error: {error.message}</p>;

    if (!data) {
        return <p>다시 하라한다</p>;
    }
    return (
        <>
            <div className={styles.layout}>
                <div className={styles.detailMain}>
                    <div className={styles.title}>{data.title}</div>
                    <div className={styles.profile}>
                        <div className={styles.userProfile}>
                            <div className={styles.left}>
                                <Image
                                    src="/images/userIcon.png"
                                    alt="profile"
                                    className={styles.userIcon}
                                    width={0}
                                    height={0}
                                />
                                <div className={styles.userName}>
                                    {data.writer}
                                </div>
                            </div>

                            <div className={styles.date}>
                                {getDate(data.createdAt)}
                            </div>
                        </div>
                        <div className={styles.iconWrapper}>
                            <Image
                                src="/images/linkIcon.png"
                                alt="링크"
                                className={styles.linkIcon}
                                width={0}
                                height={0}
                            />
                            <Tooltip
                                title={`${data.boardAddress.zipcode} ${data.boardAddress.address}`}
                                arrow
                            >
                                <Image
                                    src="/images/mapIcon.png"
                                    alt="위치"
                                    className={styles.mapIcon}
                                    width={24}
                                    height={24}
                                />
                            </Tooltip>
                        </div>
                    </div>

                    <section className={styles.section}>
                        {data?.images && data.images.length > 0 ? (
                            data.images.map((image: string, index: number) => (
                                <div key={index} className={styles.contentImg}>
                                    <Image
                                        src={image}
                                        alt={`uploaded-${index}`}
                                        width={700}
                                        height={475}
                                    />
                                </div>
                            ))
                        ) : (
                            <p>이미지가 없어요</p>
                        )}

                        <article className={styles.contentText}>
                            {data.contents}
                        </article>
                        <article className={styles.playArea}>
                            {selectedVideoId && (
                                <Youtube
                                    videoId={selectedVideoId}
                                    onVideoSelect={handleVideoSelect}
                                />
                            )}
                        </article>
                        <article className={styles.likeCount}>
                            <div className={styles.icon}>
                                <Image
                                    src="/images/breakHeart.png"
                                    alt="삐빅"
                                    width={24}
                                    height={24}
                                />
                                <div>0</div>
                            </div>
                            <div className={styles.icon}>
                                <Image
                                    src="/images/likeHeart.png"
                                    alt="좋다"
                                    width={24}
                                    height={24}
                                />
                                <div>12</div>
                            </div>
                        </article>
                    </section>

                    <div className={styles.buttonWrapper}>
                        <button
                            type="button"
                            className={styles.listBtn}
                            onClick={handleOnClickList}
                        >
                            목록으로
                        </button>
                        <Link href={`/boards/${boardId}/edit`}>
                            <button type="button" className={styles.editBtn}>
                                수정하기
                            </button>
                        </Link>
                    </div>
                </div>
            </div>
            <CommentWriteUI />
            <CommentListUI />
        </>
    );
}
