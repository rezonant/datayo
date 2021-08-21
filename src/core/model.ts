import { AttributeDefinition } from "./attributes";
import { ModelOptions } from "./model-options";
import { registerAttribute, registerModelOptions } from "./private";
import { DefinedReference, Reference } from "./reference";
import { resolveCollection } from "./resolvers";
import { Constructor } from "../utils";
import { Collection, DefinedCollection } from "./collection";

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
        this.init();
    }

    static readonly options : ModelOptions;

    static [registerModelOptions](options : ModelOptions) {
        if (!Object.getOwnPropertyDescriptor(this, 'options')) {
            Object.defineProperty(this, 'options', {
                value: options,
                writable: false
            });
        }
    }

    static new<T>(this : Constructor<T>, attributes : Partial<T> = {}) {
        return new this(attributes);
    }

    static where<T>(this : Constructor<T>, criteria : Partial<T>): Collection<T> {
        return new Collection<T>(resolveCollection).where(criteria);
    }

    static all<T>(): Collection<T> {
        return new Collection<T>(resolveCollection);
    }

    /**
     * Override this in a subclass to initialize the object. Convenient for initializing a new instance without 
     * overridding the constructor and all that entails
     */
    protected init() {
    }

    #changed : boolean = false;
    #attributes = new Map<string,any>();
    #persisted : boolean = false;

    isPersisted() {
        return this.#persisted;
    }

    isChanged() {
        return this.#changed;
    }

    ref() {
        return Reference.from(this);
    }

    collect(values : this[]) {
        return Collection.from(values);
    }

    setAttribute(key : string, value : any) {

        if (value instanceof DefinedCollection) {
            value = new Collection<any>(async collection => {
                return []; // TODO
            });
        } else if (value instanceof DefinedReference) {
            value = new Reference<any>(async reference => {
                return null; // TODO
            });

        }

        if (value instanceof Collection) {
            value = value.withContext({
                instance: this,
                attribute: key
            });
        }

        let existed = this.#attributes.has(key);
        let originalValue = this.#attributes.get(key);
        
        if (existed && value !== originalValue)
            this.#changed = true;

        this.#attributes.set(key, value);
    }

    getAttribute(key : string) {
        this.#attributes.get(key);
    }

    getAttributes(): Record<string,any> {
        return Array.from(this.#attributes.entries()).reduce((pv, [key, value]) => (pv[key] = value, pv), {});
    }

    clone() {
        return Model.new.apply(this.constructor, this.getAttributes());
    }

    get $schema(): typeof Model {
        return <typeof Model><unknown>this.constructor;
    }

    private static attributeDefinitions = new Map<string, AttributeDefinition>();

    static get attributes() {
        return Array.from(this.attributeDefinitions.entries()).reduce((pv, [key, value]) => (pv[key] = value, pv), {});
    }

    static getAttribute(name : string) {
        return Object.assign({}, this.attributeDefinitions.get(name));
    }

    // static get primaryKey() {
        
    // }

    async destroy() {
        // TODO
    }

    async save() {
        // TODO
        this.#persisted = true;
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
        if (!Object.getOwnPropertyDescriptor(this, 'attributeDefinitions')) {
            Object.defineProperty(this, 'attributeDefinitions', {
                value: new Map<string, AttributeDefinition>(),
                writable: false
            });
        }
        this.attributeDefinitions.set(name, definition);
    }
}
