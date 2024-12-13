'use client';

import Image from 'next/image';
import styles from './styles.module.css';
import { getDate } from '@/commons/units/date';
import useCommentList from './hook';
import BoardRatingUI from '@/components/rating';
import InfiniteScroll from '@/components/boardsList/InfiniteScroll';
import EditIcon from '../commentIcons/editIcon';
import DeleteIcon from '../commentIcons/deleteIcon';

export default function CommentListUI() {
    const { data, fetchComments, hasMore, loading } = useCommentList();

    const loadMoreComments = async (): Promise<void> => {
        if (hasMore && !loading) {
            await fetchComments();
        }
    };

    return (
        <InfiniteScroll
            onLoadMore={loadMoreComments}
            hasMore={hasMore}
            loading={loading}
        >
            <div>
                {data?.map((el) => (
                    <div className={styles.itemWrapper} key={el._id}>
                        <div className={styles.imagesWrapper}>
                            <span className={styles.leftIcon}>
                                <Image
                                    src="/images/userIcon.png"
                                    alt="userIcon"
                                    width={24}
                                    height={24}
                                />
                                <BoardRatingUI />
                            </span>
                            <span className={styles.rightIcon}>
                                <EditIcon />
                                <DeleteIcon el={el} />
                            </span>
                        </div>
                        <textarea className="commentContents">
                            {el.contents}
                        </textarea>
                        <div className={styles.date}>
                            {' '}
                            {getDate(el?.createdAt)}{' '}
                        </div>
                    </div>
                ))}
                {loading && <div className={styles.loading}>Loading...</div>}
            </div>
        </InfiniteScroll>
    );
}
