//  in-memory store for data and version management

export const storedData: { [key: string]: string } = {}; // Maps hash to encrypted text
export const entries: { hash: string; proof: string[]; version: number; timestamp: string }[] = [];
export const historicalRoots: { version: number; root: string }[] = [];

