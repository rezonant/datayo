
export interface NumberOperator {
    greaterThan?: Number;
    lessThan?: Number;
    not?: Number;
    between?: [Number, Number];
}

export interface StringOperator {
    includes?: string;
    matches?: string | RegExp;
    startsWith?: string;
    endsWith?: string;
    not?: string;
}

export interface DateOperator {
    greaterThan?: Date;
    lessThan?: Date;
    not?: Date;
    between?: [Date, Date];
}

export type AttributeCriteria<T> = T extends Number ?
    (T | NumberOperator)
    : T extends String ?
    (T | StringOperator)
    : T extends Date ?
    (T | DateOperator)
    : T
;

export type Criteria<T> = {
    [P in keyof T]?: AttributeCriteria<T[P]>;
}