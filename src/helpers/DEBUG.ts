export class DEBUG {

    public static log(...args: any[]) {
        if (DEBUG.isDebug == true) {
            for (let i = 0; i < args.length; i++) {
                console.log(args[i]);
            }
        }
    }

    public static err(...args: any[]) {
        if (DEBUG.isDebug == true) {
            for (let i = 0; i < args.length; i++) {
                console.error(args[i]);
            }
        }
    }
    private static isDebug: boolean = true;
}
