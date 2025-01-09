import { useState, useEffect } from 'react';

interface Position {
    x: number;
    y: number;
}

interface ModalDimensions {
    width: number;
    height: number;
}

export const useModalPosition = (
    initialPosition: Position,
    modalDimensions: ModalDimensions
) => {
    const [position, setPosition] = useState(initialPosition);

    useEffect(() => {
        const adjustPosition = () => {
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            const padding = 20;

            const newPosition = {
                x: Math.min(
                    initialPosition.x,
                    viewportWidth - modalDimensions.width - padding
                ),
                y: Math.min(
                    initialPosition.y,
                    viewportHeight - modalDimensions.height - padding
                ),
            };

            if (newPosition.x < padding) {
                newPosition.y = padding;
            }

            if (newPosition.y < padding) {
                newPosition.x = padding;
            }
            setPosition(newPosition);
        };

        adjustPosition();
        window.addEventListener('resize', adjustPosition);

        return () => {
            window.removeEventListener('resize', adjustPosition);
        };
    }, [initialPosition, modalDimensions]);

    return position;
};
