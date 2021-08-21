import { Model } from "./model";
import { registerModelOptions } from "./private";

export interface ModelOptions {
    tableName : string;
    database : string;
}

export function ModelOptions(options : ModelOptions) {
    return (target : typeof Model) => target[registerModelOptions](options);
}
