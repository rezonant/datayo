import { AttributeDefinition } from ".";
import { Model } from "./model";

export interface ReferenceContext {
    instance : Model;
    attribute : string;
    definition : AttributeDefinition;
}
