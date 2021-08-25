import { Constructor } from "../utils";
import { AttributeDefinition } from "./attribute";
import { Criteria } from "./criteria";
import { JoinedCollection } from "./join";
import { Model, ModelConstructor } from "./model";
import { ReferenceContext } from "./reference-context";

export interface CollectionParams<T, CriteriaT = Criteria<T>> {
    criteria? : CriteriaT;
    offset? : number;
    limit? : number;
    context? : ReferenceContext;
}
export class Collection<T, CriteriaT = Criteria<T>> implements AsyncIterable<T>, PromiseLike<T[]> {
    constructor(
        readonly type : typeof Model,
        params : CollectionParams<T, CriteriaT> = {},
        values? : T[]
    ) {
        this._params = Object.assign({}, params)
        this._results = values;
    }

    async then<TResult1 = T[], TResult2 = never>(onfulfilled?: (value: T[]) => TResult1 | PromiseLike<TResult1>, onrejected?: (reason: any) => TResult2 | PromiseLike<TResult2>): Promise<TResult1 | TResult2> {
        try {
            await this.resolve();
        } catch (e) {
            onrejected(e);
            return;
        }
        
        Promise.resolve(this._results).then(onfulfilled);
    }

    get definition() {
        return this.context?.definition;
    }

    async first() {
        return (await this.limit(1))[0];
    }

    private _params : CollectionParams<T, CriteriaT>;
    private _results : T[];
    private _resultsReady : Promise<T[]>;

    static from<T>(instances : T[]): Collection<T> {
        return new LiteralCollection<T>(null, {}, instances);
    }

    async reload() {
        this._results = null;
        this._resultsReady = null;
        return await this.resolve();
    }
    
    private async fetch() {
        return this.type.database().provider.resolveCollection(this);
    }

    get resolved() {
        return this._results !== undefined;
    }
    
    /**
     * Get the current result of this collection. If the collection is not yet resolved,
     * this will return `undefined`. Use `resolved` to check if the collection is resolved.
     */
    get results() {
        return this._results;
    }
    
    
    /**
     * Resolve this collection so it knows what its results are.
     * @returns 
     */
    async resolve() {
        if (this._results)
            return this._results;
        
        if (this._resultsReady)
            return await this._resultsReady
        
        this._results = await (this._resultsReady = Promise.resolve(this.fetch()));
        return this;
    }

    get criteria() {
        return Object.assign({}, this._params.criteria);
    }

    get params(): CollectionParams<T, CriteriaT> {
        return Object.assign({}, this._params, { criteria: this.criteria });
    }

    get context() {
        return this._params.context;
    }

    clone() {
        return new Collection<T, CriteriaT>(this.type, this.params, this._results);
    }

    where(criteria : CriteriaT): Collection<T, CriteriaT> {
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

    join<Key extends (string | symbol | number)>(name : Key): JoinedCollection<{ [ P in Key ]: T }> {
        return null;
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
                results ||= await this, 
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
