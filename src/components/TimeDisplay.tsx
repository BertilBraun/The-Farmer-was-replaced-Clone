import React from 'react';

interface TimeDisplayProps {
    seconds: number;
}

export const TimeDisplay: React.FC<TimeDisplayProps> = ({ seconds }) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);

    if (minutes === 0) {
        return <p>{remainingSeconds} sec</p>;
    }
    return <p>{minutes} min {remainingSeconds} sec</p>;
};
