import { AttributeDefinition } from "./attributes";
import { ReferenceContext } from "./reference-context";

export interface CollectionParams<T> {
    criteria? : Partial<T>;
    offset? : number;
    limit? : number;
    context? : ReferenceContext;
}

export class Collection<T> implements AsyncIterable<T>, PromiseLike<T[]> {
    constructor(
        private fetcher : (collection : Collection<T>) => Promise<T[]>,
        params : CollectionParams<T> = {}
    ) {
        this._params = Object.assign({}, params)
    }

    then<TResult1 = T[], TResult2 = never>(onfulfilled?: (value: T[]) => TResult1 | PromiseLike<TResult1>, onrejected?: (reason: any) => TResult2 | PromiseLike<TResult2>): Promise<TResult1 | TResult2> {
        return this.toPromise().then(onfulfilled, onrejected);
    }

    private _params : CollectionParams<T>;
    private _results : T[];
    private _resultsReady : Promise<T[]>;

    static from<T>(instances : T[]): Collection<T> {
        return new LiteralCollection<T>(async () => instances);
    }

    async reload() {
        this._results = null;
        this._resultsReady = null;
        return await this.toPromise();
    }
    
    async toPromise() {
        if (this._results)
            return this._results;
        
        if (this._resultsReady)
            return await this._resultsReady
        
        return this._results = await (this._resultsReady = Promise.resolve(this.fetcher(this)));
    }

    get criteria() {
        return Object.assign({}, this._params.criteria);
    }

    get params(): CollectionParams<T> {
        return Object.assign({}, this._params, { criteria: this.criteria });
    }

    get context() {
        return this._params.context;
    }

    clone() {
        return new Collection<T>(this.fetcher, this.params);
    }

    where(criteria : Partial<T>) {
        let clone = this.clone();
        Object.assign(clone._params.criteria, criteria);
        return clone;
    }

    offset(value : number) {
        let clone = this.clone();
        clone._params.offset = value;
        return clone;
    }

    limit(value : number) {
        let clone = this.clone();
        clone._params.limit = value;
        return clone;
    }

    withContext(context : ReferenceContext) {
        let clone = this.clone();
        clone._params.context = context;
    }

    [Symbol.asyncIterator](): AsyncIterator<T> {
        let results : T[];
        let index = 0;

        return {
            next: async () => (
                results ||= await this.toPromise(), 
                {
                    done: index >= results.length,
                    value: results[index]
                }
            )
        }
    }
}

export class LiteralCollection<T> extends Collection<T> {}

export class DefinedCollection<T> extends Collection<T> {
    constructor(
        readonly definition : AttributeDefinition
    ) {
        super(null, {});
    }
}
