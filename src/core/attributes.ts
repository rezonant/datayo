import { Model } from "./model";
import { registerAttribute } from "./private";


export interface AttributeOptions {
    primaryKey? : boolean;
}

export function Attribute(options : AttributeOptions = {}) {
    return (target : Object, propertyKey) => {
        let designType = Reflect.getMetadata('design:type', target, propertyKey);
        let $schema = <typeof Model>target.constructor;
        let definition : AttributeDefinition = {
            designType,
            name: propertyKey,
            primaryKey: false,
            ...options
        };

        if (designType === Object)
            throw new Error(`class ${target.constructor.name}: Cannot determine type of @Attribute() ${propertyKey}`);

        $schema[registerAttribute](propertyKey, definition);

        Object.defineProperty(target, propertyKey, {
            enumerable: true,
            get: function() {
                return this.getAttribute(propertyKey);
            },
            set: function (this : Model, value) {
                this.setAttribute(propertyKey, value);
            }
        });
    };
}

export function Id() {
    return Attribute({ primaryKey: true });
}
/**
 * Defines an attribute on a model. Final attribute definition is sourced from a number of places.
 */
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
