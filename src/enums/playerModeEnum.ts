export const PlayerMode = {
    Train: 'train',
    FreeCam: 'freecam',
} as const;

export type PlayerMode = typeof PlayerMode[keyof typeof PlayerMode];