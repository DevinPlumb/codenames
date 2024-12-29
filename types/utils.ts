// Utility types for array operations
export type ArrayCallback<T, R> = (item: T, index: number, array: T[]) => R
export type ArrayPredicate<T> = (item: T, index: number, array: T[]) => boolean 