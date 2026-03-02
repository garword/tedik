'use client';

import { useState } from 'react';

interface Props {
    src?: string | null;
    alt: string;
    className?: string;
    fallbackSrc?: string;
    fallbackText?: string;
}

export default function ImageFallback({
    src,
    alt,
    className,
    fallbackSrc = 'https://placehold.co/600x400/e2e8f0/64748b',
    fallbackText = 'Tanpa Gambar'
}: Props) {
    const [imgSrc, setImgSrc] = useState(src || `${fallbackSrc}?text=${fallbackText.replace(/\s+/g, '+')}`);

    return (
        <img
            src={imgSrc}
            alt={alt}
            className={className}
            onError={() => {
                setImgSrc(`${fallbackSrc}?text=${fallbackText.replace(/\s+/g, '+')}`);
            }}
        />
    );
}
