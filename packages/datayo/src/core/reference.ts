import { AttributeDefinition } from "./attribute";
import { Model } from "./model";
import { ReferenceContext } from "./reference-context";

export class Reference<T extends Model, PrimaryKey = any> implements PromiseLike<T> {
    constructor(
        readonly type : typeof Model, 
        readonly id : (reference : Reference<T, PrimaryKey>) => PrimaryKey,
        value? : T
    ) {
        this._result = value;
    }

    get definition() {
        return this.context?.definition;
    }

    get resolved() {
        return this._result !== undefined;
    }

    /**
     * Get the current result of this reference. If the reference is not yet resolved,
     * this will return `undefined`. Use `resolved` to check if the reference is resolved.
     */
    get result() {
        return this._result;
    }
    
    static from<T extends Model>(instance : T): Reference<T> {
        return new LiteralReference<T>(instance);
    }

    clone(): Reference<T> {
        return new Reference<T>(this.type, this.id, null);
    } 

    withContext(context : ReferenceContext) {
        let ref = this.clone();
        ref._context = context;
        return ref;
    }

    private _context : ReferenceContext;
    private _ready : Promise<T>;
    private _result : T;

    get context() {
        return this._context;
    }
    
    private async fetch(): Promise<T> {
        return this.type.database().provider.resolveReference(this);
    }

    /**
     * Resolve this reference so that it knows what object it is pointing to.
     * @returns this
     */
    async resolve() {
        if (this._result)
            return this._result;
        
        if (this._ready)
            return await this._ready;
        
        this._result = await (this._ready = this.fetch());
        return this;
    }

    async then<TResult1 = T, TResult2 = never>(onfulfilled?: (value: T) => TResult1 | PromiseLike<TResult1>, onrejected?: (reason: any) => TResult2 | PromiseLike<TResult2>): Promise<TResult1 | TResult2> {
        try {
            await this.resolve();
        } catch (e) {
            onrejected(e);
            return;
        }

        return Promise.resolve(this._result).then(onfulfilled);
    }
}

export class LiteralReference<T extends Model> extends Reference<T> { 
    constructor(value : T) {
        super(<typeof Model>value?.constructor, () => value?.primaryKey, value);
    }
}

export class DefinedReference<T extends Model> extends Reference<T> {
    constructor(
        private _definition : AttributeDefinition
    ) {
        super(null, null, null);
    }

    get definition() {
        return this._definition;
    }
}