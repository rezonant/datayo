
export type FieldKeys<T> = {
    [P in keyof T] : (
        T[P] extends Function ? never 
        : P
    )
;
}[keyof T];