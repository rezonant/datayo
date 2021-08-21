import { Constructor } from "./decorators";
import { registerAttribute, registerModelOptions } from "./private";
import { Collection, DefinedCollection, DefinedReference, Reference } from "./relation";

export interface AttributeDefinition {
    name? : string;

    /**
     * The attribute that contains the primary ID reference to the related 
     * object. On BelongsTo(), this is on the local record. On HasOne/HasMany() it 
     * is on the remove record
     */
    idAttribute? : string;
    designType? : Function;
    primaryKey? : boolean;
    relation? : 'has-one' | 'has-many' | 'belongs-to' | 'scope';
}

export interface DatabaseProvider {
    resolveCollection<T>(collection : Collection<T>) : Promise<T[]>;
    resolveReference<T>(reference : Reference<T>) : Promise<T>;
}

export class Database {
    id : string;
    default? : boolean;
    provider : DatabaseProvider;
}

export class ConfigSchema {
    databases? : Database[];
}

export class Config {
    private static _finder : () => ConfigSchema;
    private static _config : ConfigSchema = {};

    /**
     * Allows you to specify how the config should be found at the moment it needs to 
     * be referenced. The rest of the system does not keep a reference to the object 
     * returned by `Config.instance` so that you can implement on-demand strategies for 
     * locating the config, such as via zone.js.
     * @param finder 
     */
    static setFinder(finder : () => ConfigSchema) {
        this._finder = finder;
    }

    static get instance() {
        if (this._finder)
            return this._finder();
        return this._config;
    }
}

export interface ModelOptions {
    tableName : string;
    database : string;
}

export function ModelOptions(options : ModelOptions) {
    return (target : typeof Model) => target[registerModelOptions](options);
}

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

    init() {
    }

    #changed : boolean = false;
    #attributes = new Map<string,any>();
    #persisted : boolean = false;

    isPersisted() {
        return this.#persisted;
    }

    markPersisted() {
        this.#persisted = true;
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

async function resolveCollection<T>(collection : Collection<T>) {
    let model = collection.context.instance.$schema;
    let db = Config.instance.databases.find(x => x.default);

    if (model.options.database)
        db = Config.instance.databases.find(x => x.id === model.options.database);
    
    if (!db)
        throw new Error(`Cannot resolve collection: No matching database found`);

    return db.provider.resolveCollection<T>(collection);
}

async function resolveReference<T>(reference : Reference<T>) {
    let model = reference.context.instance.$schema;
    let db = Config.instance.databases.find(x => x.default);

    if (model.options.database)
        db = Config.instance.databases.find(x => x.id === model.options.database);
    
    if (!db)
        throw new Error(`Cannot resolve reference: No matching database found`);

    return db.provider.resolveReference<T>(reference);
}
