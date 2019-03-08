import { unlink, writeFile } from "fs";
import { AppProperties } from "../appProperties/AppProperties";
import { Actuator, Alarm, Binding, Config, ConfigurationReader, Schedule, Sensor } from "./../configureationReader/ConfigurationReader";
import { DEBUG } from "./../helpers/DEBUG";
import { AlarmCommand, AlarmCommandConverter } from "./AlarmCommand";
import { BindCommand, BindCommandConverter } from "./BindCommand";
import { DeviceState, SceneSlotCommand, SceneSlotCommandConverter } from "./SceneSlotCommand";
import { State, TimeSlotCommand, TimeSlotCommandConverter } from "./TimeSlotCommand";

export class SelfProgrammer {

    public static handleAlarms(jsonString: string, callBack: any) {
        const jsonObj = JSON.parse(jsonString);
        if (!jsonObj.type) {
            return;
        }
        const alarmCommand = AlarmCommandConverter.toAlarmCommand(jsonString);
        if (alarmCommand.type == "Alarm") {
            if (alarmCommand.command == "add") {
                this.createAlarm(alarmCommand, callBack);
            } else if (alarmCommand.command == "remove") {
                this.removeAlarm(alarmCommand, callBack);
            } else if (alarmCommand.command == "edit") {
                this.updateAlarm(alarmCommand, callBack);
            }
        }
    }

    public static async createAlarm(alarmCommand: AlarmCommand, callBack: any) {
        const currentConfig: Config = await ConfigurationReader.readConfig(AppProperties.CONFIG_FILE_NAME);
        const existingAlarm: Alarm[] = currentConfig.ALARMS.filter((alarm: Alarm) => {
            if (alarm.id == alarmCommand.id) {
                return true;
            }
        });
        if (existingAlarm.length > 0) {
            DEBUG.log("Alarm id Already exists.");
            return;
        }

        const scriptPath: string = "scripts/js/auto_alarm_" + alarmCommand.id + ".js";
        const inTopic: string = "atomiothub/" + AppProperties.clientMacAddress + "/" + alarmCommand.sensor.sensor_type + "/" + alarmCommand.sensor.mac + "/in";
        const outTopic: string = "atomiothub/" + AppProperties.clientMacAddress + "/" + alarmCommand.sensor.sensor_type + "/" + alarmCommand.sensor.mac + "/out";
        const newAlarm: Alarm = {
            name: alarmCommand.name,
            id: alarmCommand.id,
            enable: alarmCommand.enable,
            type: "javascript",
            modulename: scriptPath,
            inTopic,
            outTopic,
        };

        currentConfig.ALARMS.push(newAlarm);
        try {
            ConfigurationReader.writeConfig(AppProperties.CONFIG_FILE_NAME, currentConfig);
            callBack(alarmCommand); // Callback for sucess
            DEBUG.log("Alarm Saved!!");
        } catch (ex) {
            DEBUG.log("ERROR: " + ex);
        }
    }

    public static async updateAlarm(alarmCommand: AlarmCommand, callBack: any) {
        const currentConfig: Config = await ConfigurationReader.readConfig(AppProperties.CONFIG_FILE_NAME);
        currentConfig.ALARMS.forEach((alarm: Alarm) => {
            if (alarm.id == alarmCommand.id) {
                const scriptPath: string = "scripts/js/auto_alarm_" + alarmCommand.id + ".js";
                const inTopic: string = "atomiothub/" + AppProperties.clientMacAddress + "/" + alarmCommand.sensor.sensor_type + "/" + alarmCommand.sensor.mac + "/in";
                const outTopic: string = "atomiothub/" + AppProperties.clientMacAddress + "/" + alarmCommand.sensor.sensor_type + "/" + alarmCommand.sensor.mac + "/out";

                alarm.name = alarmCommand.name;
                alarm.enable = alarm.enable;
                alarm.inTopic = inTopic;
                alarm.outTopic = outTopic;
                alarm.modulename = scriptPath;

                try {
                    ConfigurationReader.writeConfig(AppProperties.CONFIG_FILE_NAME, currentConfig);
                    callBack(alarmCommand); // Callback for sucess
                    DEBUG.log("Alarm Saved!!");
                } catch (ex) {
                    DEBUG.log("ERROR: " + ex);
                }
            }
        });
    }

