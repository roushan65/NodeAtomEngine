// To parse this data:
//
//   import { Convert, BindCommand } from "./file";
//
//   const bindCommand = Convert.toBindCommand(json);
//
// These functions will throw an error if the JSON doesn't
// match the expected interface, even if the JSON is valid.

export interface BindCommand {
    type: string;
    command: string;
    enable: string;
    id: string;
    name: string;
    sensor: Actuator;
    actuator: Actuator;
    value_min: string;
    value_max: string;
    is_inverse: string;
}

export interface Actuator {
    mac: string;
    node_type: string;
    sensor_type: string;
    id: string;
}

// Converts JSON strings to/from your types
// and asserts the results of JSON.parse at runtime
export namespace BindCommandConverter {
    export function toBindCommand(json: string): BindCommand {
        return cast(JSON.parse(json), r("BindCommand"));
    }

    export function bindCommandToJson(value: BindCommand): string {
        return JSON.stringify(uncast(value, r("BindCommand")), null, 2);
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
        BindCommand: o([
            { json: "type", js: "type", typ: "" },
            { json: "command", js: "command", typ: "" },
            { json: "enable", js: "enable", typ: "" },
            { json: "id", js: "id", typ: "" },
            { json: "name", js: "name", typ: "" },
            { json: "sensor", js: "sensor", typ: r("Actuator") },
            { json: "actuator", js: "actuator", typ: r("Actuator") },
            { json: "value_min", js: "value_min", typ: "" },
            { json: "value_max", js: "value_max", typ: "" },
            { json: "is_inverse", js: "is_inverse", typ: "" },
        ], false),
        Actuator: o([
            { json: "mac", js: "mac", typ: "" },
            { json: "node_type", js: "node_type", typ: "" },
            { json: "sensor_type", js: "sensor_type", typ: "" },
            { json: "id", js: "id", typ: "" },
        ], false),
    };
}
