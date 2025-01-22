import { PlayerDetailedInfo } from '@/types/api/responses';
import styles from './PersonDetailModal.module.css';
import Image from 'next/image';
import { getPlaceholderImageUrl } from '@/utils/imageUtils';
import { getDate } from '@/utils/date';
import { useModalStore } from '@/store/useModalStore';
import { PersonModalData } from '@/types/ui/modal';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/common/dialog';

interface PersonDetailModalProps {
    person: PlayerDetailedInfo;
    onClose: () => void;
}

export const PersonDetailModal = ({ person }: PersonDetailModalProps) => {
    const modalState = useModalStore();
    const personData = modalState.data as PersonModalData;
    const isManager = person.position === 'Manager';

    return (
        <Dialog
            open={modalState.type === 'personDetail'}
            onOpenChange={modalState.close}
        >
            <DialogContent
                className="z-50"
                aria-describedby="person-modal-description"
            >
                <DialogHeader>
                    <DialogTitle>{personData.name}</DialogTitle>
                    <DialogDescription id="person-modal-description">
                        Player information and statistics
                    </DialogDescription>
                </DialogHeader>
                <div className={styles.modalContent}>
                    <header className={styles.header}>
                        <div className={styles.imageContainer}>
                            <Image
                                src={
                                    personData.image ||
                                    getPlaceholderImageUrl(
                                        isManager ? 'manager' : 'player'
                                    )
                                }
                                alt={personData.name}
                                width={120}
                                height={120}
                                className={styles.personImage}
                                onError={(e) => {
                                    e.currentTarget.src =
                                        getPlaceholderImageUrl(
                                            isManager ? 'manager' : 'player'
                                        );
                                }}
                            />
                        </div>
                        <div className={styles.personInfo}>
                            <h2>{personData.name}</h2>
                            <div className={styles.basicInfo}>
                                <span className={styles.nationality}>
                                    {personData.nationality}
                                </span>
                                {!isManager && personData.shirtNumber && (
                                    <span className={styles.shirtNumber}>
                                        {personData.shirtNumber}
                                    </span>
                                )}
                                <span className={styles.position}>
                                    {personData.position}
                                </span>
                            </div>
                        </div>
                        <button
                            onClick={modalState.close}
                            className={styles.closeButton}
                        >
                            X
                        </button>
                    </header>

                    <div className={styles.content}>
                        <section className={styles.infoSection}>
                            <h3>Basic Information</h3>
                            <div className={styles.infoGrid}>
                                <div className={styles.infoItem}>
                                    <label>Birth Date</label>
                                    <span>
                                        {getDate(personData.dateOfBirth)}
                                    </span>
                                </div>
                                {personData.height && (
                                    <div className={styles.infoItem}>
                                        <label>Height</label>
                                        <span>{personData.height}</span>
                                    </div>
                                )}
                                {personData.weight && (
                                    <div className={styles.infoItem}>
                                        <label>Weight</label>
                                        <span>{personData.weight}</span>
                                    </div>
                                )}
                            </div>
                        </section>

                        {personData.description && (
                            <section className={styles.description}>
                                <h3>Background</h3>
                                <p>{personData.description}</p>
                            </section>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};