    public static async removeAlarm(alarmCommand: AlarmCommand, callBack: any) {
        const currentConfig: Config = await ConfigurationReader.readConfig(AppProperties.CONFIG_FILE_NAME);
        currentConfig.ALARMS = currentConfig.ALARMS.filter((alarm: Alarm) => {
            if (alarm.id != alarmCommand.id) {
                return true;
            } else {
                unlink(alarm.modulename, () => {
                    DEBUG.log("Script deleted");
                    callBack(alarmCommand); // Callback for sucess
                });
            }
        });
        try {
            ConfigurationReader.writeConfig(AppProperties.CONFIG_FILE_NAME, currentConfig);
        } catch (ex) {
            DEBUG.log("ERROR: " + ex);
        }
    }

    public static handleSchedule(jsonString: string, callBack: any) {
        const jsonObject = JSON.parse(jsonString);
        if (!jsonObject.type) {
            return;
        }
        if (jsonObject.type == "SceneSlot") {
            const sceneSlotCommand = SceneSlotCommandConverter.toSceneSlotCommand(jsonString);
            if (sceneSlotCommand.command == "add") {
                this.createSceneSlot(sceneSlotCommand, callBack);
            } else if (sceneSlotCommand.command == "remove") {
                this.removeSceneSlot(sceneSlotCommand, callBack);
                 } else if (sceneSlotCommand.command == "edit") {
                this.updateSceneSlot(sceneSlotCommand, callBack);
                 }
        } else if (jsonObject.type == "TimeSlot") {
            const timeSlotCommand: TimeSlotCommand = TimeSlotCommandConverter.toTimeSlotCommand(jsonString);
            if (timeSlotCommand.command == "add") {
                this.createTimeSlot(timeSlotCommand, callBack);
            } else if (timeSlotCommand.command == "remove") {
                this.removeTimeSlot(timeSlotCommand, callBack);
                 } else if (timeSlotCommand.command == "edit") {
                this.updateTimeSlot(timeSlotCommand, callBack);
                 }
        }
    }

    public static handleBinding(jsonString: string, callBack: any) {
        const jsonObj = JSON.parse(jsonString);
        if (!jsonObj.type) {
            return;
        }
        const bindCommand: BindCommand = BindCommandConverter.toBindCommand(jsonString);
        if (bindCommand.command == "add") {
            this.createBinding(bindCommand, callBack);
        } else if (bindCommand.command == "remove") {
            this.removeBinding(bindCommand, callBack);
        } else if (bindCommand.command == "edit") {
            this.updateBinding(bindCommand, callBack);
        }
    }

