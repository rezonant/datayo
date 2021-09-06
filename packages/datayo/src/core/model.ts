import { Attribute, AttributeDefinition } from "./attribute";
import { ModelOptions } from "./model-options";
import { registerAttribute, registerModelOptions, markUnchanged, markPersisted } from "./private";
import { DefinedReference, Reference } from "./reference";
import { resolveCollection } from "./resolvers";
import { Constructor } from "../utils";
import { Collection, DefinedCollection } from "./collection";
import { Config, Database } from "../config";
import { v4 as uuid } from 'uuid';
import { Observable, Subject } from "rxjs";
import { Criteria } from "./criteria";

export interface ModelLifecycle {
    beforePersisting;
    afterPersisting;
    beforeSaving;
    afterSaving;
}

export interface AttributeValue<T> {
    value : T;
    changed : boolean;
}

export type Observables<T, SubjectT> = {
    [ P in keyof T ] : Observable<SubjectT>;
}

export type Subjects<T, SubjectT> = {
    [ P in keyof T ] : Subject<SubjectT>;
}

/**
 * Base class for models
 */
export class Model {
    /**
     * Construct a new instance of the model. 
     * Internal only: Use ModelType.new() instead, which is type-safe. (Typescript does 
     * not support accepting Partial<this> in constructors, see 
     * https://github.com/microsoft/TypeScript/issues/38038)
     * @param attributes 
     */
    constructor(attributes : Record<string,any>) {
        this.apply(<any>attributes);
        if (!this.hasAttributeValue('$instanceId'))
            this.$instanceId = uuid();

        this.notifyNewInstance();
        this.init();
        this.#initialized = true;
    }

    #initialized = false;

