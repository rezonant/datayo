import { AttributeDefinition } from "./attributes";
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
 export function HasMany<T>(type : Constructor<T>, options? : HasManyOptions): Collection<T> {
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
    idAttribute : string;
}

export interface HasManyOptions {
    /**
     * The ID attribute on the other model that should be used
     * for relating this record to the others
     */
    idAttribute : string;

    /**
     * Specify a different HasMany relation on this model that this relation is found through.
     */
    through : string;

    /**
     * Specifies the relation on the objects of the "through" relation that 
     * should be used for this relation. If not specified, its assumed to be 
     * the same as the name of this relation.
     */
    throughRelation : string;
}

export interface BelongsToOptions {
    /**
     * The ID attribute on this model that should be used for 
     * relating this record to the other
     */
    idAttribute : string;
}

/**
 * The model specified in HasOne() has a local reference to this model.
 * This is a special case of HasMany(). 
 * @param type 
 * @returns 
 */
export function HasOne<T>(type : Constructor<T>, options? : HasOneOptions): Reference<T> {
    return new DefinedReference<T>({
        relation: 'has-one',
        designType: type
    });
}

/**
 * The declaring model has a local reference to the model specified in the Belongs To
 * @param type 
 * @returns 
 */
export function BelongsTo<T>(type : Constructor<T>): Reference<T> {
    return new DefinedReference<T>({
        relation: 'belongs-to',
        designType: type
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
                } else if (value instanceof DefinedReference) {
                    Object.assign(definition, value.definition);
                }

                this.setAttribute(propertyKey, value);
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