    private static async createTimeSlot(timeSlotCommand: TimeSlotCommand, callBack: any) {
        const currentConfig: Config = await ConfigurationReader.readConfig(AppProperties.CONFIG_FILE_NAME);
        const existingSchedule: Schedule[] = currentConfig.SCHEDULE.filter((schedule: Schedule) => {
            if ("start_" + timeSlotCommand.id == schedule.id || "end_" + timeSlotCommand.id == schedule.id) {
                return true;
            }
        });
        if (existingSchedule.length > 0) {
            DEBUG.log("TimeSlot id Already exists.");
            return;
        }
        let timeParts: String[] = timeSlotCommand.startTime.split(":");
        const startCronTimming: string = timeParts[1] + " " + timeParts[0] + " * * " + timeSlotCommand.repeat.join();
        timeParts = timeSlotCommand.endTime.split(":");
        const endCronTimming: string = timeParts[1] + " " + timeParts[0] + " * * " + timeSlotCommand.repeat.join();

        let startScriptContent: string = "";
        timeSlotCommand.startState.forEach((deviceState: State) => {
            startScriptContent += "coreEngineModules.deviceController.setDeviceStatus('" + deviceState.mac + "','" + deviceState.sensor_type + "','" + deviceState.id + "','" + deviceState.state + "');\n";
        });
        let endScriptContent: string = "";
        timeSlotCommand.endState.forEach((deviceState: State) => {
            endScriptContent += "coreEngineModules.deviceController.setDeviceStatus('" + deviceState.mac + "','" + deviceState.sensor_type + "','" + deviceState.id + "','" + deviceState.state + "');\n";
        });

        const startScriptPath: string = "scripts/js/auto_timeSlot_start_" + timeSlotCommand.id + ".js";
        const endScriptPath: string = "scripts/js/auto_timeSlot_end_" + timeSlotCommand.id + ".js";

        // Write the start Schedule
        writeFile(startScriptPath, startScriptContent, (err) => {
            if (!err) {
                const newStartSchedule: Schedule = {
                    name: "auto_start_" + timeSlotCommand.name,
                    id: "start_" + timeSlotCommand.id,
                    enable: timeSlotCommand.enable,
                    cornTiming: startCronTimming,
                    scriptType: "javascript",
                    scriptPath: startScriptPath,
                };
                currentConfig.SCHEDULE.push(newStartSchedule);  // Add the Start Schedule

                // Write the end Schedule
                writeFile(endScriptPath, endScriptContent, (err) => {
                    if (!err) {
                        const newEndSchedule: Schedule = {
                            name: "auto_end_" + timeSlotCommand.name,
                            id: "end_" + timeSlotCommand.id,
                            enable: timeSlotCommand.enable,
                            cornTiming: endCronTimming,
                            scriptType: "javascript",
                            scriptPath: endScriptPath,
                        };
                        currentConfig.SCHEDULE.push(newEndSchedule);    // Add the End Schedule
                        try {
                            ConfigurationReader.writeConfig(AppProperties.CONFIG_FILE_NAME, currentConfig);
                            callBack(timeSlotCommand); // Callback for sucess
                            DEBUG.log("TimeSclot Saved!!");
                        } catch (ex) {
                            DEBUG.log("ERROR: " + ex);
                        }
                    }
                });
            }
        });
    }

