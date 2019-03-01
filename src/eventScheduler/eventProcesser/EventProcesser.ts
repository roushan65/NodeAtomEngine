import { readFileSync } from "fs";
import  * as nodeEval  from "node-eval";
import { Schedule } from "./../../configureationReader/ConfigurationReader";
import { DEBUG } from "./../../helpers/DEBUG";
import { CoreEngineModules } from "./../../modules/CoreEngineModules";
export class ScheduleProcesser {
    private schedule: Schedule;

    constructor(evt: Schedule) {
        this.schedule = evt;
    }

    public process() {
        DEBUG.log("Processing " + this.schedule.name + "...");
        const modulePath = this.schedule.scriptPath;
        const moduleContents = readFileSync(modulePath, "utf-8");
        DEBUG.log("Executing '" + modulePath + "'", new Date());
        const coreEngineModules: CoreEngineModules = new CoreEngineModules();
        nodeEval(moduleContents, modulePath, {coreEngineModules});
    }
}
