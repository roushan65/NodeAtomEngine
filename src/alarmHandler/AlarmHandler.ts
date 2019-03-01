import { readFileSync } from "fs";
import * as nodeEval from "node-eval";
import { DEBUG } from "../helpers/DEBUG";
import { CoreEngineModules } from "../modules/CoreEngineModules";
import { AppProperties } from "./../appProperties/AppProperties";
import { Alarm, Config, ConfigurationReader } from "./../configureationReader/ConfigurationReader";

export class AlarmHandler {

    public static async loadAlarms() {
        AlarmHandler.currentConfig = await ConfigurationReader.readConfig(AppProperties.CONFIG_FILE_NAME);
        DEBUG.log("Alarms Loaded!!");
    }

    public static handleAlarm(topic: string, message: string) {
        AlarmHandler.currentConfig.ALARMS.forEach((alarm: Alarm) => {
            if (alarm.inTopic == topic) {
                AlarmHandler.process(alarm);
            }
        });
    }

    public static process(alarm: Alarm) {
        DEBUG.log("Processing " + alarm.name + "...");
        const modulePath = alarm.modulename;
        const moduleContents = readFileSync(modulePath, "utf-8");
        DEBUG.log("Executing '" + modulePath + "'", new Date());
        const coreEngineModules: CoreEngineModules = new CoreEngineModules();
        nodeEval(moduleContents, modulePath, {coreEngineModules, require, AppProperties});
    }
    private static currentConfig: Config;
}
