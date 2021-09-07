import { AttributeDefinition } from "./attribute";
import { Model, ModelConstructor } from "./model";
import { registerAttribute } from "./private";
import { Constructor, upperCamelCase } from "../utils";
import { Collection, CollectionParams, DefinedCollection } from "./collection";
import { DefinedReference, Reference } from "./reference";
import { Criteria } from "./criteria";
import { lowerCamelCase } from "../utils";
import { Attribute } from ".";

export class HasManyCollection<T extends Model, CriteriaT = Criteria<T>> extends DefinedCollection<T, CriteriaT> {
    through<U extends Model>(
        through : (model : T) => Collection<U> | Reference<U>, 
        via : (model : U) => Reference<T> | Collection<T, CriteriaT>
    ) {
        return new HasManyCollection<T>(Object.assign({}, this.definition, <AttributeDefinition>{
            through,
            via
        }));
    }
}

/**
 * The model specified in HasMany() has a local reference to this model,
 * and there are expected to be more than one of them.
 * @param type 
 * @returns 
 */
 export function HasMany<T extends Model>(type : Constructor<T>, options? : HasManyOptions<Model, T>) {
    return new HasManyCollection<T>({
        relation: 'has-many',
        designType: type,
        idAttribute: normalizeIdAttribute(options?.idAttribute),
        via: options.via,
        through: options.through
    });
}

export interface HasOneOptions {
    /**
     * The ID attribute on the other model that should be used
     * for relating this record to the other
     */
    idAttribute? : string | string[] | Record<string,string>;
}

export interface HasManyOptions<SelfT = Model, SubjectT = Model> {
    /**
     * The ID attribute on the other model that should be used
     * for relating this record to the others
     */
    idAttribute? : string | string[] | Record<string,string>;

    via? : (model : SubjectT) => Reference<any>

    /**
     * Specify a different HasMany relation on this model that this relation is found through.
     */
    through? : (model : SelfT) => Reference<any> | Collection<any>;

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
export function BelongsTo<T extends Model>(type : ModelConstructor<T>, options? : BelongsToOptions): Reference<T> {
    
    let defaultIdAttribute = type.primaryKey
        .reduce(
            (idAttr, id) => (
                idAttr[lowerCamelCase(type.name) + upperCamelCase(id.name)] = id.name, 
                idAttr
            ), 
            <Record<string,string>>{}
        )
    ;

    return new DefinedReference<T>({
        relation: 'belongs-to',
        designType: type,
        idAttribute: normalizeIdAttribute(options?.idAttribute || defaultIdAttribute)
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

                    if (!definition.idAttribute) {
                        definition.idAttribute = this.type().primaryKey
                            .reduce(
                                (idAttr, id) => (
                                    idAttr[lowerCamelCase(this.type().name) + upperCamelCase(id.name)] = id.name, 
                                    idAttr
                                ), 
                                <Record<string,string>>{}
                            )
                        ;
                    }

                    this.setAttribute(propertyKey, value);
                } else if (value instanceof DefinedReference) {
                    Object.assign(definition, value.definition);

                    // Create attribute definition(s) for idAttribute

                    if (definition.relation === 'belongs-to') {
                        let remoteType = <typeof Model>definition.designType;
                        for (let key of Object.keys(definition.idAttribute)) {
                            let primaryAttr = remoteType.getAttribute(definition.idAttribute[key]);

                            if (!primaryAttr)
                                throw new Error(`Cannot find primary attribute '${definition.idAttribute[key]}' on type ${remoteType.name}`);
                            
                            if (!$schema.getAttribute(key)) {
                                Reflect.defineMetadata('design:type', primaryAttr.designType, $schema.prototype, key);
                                Attribute()($schema.prototype, key);
                            }
                        }
                    }
                    
                    if (!definition.idAttribute) {
                        let identityModel = definition.relation === 'has-one'
                            ? this.type() 
                            : <typeof Model>definition.designType
                        ;

                        definition.idAttribute = identityModel.primaryKey
                            .reduce(
                                (idAttr, id) => (
                                    idAttr[lowerCamelCase(identityModel.name) + upperCamelCase(id.name)] = id.name, 
                                    idAttr
                                ), 
                                <Record<string,string>>{}
                            )
                        ;
                    }
                    
                    this.setAttribute(propertyKey, value);
                } else {
                    // This is a real assignment at runtime.
                    if (definition.relation === 'belongs-to') {
                        let reference = <Reference<Model>>value;

                        if (reference.resolved) {
                            let instance = reference.result;
                            if (instance) {
                                // The local idAttribute must be updated
                                for (let key of Object.keys(definition.idAttribute)) {
                                    if (process.env.DATAYO_DIAGNOSTICS)
                                        console.log(`belongs-to assign: setting ${this}.${key} = <that>.${definition.idAttribute[key]}`);
                                    this.setAttribute(key, instance.getAttribute(definition.idAttribute[key]));
                                }
                            }
                        }
                    } else if (definition.relation === 'has-one') {
                        let reference = <Reference<Model>>value;

                        if (reference.resolved) {
                            let instance : Model = reference.result;

                            // The remote idAttribute must be updated
                            for (let key of Object.keys(definition.idAttribute)) {
                                instance.setAttribute(key, this.getAttribute(definition.idAttribute[key]));
                            }
                        }
                    } else if (definition.relation === 'has-many') {
                        let collection = <Collection<Model>>value;
                        
                        if (collection.resolved) { 
                            // The remote idAttribute must be updated
                            for (let instance of collection.results) {
                                for (let key of Object.keys(definition.idAttribute)) {
                                    instance.setAttribute(key, this.getAttribute(definition.idAttribute[key]));
                                }
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