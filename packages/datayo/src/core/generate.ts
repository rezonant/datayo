import { Model } from "./model";
import { v4 as uuid } from "uuid";

export interface GenerateOptions {
    /**
     * Type of value to generate
     */
    type : 'uuid';

    /**
     * When should the value be generated? Default is 'persist'
     */
    on?: 'persist' | 'new';
}

/**
 * Generate a value for a given attribute.
 * @param type 
 * @returns 
 */
export function Generate(options : GenerateOptions) {
    if (options.type === 'uuid') {
        if (options.on === 'new') {
            return (target, propertyKey) => {
                (<typeof Model>target.constructor)
                    .hook(i => i[propertyKey] = uuid())
                ;
            };
        } else if (options.on === 'persist' || typeof options.on === 'undefined') {
            return (target, propertyKey) => {
                (<typeof Model>target.constructor)
                    .hook(i => (i.lifecycle().beforePersisting)
                        .subscribe(i => i[propertyKey] = uuid()))
                ;
            };
        } else {
            throw new Error(`Invalid value for 'on' provided ('${options.on}')`);
        }
    }
}
