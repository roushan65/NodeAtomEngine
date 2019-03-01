// import { Config } from './ConfigurationReader';
import { Promise } from "core-js";
import { readFile, writeFile } from "fs";
// To parse this data:
//
//   import { Convert, Config } from "./file";
//
//   const config = Convert.toConfig(json);
//
// These functions will throw an error if the JSON doesn't
// match the expected interface, even if the JSON is valid.

export class ConfigurationReader {
    public static readConfig(filename: string): Promise<Config> {
        return new Promise((resolve: any, reject: any) => {
            readFile(filename, "utf8", (err, content) => {
                if (err) {
                    reject(err);
                }
                try {
                    resolve(Convert.toConfig(content));
                } catch (ex) {
                    reject(ex);
                }
            });
        });
    }

    public static writeConfig(filename: string, config: Config): Promise<Config> {
        return new Promise((resolve: any, reject: any) => {
            writeFile(filename, Convert.configToJson(config), (err) => {
                if (!err) {
                    resolve(config);
                } else {
                    reject(err);
                }
            });
        });
    }
}

// To parse this data:
//
//   import { Convert, Config } from "./file";
//
//   const config = Convert.toConfig(json);
//
// These functions will throw an error if the JSON doesn't
// match the expected interface, even if the JSON is valid.

export interface Config {
    ALARMS: Alarm[];
    SCHEDULE: Schedule[];
    BINDINGS: Binding[];
}

export interface Alarm {
    enable: string;
    id: string;
    inTopic: string;
    modulename: string;
    name: string;
    outTopic: string;
    type: string;
}

export interface Binding {
    name: string;
    id: string;
    cornTiming: string;
    enabled: string;
    sensor: Sensor;
    actuators: Actuator[];
}

export interface Actuator {
    MAC: string;
    senasorID: string;
    sensorType: string;
    stateMap: StateMap[];
}

export interface StateMap {
    value?: string;
    condition: string;
    state?: string;
}

export interface Sensor {
    MAC: string;
    sensorID: string;
    sensotType: string;
    valueType: string;
}

export interface Schedule {
    name: string;
    id: string;
    enable: string;
    cornTiming: string;
    scriptType: string;
    scriptPath: string;
}

// Converts JSON strings to/from your types
// and asserts the results of JSON.parse at runtime
export namespace Convert {
    export function toConfig(json: string): Config {
        return cast(JSON.parse(json), r("Config"));
    }

    export function configToJson(value: Config): string {
        return JSON.stringify(uncast(value, r("Config")), null, 2);
    }

    function invalidValue(typ: any, val: any): never {
        throw Error(`Invalid value ${JSON.stringify(val)} for type ${JSON.stringify(typ)}`);
    }

    function jsonToJSProps(typ: any): any {
        if (typ.jsonToJS === undefined) {
            const map: any = {};
            typ.props.forEach((p: any) => map[p.json] = { key: p.js, typ: p.typ });
            typ.jsonToJS = map;
        }
        return typ.jsonToJS;
    }

    function jsToJSONProps(typ: any): any {
        if (typ.jsToJSON === undefined) {
            const map: any = {};
            typ.props.forEach((p: any) => map[p.js] = { key: p.json, typ: p.typ });
            typ.jsToJSON = map;
        }
        return typ.jsToJSON;
    }

