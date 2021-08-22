
export interface NumberOperator {
    greaterThan?: Number;
    lessThan?: Number;
    not?: Number;
    between?: [Number, Number];
}

export interface StringOperator {
    includes?: string;
    matches?: string | RegExp;
    beginsWith?: string;
    endsWith?: string;
    not?: string;
}

export interface DateOperator {
    greaterThan?: Date;
    lessThan?: Date;
    not?: Date;
    between?: [Date, Date];
}

export type Criteria<T> = {
    [P in keyof T]?: (
        T[P] extends Number ?
            (T[P] | NumberOperator)
        : T[P] extends String ?
            (T[P] | StringOperator)
        : T[P] extends Date ?
            (T[P] | DateOperator)
        : T[P]
    );
}