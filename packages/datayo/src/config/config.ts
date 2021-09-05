import { Database } from "./database";

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