    function transform(val: any, typ: any, getProps: any): any {
        function transformPrimitive(typ: string, val: any): any {
            if (typeof typ === typeof val) { return val; }
            return invalidValue(typ, val);
        }

        function transformUnion(typs: any[], val: any): any {
            // val must validate against one typ in typs
            const l = typs.length;
            for (let i = 0; i < l; i++) {
                const typ = typs[i];
                try {
                    return transform(val, typ, getProps);
                } catch (_) {}
            }
            return invalidValue(typs, val);
        }

        function transformEnum(cases: string[], val: any): any {
            if (cases.indexOf(val) !== -1) { return val; }
            return invalidValue(cases, val);
        }

        function transformArray(typ: any, val: any): any {
            // val must be an array with no invalid elements
            if (!Array.isArray(val)) { return invalidValue("array", val); }
            return val.map((el) => transform(el, typ, getProps));
        }

        function transformObject(props: { [k: string]: any }, additional: any, val: any): any {
            if (val === null || typeof val !== "object" || Array.isArray(val)) {
                return invalidValue("object", val);
            }
            const result: any = {};
            Object.getOwnPropertyNames(props).forEach((key) => {
                const prop = props[key];
                const v = Object.prototype.hasOwnProperty.call(val, key) ? val[key] : undefined;
                result[prop.key] = transform(v, prop.typ, getProps);
            });
            Object.getOwnPropertyNames(val).forEach((key) => {
                if (!Object.prototype.hasOwnProperty.call(props, key)) {
                    result[key] = transform(val[key], additional, getProps);
                }
            });
            return result;
        }

        if (typ === "any") { return val; }
        if (typ === null) {
            if (val === null) { return val; }
            return invalidValue(typ, val);
        }
        if (typ === false) { return invalidValue(typ, val); }
        while (typeof typ === "object" && typ.ref !== undefined) {
            typ = typeMap[typ.ref];
        }
        if (Array.isArray(typ)) { return transformEnum(typ, val); }
        if (typeof typ === "object") {
            return typ.hasOwnProperty("unionMembers") ? transformUnion(typ.unionMembers, val)
                : typ.hasOwnProperty("arrayItems")    ? transformArray(typ.arrayItems, val)
                : typ.hasOwnProperty("props")         ? transformObject(getProps(typ), typ.additional, val)
                : invalidValue(typ, val);
        }
        return transformPrimitive(typ, val);
    }

    function cast<T>(val: any, typ: any): T {
        return transform(val, typ, jsonToJSProps);
    }

    function uncast<T>(val: T, typ: any): any {
        return transform(val, typ, jsToJSONProps);
    }

    function a(typ: any) {
        return { arrayItems: typ };
    }

    function u(...typs: any[]) {
        return { unionMembers: typs };
    }

    function o(props: any[], additional: any) {
        return { props, additional };
    }

    function m(additional: any) {
        return { props: [], additional };
    }

    function r(name: string) {
        return { ref: name };
    }

    const typeMap: any = {
        Config: o([
            { json: "ALARMS", js: "ALARMS", typ: a(r("Alarm")) },
            { json: "SCHEDULE", js: "SCHEDULE", typ: a(r("Schedule")) },
            { json: "BINDINGS", js: "BINDINGS", typ: a(r("Binding")) },
        ], false),
        Alarm: o([
            { json: "enable", js: "enable", typ: "" },
            { json: "id", js: "id", typ: "" },
            { json: "inTopic", js: "inTopic", typ: "" },
            { json: "modulename", js: "modulename", typ: "" },
            { json: "name", js: "name", typ: "" },
            { json: "outTopic", js: "outTopic", typ: "" },
            { json: "type", js: "type", typ: "" },
        ], false),
        Binding: o([
            { json: "name", js: "name", typ: "" },
            { json: "id", js: "id", typ: "" },
            { json: "cornTiming", js: "cornTiming", typ: "" },
            { json: "enabled", js: "enabled", typ: "" },
            { json: "sensor", js: "sensor", typ: r("Sensor") },
            { json: "actuators", js: "actuators", typ: a(r("Actuator")) },
        ], false),
        Actuator: o([
            { json: "MAC", js: "MAC", typ: "" },
            { json: "senasorID", js: "senasorID", typ: "" },
            { json: "sensorType", js: "sensorType", typ: "" },
            { json: "stateMap", js: "stateMap", typ: a(r("StateMap")) },
        ], false),
        StateMap: o([
            { json: "value", js: "value", typ: u(undefined, "") },
            { json: "condition", js: "condition", typ: "" },
            { json: "state", js: "state", typ: u(undefined, "") },
        ], false),
        Sensor: o([
            { json: "MAC", js: "MAC", typ: "" },
            { json: "sensorID", js: "sensorID", typ: "" },
            { json: "sensotType", js: "sensotType", typ: "" },
            { json: "valueType", js: "valueType", typ: "" },
        ], false),
        Schedule: o([
            { json: "name", js: "name", typ: "" },
            { json: "id", js: "id", typ: "" },
            { json: "enable", js: "enable", typ: "" },
            { json: "cornTiming", js: "cornTiming", typ: "" },
            { json: "scriptType", js: "scriptType", typ: "" },
            { json: "scriptPath", js: "scriptPath", typ: "" },
        ], false),
    };
}
