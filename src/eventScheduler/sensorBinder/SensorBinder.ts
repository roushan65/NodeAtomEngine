import { connect, IClientOptions, MqttClient } from "mqtt";
import  * as nodeEval  from "node-eval";
import { AppProperties } from "../../appProperties/AppProperties";
import { DEBUG } from "../../helpers/DEBUG";
import { Actuator, Binding, StateMap } from "./../../configureationReader/ConfigurationReader";

export class SensorBinder {
    private bining: Binding;
    private localClient: MqttClient | null;
    private isBusy: boolean;

    constructor(bindg: Binding) {
        this.bining = bindg;
        this.localClient = null;
        this.isBusy = false;
    }

    public process() {
        DEBUG.log("Binding " + this.bining.name);
        this.connectToLocalBroker();
        this.isBusy = true;
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
        this.localClient.on("close", () => { this.localOnClose(); });
    }

    public localOnClose(): any {
        DEBUG.log("Client closed!!");
        this.localClient = null;
    }

    public localOnError(err: Error): any {

    }

    public localReconnet(): any {

    }

    public localOnMessageArrived(topic: string, message: string): any {
        if (topic == "atomiothub/" + AppProperties.localBrokerUsername + "/" + AppProperties.localBrokerPassword + "/" + this.bining.sensor.sensotType + "/" + this.bining.sensor.MAC + "/out") {
            // console.log("BINDER receives a Message: " + message + " from " + topic);
            const sensorReading = JSON.parse(message);
            this.bining.actuators.forEach((actuator: Actuator) => {
                actuator.stateMap.forEach((state: StateMap) => {
                    const condition = state.condition.replace("${sensorValue}", sensorReading.sensors[0].value);
                    // DEBUG.log("Evaluating " + condition);
                    if (nodeEval(condition)) {
                        // DEBUG.log("PASS!!");
                        const actuatorCommand = {
                            type: "COMMAND",
                            sensors: [
                                {
                                    sensor_type: actuator.sensorType,
                                    id: actuator.senasorID,
                                    state: state.state,
                                    value: state.value,
                                },
                            ],
                        };
                        const topic = "atomiothub/" + AppProperties.localBrokerUsername + "/" + AppProperties.localBrokerPassword + "/" + actuator.sensorType + "/" + actuator.MAC + "/in";
                        if (this.localClient) {
                            DEBUG.log("publishing " + JSON.stringify(actuatorCommand) + " on " + topic);
                            this.localClient.publish(topic, JSON.stringify(actuatorCommand));
                        }
                    } else {
                        // DEBUG.log("FAIL!!");
                    }
                });
            });
        } else {
            DEBUG.log("Response from actuator: " + message);
            if (this.localClient) {
                this.localClient.end(true, () => {
                    DEBUG.log("Connection closed");
                });
            }
        }
    }

    public localOnConnect(): any {
        if (this.localClient) {
            DEBUG.log("Binder connected!!");
            const topicTosubscribe = [
                "atomiothub/" + AppProperties.localBrokerUsername + "/" + AppProperties.localBrokerPassword + "/" + this.bining.sensor.sensotType + "/" + this.bining.sensor.MAC + "/out",
            ];
            this.bining.actuators.forEach((actuator: Actuator) => {
                topicTosubscribe.push("atomiothub/" + AppProperties.localBrokerUsername + "/" + AppProperties.localBrokerPassword + "/" + actuator.sensorType + "/" + actuator.MAC + "/out");
            });
            const publishTopic = "atomiothub/" + AppProperties.localBrokerUsername + "/" + AppProperties.localBrokerPassword + "/" + this.bining.sensor.sensotType + "/" + this.bining.sensor.MAC + "/in";
            this.localClient.subscribe(topicTosubscribe, (err, grantedTopics) => {
                if (!err && this.localClient) {
                    // DEBUG.log(grantedTopics);
                    const command = {
                        type: "COMMAND",
                        sensors: [
                            {
                                sensor_type: this.bining.sensor.sensotType,
                                id: this.bining.sensor.sensorID,
                                state: "?",
                            },
                        ],
                    };
                    DEBUG.log("publishing command... " + JSON.stringify(command));
                    this.localClient.publish(publishTopic, JSON.stringify(command));
                } else {
                    DEBUG.log("BINDER Subscribe Error: " + JSON.stringify(err));
                }
            });

            // A max timeout to close the connection
            setTimeout(() => {
                if (this.localClient) {
                    this.localClient.end(true, () => {
                        DEBUG.log("Binding Timeout");
                    });
                }
            }, 5000);
        }
    }

}
