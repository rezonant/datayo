import { Constructor } from "../utils";
import { AttributeDefinition } from "./attribute";
import { Criteria } from "./criteria";
import { Model, ModelConstructor } from "./model";
import { ReferenceContext } from "./reference-context";

export interface CollectionParams<T> {
    criteria? : Criteria<T>;
    offset? : number;
    limit? : number;
    context? : ReferenceContext;
}

export type JoinableKeys<Joined> = {
    [P in keyof Joined] : (
        Joined[P] extends Function ? never 
        : P
    )
;
}[keyof Joined];

export type JoinCriteria<Joined, Joiner> = {
    [P in JoinableKeys<Joined>] : keyof Joiner;
}
export interface JoinOptions<Joined, Joiner> {
    on?: JoinCriteria<Joined, Joiner>;
}

export class Collection<T> implements AsyncIterable<T>, PromiseLike<T[]> {
    constructor(
        readonly type : typeof Model,
        params : CollectionParams<T> = {},
        values? : T[]
    ) {
        this._params = Object.assign({}, params)
        this._results = values;
    }

    then<TResult1 = T[], TResult2 = never>(onfulfilled?: (value: T[]) => TResult1 | PromiseLike<TResult1>, onrejected?: (reason: any) => TResult2 | PromiseLike<TResult2>): Promise<TResult1 | TResult2> {
        return this.toPromise().then(onfulfilled, onrejected);
    }

    get definition() {
        return this.context?.definition;
    }

    async first() {
        return (await this.limit(1))[0];
    }

    private _params : CollectionParams<T>;
    private _results : T[];
    private _resultsReady : Promise<T[]>;

    static from<T>(instances : T[]): Collection<T> {
        return new LiteralCollection<T>(null, {}, instances);
    }

    async reload() {
        this._results = null;
        this._resultsReady = null;
        return await this.toPromise();
    }
    
    private async fetch() {
        return this.type.database().provider.resolveCollection(this);
    }

    async toPromise() {
        if (this._results)
            return this._results;
        
        if (this._resultsReady)
            return await this._resultsReady
        
        return this._results = await (this._resultsReady = Promise.resolve(this.fetch()));
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
        return new Collection<T>(this.type, this.params, this._results);
    }

    where(criteria : Criteria<T>) {
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

    join<Joiner>(type : ModelConstructor<Joiner>, options? : JoinOptions<Joiner, T>) {
        
    }

    withContext(context : ReferenceContext) {
        let clone = this.clone();
        clone._params.context = context;
        return clone;
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
        private _definition : AttributeDefinition
    ) {
        super(<typeof Model>_definition.designType, {});
    }

    get definition() {
        return this._definition;
    }
}
