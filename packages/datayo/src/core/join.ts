import { Model, ModelConstructor } from ".";
import { FieldKeys } from "../utils";
import { Collection } from "./collection";
import { Criteria } from "./criteria";

export type JoinConditionDefinition<SchemaT> = {
    [P in keyof SchemaT] : SchemaT[P] extends Object ? (SchemaT[P] | FieldKeys<SchemaT[P]>) : never;
};

export type JoinCondition<Joined, SchemaT> = {
    [P in FieldKeys<Joined>]? : JoinConditionDefinition<SchemaT> | FieldKeys<SchemaT>;
} & {
    $identity? : JoinConditionDefinition<SchemaT>;
};

export type JoinCriteria<SchemaT> = {
    [ P in keyof SchemaT ]? : Criteria<SchemaT[P]>;
}

export interface JoinOptions<Joined, Joiner> {
    on?: JoinCondition<Joined, Joiner>;
}

export class JoinedCollection<SchemaT> extends Collection<SchemaT, JoinCriteria<SchemaT>> {
    with<
        T, 
        Key extends (string | symbol | number)
    >(
        model : ModelConstructor<T>, 
        name : Key, 
        options : JoinOptions<T, SchemaT>
    ): JoinedCollection<SchemaT & { [P in Key] : T }> {
        return null;
    }
}