    [markUnchanged]() {
        this.#changed = false;
        Array.from(this.#attributes.entries()).forEach(([k,v]) => v.changed = false);
        return this;
    }

    [markPersisted]() {
        this.#persisted = true;
        return this;
    }

    private notifyNewInstance() {
        let $schema = <typeof Model>this.constructor;
        let observables : Subject<Model>[] = [];

        while ($schema._onNewInstance) {
            if (!observables.includes($schema._onNewInstance))
                observables.push($schema._onNewInstance);

            $schema = Object.getPrototypeOf($schema);
        }

        observables.forEach(o => o.next(this));
    }

    @Attribute() $instanceId : string;

    static readonly options : ModelOptions;
    private static _onNewInstance = new Subject<Model>();

    static onNewInstance<T>(this : ModelConstructor<T>): Observable<T> {
        if (!Object.getOwnPropertyDescriptor(this, '_onNewInstance')) {
            Object.defineProperty(this, '_onNewInstance', {
                value: new Subject<T>(),
                writable: false
            });
        }

        return <Subject<T>><unknown>this._onNewInstance;
    }

    private _lifecycle : Subjects<ModelLifecycle, this> = {
        beforePersisting: new Subject<this>(),
        afterPersisting: new Subject<this>(),
        beforeSaving: new Subject<this>(),
        afterSaving: new Subject<this>()
    }

    lifecycle(): Observables<ModelLifecycle, this> {
        return this._lifecycle;
    }

    static [registerModelOptions](options : ModelOptions) {
        if (!Object.getOwnPropertyDescriptor(this, 'options')) {
            Object.defineProperty(this, 'options', {
                value: options,
                writable: false
            });
        }
    }

    static database() {
        return Config.instance.databases.find(x => this.options?.database ? x.id === this.options.database : x.isDefault);
    }

    static new<T>(this : ModelConstructor<T>, attributes : Partial<T> = {}) {
        return new this(attributes);
    }

    static async create<T>(this : ModelConstructor<T>, attributes : Partial<T>) {
        return await this.new(attributes).save();
    }

    static async first<T>(this : ModelConstructor<T>): Promise<T> {
        return await this.all().first();
    }

    static where<T>(this : ModelConstructor<T>, criteria : Criteria<T>) {
        return this.all().where(criteria);
    }

    static find<T>(this : ModelConstructor<T>, id : string | number) {
        if (this.primaryKey.length > 1)
            throw new Error(`Cannot use find() on models with composite primary keys (use findBy() instead)`);
        let pkey = this.primaryKey[0];
        return this.all().findBy(<Criteria<T>><unknown>{ [pkey.name]: id });
    }

    static findBy<T>(this : ModelConstructor<T>, criteria : Criteria<T>) {
        return this.all().findBy(criteria);
    }

    static all<T>(this : ModelConstructor<T>): Collection<T> {
        return new Collection<T>(this);
    }

    /**
     * Override this in a subclass to initialize the object. Convenient for initializing a new instance without 
     * overridding the constructor and all that entails
     */
    protected init() {
    }

    #changed : boolean = false;
    #attributes = new Map<string,AttributeValue<any>>();
    #persisted : boolean = false;

    isPersisted() {
        return this.#persisted;
    }

    isChanged() {
        return !this.#persisted || this.#changed;
    }

    getChangesAsMap() {
        return new Map(Array.from(this.#attributes.entries()).filter(([k, v]) => v.changed).map(([k,v]) => [k, v.value]));
    }

    getChangesAsObject() {
        return Array.from(this.getChangesAsMap().entries()).reduce((obj, [k, v]) => (obj[k] = v, obj), <Record<string,any>>{});
    }

    getAttributesAsMap() {
        return new Map(Array.from(this.#attributes.entries()).map(([k,v]) => [k,v.value]));
    }
    
    getAttributesAsObject() {
        return Array.from(this.getAttributesAsMap().entries()).reduce((obj, [k, v]) => (obj[k] = v, obj), <Record<string,any>>{});
    }

    getChangedRelatedObjects() {
        for (let attr of this.$schema.relationDefinitions) {
            if (attr.relation === 'has-one' || attr.relation === 'has-many') {
                let ref : Reference<Model> = this.getAttribute(attr.name);
                
            }
        }
    }

    ref() {
        return Reference.from(this);
    }

    collect<T extends Model>(this : T, values : T[]) {
        return Collection.from(values);
    }

    setAttribute(key : string, value : any) {
        //console.log(`Setting [${this.constructor.name}/${this.$instanceId}].${key} = ${value}`);
        if (value instanceof DefinedCollection) {
            let criteria : Criteria<any>;
            value = new Collection<any>(<typeof Model>value.definition.designType);
        } else if (value instanceof DefinedReference) {
            value = new Reference<any>(<typeof Model>value.definition.designType, null, value.definition);
        }

        let definition = this.$schema.getAttribute(key);

        if (value instanceof Collection) {
            value = value.withContext({
                instance: this,
                attribute: key,
                definition
            });
        } else if (value instanceof Reference) {
            value = value.withContext({
                instance: this,
                attribute: key,
                definition
            });
        }

        let attribute = this.#attributes.get(key);
        
        if (attribute) {
            if (value !== attribute.value) {
                this.#changed = true;
                attribute.changed = true;
                attribute.value = value;
            }
        } else {
            this.#attributes.set(key, { value, changed: value !== undefined });
        }
    }

    hasAttributeValue(key : string) {
        return this.#attributes.has(key);
    }

    getAttribute(key : string) {
        return this.#attributes.get(key)?.value;
    }

    getAttributes(): Record<string,any> {
        return Array.from(this.#attributes.entries()).reduce((pv, [key, attr]) => (pv[key] = attr.value, pv), {});
    }

    isAttributeChanged(attr : string) {
        return this.#attributes.get(attr)?.changed || false;
    }

    clone() {
        return Model.new.apply(this.constructor, this.getAttributes());
    }

    get $schema(): typeof Model {
        return <typeof Model>this.constructor;
    }

    private static _attributeDefinitions = new Map<string, AttributeDefinition>();

    static get attributeDefinitions() {
        return Array.from(this._attributeDefinitions.values());
    }

    static get relationDefinitions() {
        return this.attributeDefinitions.filter(x => x.relation);
    }

    static hook<T>(this : ModelConstructor<T>, handler: (instance : T) => void) {
        this.onNewInstance().subscribe(handler);
    }

    static get attributes(): Record<string, AttributeDefinition> {
        return Array.from(this._attributeDefinitions.entries()).reduce((pv, [key, value]) => (pv[key] = value, pv), {});
    }

    static getAttribute(name : string) {
        return Object.assign({}, this._attributeDefinitions.get(name));
    }

    primaryKey(): any[] {
        return this.$schema.primaryKey.map(defn => this[defn.name]);
    }

    primaryCriteria(): Record<string,any> {
        return this.$schema.primaryKey
            .map(defn => [defn.name, this[defn.name]])
            .reduce((pv, [k, v]) => (pv[k] = v, pv), {})
        ;
    }

    static get primaryKey() {
        return Array.from(this._attributeDefinitions.values()).filter(x => x.primaryKey);
    }

    async destroy() {
        // TODO
    }

    database() {
        return this.$schema.database();
    }

    type() {
        return <typeof Model>this.constructor;
    }

    async save() {
        if (!this.isChanged())
            return true;

        let isPersisting = !this.isPersisted();

        for (let [key, attr] of this.#attributes.entries()) {
            if (!attr.changed)
                continue;

            let defn = this.type().getAttribute(key);
            
            if (!defn.relation)
                continue;

            
            if (attr.value instanceof Collection) {
                if (attr.value.resolved) {

                }
            } else if (attr.value instanceof Reference) {
                if (attr.value.resolved) {

                }
            }
        }

        if (isPersisting)
            this._lifecycle.beforePersisting.next(this);
        this._lifecycle.beforeSaving.next(this);
        await this.database().provider.persist(this);

        this[markPersisted]();
        this[markUnchanged]();
        
        if (isPersisting)
            this._lifecycle.afterPersisting.next(this);
        this._lifecycle.afterSaving.next();
    
        return this;
    }

    apply<T extends Model>(this : T, attributes : Partial<T>) {
        Object.assign(this, attributes);
        return this;
    }

    async update<T extends Model>(this : T, attributes : Partial<T>) {
        return this.apply(attributes).save();
    }

    static [registerAttribute](name : string, definition : AttributeDefinition) {
        if (!Object.getOwnPropertyDescriptor(this, '_attributeDefinitions')) {
            Object.defineProperty(this, '_attributeDefinitions', {
                value: new Map<string, AttributeDefinition>(),
                writable: false
            });
        }
        this._attributeDefinitions.set(name, definition);
    }
}

export type ModelConstructor<T> = { 
    new(...args) : T;
} & typeof Model;
