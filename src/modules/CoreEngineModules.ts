import { DeviceController } from "./DeviceController";
export class CoreEngineModules {
    private deviceController: DeviceController;
    constructor() {
        this.deviceController = new DeviceController();
    }
}