    private static async updateTimeSlot(timeSlotCommand: TimeSlotCommand, callBack: any) {
        const currentConfig: Config = await ConfigurationReader.readConfig(AppProperties.CONFIG_FILE_NAME);
        let timeParts: String[] = timeSlotCommand.startTime.split(":");
        const startCronTimming: string = timeParts[1] + " " + timeParts[0] + " * * " + timeSlotCommand.repeat.join();
        timeParts = timeSlotCommand.endTime.split(":");
        const endCronTimming: string = timeParts[1] + " " + timeParts[0] + " * * " + timeSlotCommand.repeat.join();

        let startScriptContent: string = "";
        timeSlotCommand.startState.forEach((deviceState: State) => {
            startScriptContent += "coreEngineModules.deviceController.setDeviceStatus('" + deviceState.mac + "','" + deviceState.sensor_type + "','" + deviceState.id + "','" + deviceState.state + "');\n";
        });
        let endScriptContent: string = "";
        timeSlotCommand.endState.forEach((deviceState: State) => {
            endScriptContent += "coreEngineModules.deviceController.setDeviceStatus('" + deviceState.mac + "','" + deviceState.sensor_type + "','" + deviceState.id + "','" + deviceState.state + "');\n";
        });

        const startScriptPath: string = "scripts/js/auto_timeSlot_start_" + timeSlotCommand.id + ".js";
        const endScriptPath: string = "scripts/js/auto_timeSlot_end_" + timeSlotCommand.id + ".js";

        currentConfig.SCHEDULE.forEach((schedule: Schedule) => {
            if ("start_" + timeSlotCommand.id == schedule.id) {
                DEBUG.log("Updateing TimeSlot ID=" + schedule.id);
                writeFile(startScriptPath, startScriptContent, (err) => {
                    if (!err) {
                        schedule.name = "auto_start_" + timeSlotCommand.name;
                        schedule.enable = timeSlotCommand.enable;
                        schedule.cornTiming = startCronTimming;
                        schedule.scriptType = "javascript";
                        schedule.scriptPath = startScriptPath;
                        try {
                            ConfigurationReader.writeConfig(AppProperties.CONFIG_FILE_NAME, currentConfig);
                            DEBUG.log("TimeSclot Saved!!");
                        } catch (ex) {
                            DEBUG.log("ERROR: " + ex);
                        }
                    }
                });
            } else if ("end_" + timeSlotCommand.id == schedule.id) {
                DEBUG.log("Updateing TimeSlot ID=" + schedule.id);
                writeFile(endScriptPath, endScriptContent, (err) => {
                    if (!err) {
                        schedule.name = "auto_end_" + timeSlotCommand.name;
                        schedule.enable = timeSlotCommand.enable;
                        schedule.cornTiming = endCronTimming;
                        schedule.scriptType = "javascript";
                        schedule.scriptPath = endScriptPath;
                        try {
                            ConfigurationReader.writeConfig(AppProperties.CONFIG_FILE_NAME, currentConfig);
                            callBack(timeSlotCommand); // Callback for sucess
                            DEBUG.log("TimeSclot Saved!!");
                        } catch (ex) {
                            DEBUG.log("ERROR: " + ex);
                        }
                    }
                });
            }
        });
    }

    private static async removeTimeSlot(timeSlotCommand: TimeSlotCommand, callBack: any) {
        const currentConfig: Config = await ConfigurationReader.readConfig(AppProperties.CONFIG_FILE_NAME);
        const stratIndex = -1;
        const endIndex = -1;

        currentConfig.SCHEDULE = currentConfig.SCHEDULE.filter((schedule: Schedule, index: number) => {
            if ("start_" + timeSlotCommand.id != schedule.id && "end_" + timeSlotCommand.id != schedule.id) {
                return true;
            } else {
                unlink(schedule.scriptPath, (err) => {
                    if (!err) {
                        DEBUG.log("Script deleted");
                    }
                });
            }
        });

        try {
            await ConfigurationReader.writeConfig(AppProperties.CONFIG_FILE_NAME, currentConfig);
            callBack(timeSlotCommand); // Callback for sucess
            DEBUG.log("TimeSlot Deleted!!");
        } catch (ex) {
            DEBUG.log("ERROR: " + ex);
        }
    }

    private static async createSceneSlot(sceneSlotCommand: SceneSlotCommand, callBack: any) {
        const currentConfig: Config = await ConfigurationReader.readConfig(AppProperties.CONFIG_FILE_NAME);
        const existingSchedule: Schedule[] = currentConfig.SCHEDULE.filter((schedule: Schedule) => {
            if (sceneSlotCommand.id == schedule.id) {
                return true;
            }
        });
        if (existingSchedule.length > 0) {
            DEBUG.log("SceneSlot id Already exists.");
            return;
        }

        const timeParts: String[] = sceneSlotCommand.time.split(":");

        const cronTimming: string = timeParts[1] + " " + timeParts[0] + " * * " + sceneSlotCommand.repeat.join();
        const scriptPath: string = "scripts/js/auto_sceneSlot_" + sceneSlotCommand.id + ".js";
        let scriptToBeWriten = "";
        sceneSlotCommand.deviceState.forEach((deviceState: DeviceState) => {
            scriptToBeWriten += "coreEngineModules.deviceController.setDeviceStatus('" + deviceState.mac + "','" + deviceState.sensor_type + "','" + deviceState.id + "','" + deviceState.state + "');\n";
        });
        writeFile(scriptPath, scriptToBeWriten, (err) => {
            if (!err) {
                DEBUG.log("Script writen sucessfully");
                const newSchedule: Schedule = {
                    name: "auto_" + sceneSlotCommand.name,
                    id: sceneSlotCommand.id,
                    enable: sceneSlotCommand.enable,
                    cornTiming: cronTimming,
                    scriptType: "javascript",
                    scriptPath,
                };
                currentConfig.SCHEDULE.push(newSchedule);
                try {
                    ConfigurationReader.writeConfig(AppProperties.CONFIG_FILE_NAME, currentConfig);
                    callBack(sceneSlotCommand); // Callback for sucess
                } catch (ex) {
                    DEBUG.log("ERROR: " + ex);
                }
            }
        });
    }

