import { AppProperties } from "./appProperties/AppProperties";
import { AutoDetectServer } from "./autoDetectServer/AutoDetectServer";
import { BrokerBridge } from "./brokerBridge/BrokerBridge";
import { SchedulerAndAlarm } from "./eventScheduler/EventScheduler";
import { DEBUG } from "./helpers/DEBUG";

/***
 *       _____                 ______             _
 *      / ____|               |  ____|           (_)
 *     | |     ___  _ __ ___  | |__   _ __   __ _ _ _ __   ___
 *     | |    / _ \| '__/ _ \ |  __| | '_ \ / _` | | '_ \ / _ \
 *     | |___| (_) | | |  __/ | |____| | | | (_| | | | | |  __/
 *      \_____\___/|_|  \___| |______|_| |_|\__, |_|_| |_|\___|
 *                                           __/ |
 *                                          |___/
 */

class Engine {
    public async intiSchedulerAndAlarm() {
        const eventScheduler: SchedulerAndAlarm = new SchedulerAndAlarm();
        eventScheduler.start();
    }
    public start() {
        DEBUG.log("Start Engine...");
        AutoDetectServer.start();
        const brokerBridge = new BrokerBridge();
        brokerBridge.start();
        this.intiSchedulerAndAlarm();
    }
}

AppProperties.initialize(() => {
    const engine = new Engine();
    engine.start();
});
