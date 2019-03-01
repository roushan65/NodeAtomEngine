import { watchFile } from "fs";
import { Job, scheduleJob } from "node-schedule";
import { AppProperties } from "../appProperties/AppProperties";
import { AlarmHandler } from "./../alarmHandler/AlarmHandler";
import { Binding, Config, ConfigurationReader, Schedule } from "./../configureationReader/ConfigurationReader";
import { DEBUG } from "./../helpers/DEBUG";
import { ScheduleProcesser } from "./eventProcesser/EventProcesser";
import { SensorBinder } from "./sensorBinder/SensorBinder";

export class SchedulerAndAlarm {
    private schedules: Schedule[];
    private bindings: Binding[];
    private schedulers: Job[];
    private eventProcessers: ScheduleProcesser[];
    private filename: string;
    private sensorBinders: Job[];

    constructor() {
        this.filename = AppProperties.CONFIG_FILE_NAME;
        this.schedulers = new Array<any>();
        this.bindings = new Array<Binding>();
        this.eventProcessers = new Array<ScheduleProcesser>();
        this.schedules = new Array<Schedule>();
        this.sensorBinders = new Array<Job>();
        watchFile(this.filename, (curr, prev) => {
            this.autoReload(curr, prev);
        });
    }

    public autoReload(curr: any, prev: any) {
        DEBUG.log("Reloading Events...");
        this.stopAllEvents();
        this.start();
        DEBUG.log("Reloading Events done!!");
    }

    public stopAllEvents() {
        this.schedulers.forEach((schd: Job) => {
            // clearInterval(schd);
            schd.cancel();
        });
        this.eventProcessers.splice(0, this.eventProcessers.length);

        this.sensorBinders.forEach((binder: Job) => {
            // clearInterval(schd);
            binder.cancel();
        });
        this.sensorBinders.splice(0, this.sensorBinders.length);
    }

    public async start() {
        AlarmHandler.loadAlarms();

        const config: Config = await ConfigurationReader.readConfig(this.filename);
        this.schedules = config.SCHEDULE;
        this.schedules.forEach((schd: Schedule) => {
            if (schd.enable.toLowerCase() == "true") {
                try {
                    const processer = new ScheduleProcesser(schd);
                    const timer = scheduleJob(schd.cornTiming, () => {processer.process(); });
                    this.schedulers.push(timer);
                    DEBUG.log("JOB \"" + schd.name + "\" is scheduled at " + schd.cornTiming);
                } catch (ex) {
                    DEBUG.err("Schedule ERROR:", ex);
                }
            }
        });

        this.bindings = config.BINDINGS;
        this.bindings.forEach((binding: Binding) => {
            if (binding.enabled.toLowerCase() == "true") {
                try {
                    const sensorBinder = new SensorBinder(binding);
                    const timer = scheduleJob(binding.cornTiming, () => {sensorBinder.process(); });
                    this.sensorBinders.push(timer);
                    DEBUG.log("Binder \"" + binding.name + "\" is scheduled at " + binding.cornTiming);
                } catch (ex) {
                    DEBUG.err("Binder ERROR:", ex);
                }
            }
        });
    }
}