    private static async updateSceneSlot(sceneSlotCommand: SceneSlotCommand, callBack: any) {
        const currentConfig: Config = await ConfigurationReader.readConfig(AppProperties.CONFIG_FILE_NAME);
        currentConfig.SCHEDULE.forEach((schedule: Schedule) => {
            if (schedule.id == sceneSlotCommand.id) {
                const timeParts: String[] = sceneSlotCommand.time.split(":");

                const cronTimming: string = timeParts[1] + " " + timeParts[0] + " * * " + sceneSlotCommand.repeat.join();
                const scriptPath: string = "scripts/js/auto_sceneSlot_" + sceneSlotCommand.id + ".js";
                let scriptToBeWriten = "";
                sceneSlotCommand.deviceState.forEach((deviceState: DeviceState) => {
                    scriptToBeWriten += "coreEngineModules.deviceController.setDeviceStatus('" + deviceState.mac + "','" + deviceState.sensor_type + "','" + deviceState.id + "','" + deviceState.state + "');\n";
                });
                writeFile(scriptPath, "console.log('Dynamic script running!!');\n" + scriptToBeWriten, (err) => {
                    if (!err) {
                        DEBUG.log("Updateing Scene ID=" + schedule.id);
                        schedule.name = "auto_" + sceneSlotCommand.name;
                        schedule.enable = sceneSlotCommand.enable;
                        schedule.cornTiming = cronTimming;
                        schedule.scriptType = "javascript";
                        schedule.scriptPath = scriptPath;
                        try {
                            ConfigurationReader.writeConfig(AppProperties.CONFIG_FILE_NAME, currentConfig);
                            callBack(sceneSlotCommand); // Callback for sucess
                        } catch (ex) {
                            DEBUG.log("ERROR: " + ex);
                        }
                    }
                });
            }
        });
    }

    private static async removeSceneSlot(sceneSlotCommand: SceneSlotCommand, callBack: any) {
        const currentConfig: Config = await ConfigurationReader.readConfig(AppProperties.CONFIG_FILE_NAME);
        currentConfig.SCHEDULE = currentConfig.SCHEDULE.filter((schedule: Schedule, index: number) => {
            if (schedule.id != sceneSlotCommand.id) {
                return true;
            } else {
                unlink(schedule.scriptPath, (err) => {
                    if (!err) {
                        DEBUG.log("Script deleted");
                    } else {
                        DEBUG.log("ERROR:", err);
                    }
                });
            }
        });
        try {
            ConfigurationReader.writeConfig(AppProperties.CONFIG_FILE_NAME, currentConfig);
            callBack(sceneSlotCommand); // Callback for sucess
        } catch (ex) {
            DEBUG.log("ERROR: " + ex);
        }
    }

