import { AttributeDefinition } from "./attributes";
import { ReferenceContext } from "./reference-context";

export class Reference<T> implements PromiseLike<T> {
    constructor(private fetcher : (reference : Reference<T>) => Promise<T>) {

    }

    static from<T>(instance : T): Reference<T> {
        return new LiteralReference<T>(async () => instance);
    }

    withContext(context : ReferenceContext) {
        let ref = new Reference<T>(this.fetcher);
        ref._context = context;
        return context;
    }

    private _context : ReferenceContext;
    private _ready : Promise<T>;
    private _result : T;

    get context() {
        return this._context;
    }
    
    async resolve() {
        if (this._result)
            return this._result;
        
        if (this._ready)
            return await this._ready;
        
        return this._result = await (this._ready = this.fetcher(this));
    }

    async then<TResult1 = T, TResult2 = never>(onfulfilled?: (value: T) => TResult1 | PromiseLike<TResult1>, onrejected?: (reason: any) => TResult2 | PromiseLike<TResult2>): Promise<TResult1 | TResult2> {
        return this.resolve().then(onfulfilled, onrejected);
    }
}

export class LiteralReference<T> extends Reference<T> { }

export class DefinedReference<T> extends Reference<T> {
    constructor(
        readonly definition : AttributeDefinition
    ) {
        super(null);
    }
}