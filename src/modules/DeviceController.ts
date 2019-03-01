import { readFileSync } from "fs";
import { connect, IClientOptions, MqttClient } from "mqtt";
import  * as nodeEval  from "node-eval";
import { AppProperties } from "../appProperties/AppProperties";
import { DEBUG } from "./../helpers/DEBUG";

export class DeviceController {
    private localClient: MqttClient|null;
    private sensorMAC: string;
    private status: string;
    private sensorId: string;
    private sensorType: string;

    constructor() {
        this.localClient = null;
        this.sensorMAC = "";
        this.status = "";
        this.sensorId = "";
        this.sensorType = "";
    }

    public setDeviceStatus(MAC: string, sensorType: string, sensorId: string, status: string) {
        if (MAC != "" && status != "") {
            this.sensorMAC = MAC;
            this.status = status;
            this.sensorId = sensorId;
            this.sensorType = sensorType;
            this.connectToLocalBroker();
        }
    }

    public connectToLocalBroker() {
        const clientOptions: IClientOptions = {
            clientId: AppProperties.clientMacAddress + "_mqttjs_" + Math.random().toString(16).substr(2, 8),
            username: AppProperties.localBrokerUsername,
            password: AppProperties.localBrokerPassword,
            keepalive: 10,
            port: AppProperties.publicBrokerHostPort,
            connectTimeout: 5000,
            reconnectPeriod: 2000,
        };
        this.localClient = connect(AppProperties.localBrokerHostName, clientOptions);
        this.localClient.on("connect", () => { this.localOnConnect(); });
        this.localClient.on("message", (topic, message) => { this.localOnMessageArrived(topic, message.toString()); });
        this.localClient.on("reconnect", () => { this.localReconnet(); });
        this.localClient.on("error", (err) => { this.localOnError(err); });
    }

    public localOnError(err: Error): any {

    }

    public localReconnet(): any {

    }

    public closeConnection() {
        if (this.localClient) {
            this.localClient.end(true, () => {
                DEBUG.log("Connection closed");
                this.localClient = null;
            });
        }
    }

    public localOnMessageArrived(topic: string, message: string): any {
        DEBUG.log("Device Controller onMessage " + topic + " " + message);
        this.closeConnection();
    }

    public localOnConnect(): any {
        DEBUG.log("Connected to Local Broker");
        const topicsToSubscribe = [
            "mobiloitteiothub/" + AppProperties.localBrokerUsername + "/" + AppProperties.localBrokerPassword + "/" + this.sensorType + "/" + this.sensorMAC + "/out",
        ];
        if (this.localClient) {
            this.localClient.subscribe(topicsToSubscribe, (err, grantedTopics) => {
                if (!err) {
                    grantedTopics.forEach((topic) => {
                        DEBUG.log("LOCAL Subscribed to: " + JSON.stringify(topic));
                    });
                    if (this.localClient) {
                        const topicToPublish = "mobiloitteiothub/" + AppProperties.localBrokerUsername + "/" + AppProperties.localBrokerPassword + "/" + this.sensorType + "/" + this.sensorMAC + "/in";
                        const command = {
                            type: "COMMAND",
                            sensors: [
                                {
                                    sensor_type: this.sensorType,
                                    id: this.sensorId,
                                    state: this.status,
                                },
                            ],
                        };
                        DEBUG.log("publishing " + JSON.stringify(command));
                        this.localClient.publish(topicToPublish, JSON.stringify(command));
                    }
                } else {
                    DEBUG.log("LOCAL Subscribe Error: " + JSON.stringify(err));
                }
            });
            setTimeout(() => {
                DEBUG.log("No response from device!!");
                this.closeConnection();
            }, 3000);
        }
    }
}