    private static async createBinding(bindCommand: BindCommand, callBack: any) {
        const currentConfig: Config = await ConfigurationReader.readConfig(AppProperties.CONFIG_FILE_NAME);
        const existingBinding: Binding[] = currentConfig.BINDINGS.filter((binding: Binding, index: number) => {
            if (binding.id == bindCommand.id) {
                return true;
            }
        });
        if (existingBinding.length > 0) {
            DEBUG.log("Binding id Already exists.");
            return;
        }

        const sensor: Sensor = {
            MAC: bindCommand.sensor.mac,
            sensorID: bindCommand.sensor.id,
            sensotType: bindCommand.sensor.sensor_type,
            valueType: "digital",
        };

        const actuator: Actuator = {
            MAC: bindCommand.actuator.mac,
            senasorID: bindCommand.actuator.id,
            sensorType: bindCommand.actuator.sensor_type,
            stateMap: [
                {
                    state: bindCommand.is_inverse.toLowerCase() == "false" ? "OFF" : "ON",
                    condition: "${sensorValue}<=" + bindCommand.value_min,
                },
                {
                    state: bindCommand.is_inverse.toLowerCase() == "false" ? "ON" : "OFF",
                    condition: "${sensorValue}>=" + bindCommand.value_max,
                },
            ],
        };

        const newBinding: Binding = {
            name: "auto_" + bindCommand.name,
            id: bindCommand.id,
            cornTiming: "*/10 * * * * *",
            enabled: bindCommand.enable,
            sensor,
            actuators: [actuator],
        };

        DEBUG.log("OldLen=" + currentConfig.BINDINGS.length);
        const newLen: number = currentConfig.BINDINGS.push(newBinding);
        DEBUG.log("NewLen=" + newLen);

        try {
            ConfigurationReader.writeConfig(AppProperties.CONFIG_FILE_NAME, currentConfig);
            callBack(bindCommand); // Callback for sucess
        } catch (ex) {
            DEBUG.log("ERROR: " + ex);
        }
    }

    private static async updateBinding(bindCommand: BindCommand, callBack: any) {
        const currentConfig: Config = await ConfigurationReader.readConfig(AppProperties.CONFIG_FILE_NAME);
        currentConfig.BINDINGS.forEach((binding: Binding) => {
            if (binding.id == bindCommand.id) {
                binding.name = "auto_" + bindCommand.name;
                binding.enabled = bindCommand.enable;
                binding.sensor.MAC = bindCommand.sensor.mac;
                binding.sensor.sensorID = bindCommand.sensor.id;
                binding.sensor.sensotType = bindCommand.sensor.sensor_type;
                binding.actuators[0].MAC = bindCommand.actuator.mac;
                binding.actuators[0].senasorID = bindCommand.actuator.id;
                binding.actuators[0].sensorType = bindCommand.actuator.sensor_type;
                binding.actuators[0].stateMap[0].state = bindCommand.is_inverse.toLowerCase() == "false" ? "OFF" : "ON";
                binding.actuators[0].stateMap[0].condition = "${sensorValue}<=" + bindCommand.value_min;
                binding.actuators[0].stateMap[1].state = bindCommand.is_inverse.toLowerCase() == "false" ? "ON" : "OFF";
                binding.actuators[0].stateMap[1].condition = "${sensorValue}>=" + bindCommand.value_max;
                try {
                    ConfigurationReader.writeConfig(AppProperties.CONFIG_FILE_NAME, currentConfig);
                    callBack(bindCommand); // Callback for sucess
                } catch (ex) {
                    DEBUG.log("ERROR: " + ex);
                }
            }
        });
    }

    private static async removeBinding(bindCommand: BindCommand, callBack: any) {
        const currentConfig: Config = await ConfigurationReader.readConfig(AppProperties.CONFIG_FILE_NAME);
        currentConfig.BINDINGS = currentConfig.BINDINGS.filter((binding: Binding) => {
            if (binding.id != bindCommand.id) {
                return true;
            }
        });
        try {
            ConfigurationReader.writeConfig(AppProperties.CONFIG_FILE_NAME, currentConfig);
            callBack(bindCommand); // Callback for sucess
        } catch (ex) {
            DEBUG.log("ERROR: " + ex);
        }
    }

}
