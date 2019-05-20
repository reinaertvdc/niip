import { EventEmitter } from "events";

interface DataSource {
    key: string,
    description: string,
    source: Function,
    thisObject: Object,
    arguments: Array<any>
}

type DataDescription = {
    key: string;
    description: string;
}

class DataProvider extends EventEmitter {
    private static instance: DataProvider = null;
    private dataSources: Map<string, DataSource> = new Map();

    private constructor() {
        super()
    }

    public static getInstance(): DataProvider {
        if(DataProvider.instance == null) {
            DataProvider.instance = new DataProvider();
        }
        return DataProvider.instance;
    }

    public has(key: string) {
        return this.dataSources.has(key);
    }

    public getSource(key: string) {
        return this.dataSources.get(key);
    }

    public getSources(): DataDescription[] {
        // We loop over our Map using an iterator and store the sources in an array.
        var sourcesIt = this.dataSources.values();
        var sources: DataDescription[] = [];

        let result = sourcesIt.next();
        while(!result.done) {
            sources.push({
                "key": result.value.key,
                "description": result.value.description
            });
            result = sourcesIt.next();
        }

        return sources;
    }

    /**
     * Function that will try to get the data that was request
     * @param key The data source
     */
    public getData(key: string): Promise<any> {
        var source = this.dataSources.get(key);
        var callback = source.source;
        var args = source.arguments;

        return callback.apply(source.thisObject, args);
    }

    /**
     * Function that will try to get all the data that was requested
     * @param keys The data sources that we will gather
     */
    public getMultipleData(keys: Array<string>) {
        return new Promise((resolve, reject) => {
            let response = {};
            let found = [];
            
            // First, check which sources we have and which we don't have
            for(var i = 0; i < keys.length; i++) {
                if(this.has(keys[i])) {
                    // Add the ones we have to a list
                    found.push(keys[i]);
                }
                else {
                    // For the ones we don't have we just put null in the output
                    response[keys[i]] = null;
                }
            }
            
            // Generate a set from this list 
            // This list indicates which data we still need to gather
            let keySet: Set<string> = new Set(found);

            if (found.length === 0) {
                resolve(response);
                return;
            }
            // For each data source that we do have try to fetch it.
            found.forEach((value, index) => {
                // getData return a promise
                this.getData(value).then((output) => {
                    // Add the data to the response
                    response[value] = output;
                    // Delete this data source from the keyset
                    keySet.delete(value);

                    // If the keyset is empty we have gathered all the data ==> resolve our promise
                    if(keySet.size == 0) {
                        resolve(response);
                    }
                });
            });
        });
    }

    /**
     * This function adds a given data source to our internal list
     * This data source will then be able to be queried by websockets
     * @param source The data source that will be registered
     */
    public register(source: DataSource) {
        this.dataSources.set(source.key, source);
        this.emit("source-added", source.key)
    }

    /**
     * This function removes a given data source from our internal list
     * @param key: The key that was used to register the data source 
     */
    public remove(key: string) {
        if(this.dataSources.has(key)) {
            this.dataSources.delete(key);
            this.emit("source-removed", key);
        }
    }

    public announceNewData(key: string) {
        if(this.has(key)) {
            this.emit("new-data", key);
        }
    }
}

export { DataProvider, DataDescription };