import { AttributeDefinition } from "./attribute";
import { Model } from "./model";
import { registerAttribute } from "./private";
import { Constructor } from "../utils";
import { Collection, DefinedCollection } from "./collection";
import { DefinedReference, Reference } from "./reference";

/**
 * The model specified in HasMany() has a local reference to this model,
 * and there are expected to be more than one of them.
 * @param type 
 * @returns 
 */
 export function HasMany<T extends Model>(type : Constructor<T>, options? : HasManyOptions): Collection<T> {
    options.idAttribute = normalizeIdAttribute(options.idAttribute);

    return new DefinedCollection<T>({
        relation: 'has-many',
        designType: type
    });
}

export interface HasOneOptions {
    /**
     * The ID attribute on the other model that should be used
     * for relating this record to the other
     */
    idAttribute? : string | string[] | Record<string,string>;
}

export interface HasManyOptions {
    /**
     * The ID attribute on the other model that should be used
     * for relating this record to the others
     */
    idAttribute? : string | string[] | Record<string,string>;

    /**
     * Specify a different HasMany relation on this model that this relation is found through.
     */
    through? : string;

    /**
     * Specifies the relation on the objects of the "through" relation that 
     * should be used for this relation. If not specified, its assumed to be 
     * the same as the name of this relation.
     */
    throughRelation? : string;
}

export interface BelongsToOptions {
    /**
     * The ID attribute on this model that should be used for 
     * relating this record to the other
     */
    idAttribute? : string | string[] | Record<string,string>;
}

/**
 * The model specified in HasOne() has a local reference to this model.
 * This is a special case of HasMany(). 
 * @param type 
 * @returns 
 */
export function HasOne<T extends Model>(type : Constructor<T>, options? : HasOneOptions): Reference<T> {
    options.idAttribute = normalizeIdAttribute(options.idAttribute);
    
    return new DefinedReference<T>({
        relation: 'has-one',
        designType: type
    });
}

function normalizeIdAttribute(idAttribute : string | string[] | Record<string,string>) {
    if (!idAttribute)
        return undefined;
    
    if (typeof idAttribute === 'string') {
        idAttribute = { [idAttribute]: idAttribute };
    } else if (Array.isArray(idAttribute)) {
        idAttribute = idAttribute.reduce((pv, [k, v]) => (pv[k] = v, pv), {});
    }

    return idAttribute;
}
/**
 * The declaring model has a local reference to the model specified in the Belongs To
 * @param type 
 * @returns 
 */
export function BelongsTo<T extends Model>(type : Constructor<T>, options? : BelongsToOptions): Reference<T> {
    options.idAttribute = normalizeIdAttribute(options.idAttribute);

    return new DefinedReference<T>({
        relation: 'belongs-to',
        designType: type,
        idAttribute: options.idAttribute
    });
}

export function Relation() {
    return (target : Object, propertyKey) => {
        let $schema = <typeof Model>target.constructor;
        let definition : AttributeDefinition = {
            name: propertyKey,
            primaryKey: false
        };

        $schema[registerAttribute](propertyKey, definition);

        Object.defineProperty(target, propertyKey, {
            enumerable: true,
            get: function() {
                return this.getAttribute(propertyKey);
            },
            set: function (this : Model, value) {
                if (value instanceof DefinedCollection) {
                    Object.assign(definition, value.definition);
                    this.setAttribute(propertyKey, value);
                } else if (value instanceof DefinedReference) {
                    Object.assign(definition, value.definition);
                    this.setAttribute(propertyKey, value);
                } else {
                    // This is a real assignment at runtime.
                    if (definition.relation === 'belongs-to') {
                        let reference = <Reference<Model>>value;

                        if (!reference.resolved)
                            throw new Error(`Reference must be resolved before assignment. Assign "await reference.resolve()" instead`);
                        
                        let instance : Model = reference.result;

                        if (instance) {
                            // The local idAttribute must be updated
                            for (let key of Object.keys(definition.idAttribute)) {
                                this.setAttribute(key, instance.getAttribute(definition.idAttribute[key]));
                            }
                        }
                    } else if (definition.relation === 'has-one') {
                        let reference = <Reference<Model>>value;

                        if (!reference.resolved)
                            throw new Error(`Reference must be resolved before assignment. Assign "await reference.resolve()" instead`);
                        
                        let instance : Model = reference.result;

                        // The remote idAttribute must be updated
                        for (let key of Object.keys(definition.idAttribute)) {
                            instance.setAttribute(key, this.getAttribute(definition.idAttribute[key]));
                        }
                    } else if (definition.relation === 'has-many') {
                        let collection = <Collection<Model>>value;
                        
                        if (!collection.resolved) 
                            throw new Error(`Collection must be resolved before assignment. Assign "await collection.resolve()" instead`);

                        // The remote idAttribute must be updated
                        for (let instance of collection.results) {
                            for (let key of Object.keys(definition.idAttribute)) {
                                instance.setAttribute(key, this.getAttribute(definition.idAttribute[key]));
                            }
                        }
                    }

                    this.setAttribute(propertyKey, value);
                }
            }
        });
    };
}

export function Scope() {
    return (target, propertyKey) => {
        let designType = Reflect.getMetadata('design:type', target, propertyKey);
        let $schema = <typeof Model>target.constructor;
        let definition : AttributeDefinition = {
            designType,
            relation: 'scope',
            name: propertyKey,
            primaryKey: false
        };
        $schema[registerAttribute](propertyKey, definition);
    }
}