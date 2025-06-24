export const PlayerModeEnum = {
    Train: 'train',
    FreeCam: 'freecam',
} as const;

export type PlayerModeEnum = typeof PlayerModeEnum[keyof typeof PlayerModeEnum];