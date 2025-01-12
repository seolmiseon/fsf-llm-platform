import { PlayerDetailedInfo } from '@/types/api/responses';
import styles from './PersonDetailModal.module.css';
import Image from 'next/image';
import { getPlaceholderImageUrl } from '@/utils/imageUtils';
import { getDate } from '@/utils/date';

interface PersonDetailModalProps {
    person: PlayerDetailedInfo;
    onClose: () => void;
}

export const PersonDetailModal = ({
    person,
    onClose,
}: PersonDetailModalProps) => {
    const isManager = person.position === 'Manager';

    return (
        <div className={styles.modalContent}>
            <header className={styles.header}>
                <div className={styles.imageContainer}>
                    <Image
                        src={
                            person.image ||
                            getPlaceholderImageUrl(
                                isManager ? 'manager' : 'player'
                            )
                        }
                        alt={person.name}
                        width={120}
                        height={120}
                        className={styles.personImage}
                        onError={(e) => {
                            e.currentTarget.src = getPlaceholderImageUrl(
                                isManager ? 'manager' : 'player'
                            );
                        }}
                    />
                </div>
                <div className={styles.personInfo}>
                    <h2>{person.name}</h2>
                    <div className={styles.basicInfo}>
                        <span className={styles.nationality}>
                            {person.nationality}
                        </span>
                        {!isManager && person.shirtNumber && (
                            <span className={styles.shirtNumber}>
                                {person.shirtNumber}
                            </span>
                        )}
                        <span className={styles.position}>
                            {person.position}
                        </span>
                    </div>
                </div>
                <button onClick={onClose} className={styles.closeButton}>
                    X
                </button>
            </header>

            <div className={styles.content}>
                <section className={styles.infoSection}>
                    <h3>Basic Information</h3>
                    <div className={styles.infoGrid}>
                        <div className={styles.infoItem}>
                            <label>Birth Date</label>
                            <span>{getDate(person.dateOfBirth)}</span>
                        </div>
                        {person.height && (
                            <div className={styles.infoItem}>
                                <label>Height</label>
                                <span>{person.height}</span>
                            </div>
                        )}
                        {person.weight && (
                            <div className={styles.infoItem}>
                                <label>Weight</label>
                                <span>{person.weight}</span>
                            </div>
                        )}
                    </div>
                </section>

                {person.description && (
                    <section className={styles.description}>
                        <h3>Background</h3>
                        <p>{person.description}</p>
                    </section>
                )}
            </div>
        </div>
    );
};
