import { connect, ISubscriptionMap, QoS } from "mqtt";
import { IClientOptions, MqttClient } from "mqtt";
import { BindCommandConverter } from "../selfProgrammer/BindCommand";
import { SceneSlotCommandConverter } from "../selfProgrammer/SceneSlotCommand";
import { SelfProgrammer } from "../selfProgrammer/SelfProgrammer";
import { AlarmHandler } from "./../alarmHandler/AlarmHandler";
import { AppProperties } from "./../appProperties/AppProperties";
import { DEBUG } from "./../helpers/DEBUG";
import { AlarmCommand, AlarmCommandConverter } from "./../selfProgrammer/AlarmCommand";
import { BindCommand } from "./../selfProgrammer/BindCommand";
import { SceneSlotCommand } from "./../selfProgrammer/SceneSlotCommand";
import { TimeSlotCommand, TimeSlotCommandConverter } from "./../selfProgrammer/TimeSlotCommand";
import { StreamFactory } from "./../streamHandler/StreamHandler";
import { IStreamResponse, StreamResponseConvert } from "./../streamHandler/StreamRespose";

export class BrokerBridge {
    private publicClient: MqttClient | null;
    private localClient: MqttClient | null;

    constructor() {
        this.publicClient = null;
        this.localClient = null;
    }

    public start() {
        DEBUG.log("Starting broker bridge...");
        this.connectToPublicBroker();
        this.connectToLocalBroker();
    }

    public connectToLocalBroker() {
        let clientOptions: IClientOptions 
        if(AppProperties.localBrokerRequirePassword){
            clientOptions = {
                clientId: AppProperties.clientMacAddress + "_mqttjs_" + Math.random().toString(16).substr(2, 8),
                username: AppProperties.localBrokerUsername,
                password: AppProperties.localBrokerPassword,
                keepalive: 10,
                port: AppProperties.publicBrokerHostPort,
                connectTimeout: 5000,
                reconnectPeriod: 2000,
            };
        }else{
            clientOptions = {
                clientId: AppProperties.clientMacAddress + "_mqttjs_" + Math.random().toString(16).substr(2, 8),
                keepalive: 10,
                port: AppProperties.publicBrokerHostPort,
                connectTimeout: 5000,
                reconnectPeriod: 2000,
            };
        }
        this.localClient = connect(AppProperties.localBrokerHostName, clientOptions);
        this.localClient.on("connect", () => { this.localOnConnect(); });
        this.localClient.on("message", (topic, message) => { this.localOnMessageArrived(topic, message.toString()); });
        this.localClient.on("reconnect", () => { this.localReconnect(); });
        this.localClient.on("error", (err) => { this.localOnError(err); });
    }

    public localOnConnect() {
        if (this.localClient != null) {
            DEBUG.log("Connected to local Broker. Subscribing now...");
            const qos: QoS = AppProperties.localSubscribeQos;
            const topicsToSubscribe:ISubscriptionMap = {
                ["atomiothub/" + AppProperties.localBrokerUsername + "/" + AppProperties.localBrokerPassword + "/+/+/out"]:qos,
                ["atomiothub/" + AppProperties.localBrokerUsername + "/" + AppProperties.localBrokerPassword + "/discover/out"]:qos
            };
            this.localClient.subscribe(topicsToSubscribe, (err, grantedTopics) => {
                if (!err) {
                    grantedTopics.forEach((topic) => {
                        if(topic.qos<=3)
                            DEBUG.log("LOCAL Subscribed to: " + JSON.stringify(topic));
                        else
                            DEBUG.log("Error Subscribing on LOCAL: " + JSON.stringify(topic));
                    });
                } else {
                    DEBUG.log("LOCAL Subscribe Error: " + JSON.stringify(err));
                }
            });
        }
    }

    public localOnMessageArrived(topic: string, message: string) {
        // DEBUG.log("Local Message at " + topic + ":", message);
        try {
        const topicParts = topic.split("/");
        if (topicParts[2] == "ping") {
            DEBUG.log("PRIVATE PING: " + message);
            return;
        }
        if (this.publicClient) {
            let publicTopic = topicParts[0];
            publicTopic += "/" + AppProperties.clientMacAddress;
            for (let i = 3; i < topicParts.length; i++) {
                publicTopic += "/" + topicParts[i];
            }
            DEBUG.log("--->>>" + publicTopic);
            this.publicClient.publish(publicTopic, message);
        }
        AlarmHandler.handleAlarm(topic, message);
        } catch (ex) {
            DEBUG.log("localOnMessageArrived ERROR: " + ex);
        }
    }

    public localReconnect() {
        DEBUG.log("Reconnecting to local broker...");
    }

    public localOnError(err: any) {
        DEBUG.err(err);
    }

    public connectToPublicBroker() {
        let clientOptions: IClientOptions;
        if(AppProperties.publicBrokerRequirePassword){
            clientOptions = {
                clientId: AppProperties.clientMacAddress + "_mqttjs_" + Math.random().toString(16).substr(2, 8),
                username: AppProperties.clientMacAddress,
                password: AppProperties.publicBrokerPassword,
                keepalive: 10,
                port: AppProperties.publicBrokerHostPort,
                connectTimeout: 5000,
                reconnectPeriod: 1000,
            };
        }
        else{
            clientOptions = {
                clientId: AppProperties.clientMacAddress + "_mqttjs_" + Math.random().toString(16).substr(2, 8),
                keepalive: 10,
                port: AppProperties.publicBrokerHostPort,
                connectTimeout: 5000,
                reconnectPeriod: 1000,
            };
        }
        this.publicClient = connect(AppProperties.publicBrokerHostName, clientOptions);
        this.publicClient.on("connect", () => { this.publicOnConnect(); });
        this.publicClient.on("message", (topic, message) => { this.publicOnMessageArrived(topic, message.toString()); });
        this.publicClient.on("reconnect", () => { this.publicReconnect(); });
    }

    public publicOnConnect() {
        if (this.publicClient != null) {
            DEBUG.log("connected to public Broker");
            // this.publicClient.subscribe('atomiothub/202481586688028/ping');
            const qos:QoS = AppProperties.publicSubscribeQos;
            const topicsToSubscribe: ISubscriptionMap = {
                ["atomiothub/" + AppProperties.clientMacAddress + "/+/+/in"]:qos,
                ["atomiothub/" + AppProperties.clientMacAddress + "/discover/in"]:qos,
                ["atomiothub/" + AppProperties.clientMacAddress + "/scheduler/in"]:qos,
                ["atomiothub/" + AppProperties.clientMacAddress + "/binder/in"]:qos,
                ["atomiothub/" + AppProperties.clientMacAddress + "/alarms/in"]:qos,
                ["atomiothub/" + AppProperties.clientMacAddress + "/config/in"]:qos,
                ["atomiothub/" + AppProperties.clientMacAddress + "/streamer/in"]:qos,
                ["atomiothub/" + AppProperties.clientMacAddress + "/ping"]:qos
            };
            this.publicClient.subscribe(topicsToSubscribe, (err, grantedTopics) => {
                if (!err) {
                    grantedTopics.forEach((topic) => {
                        if(topic.qos<=3)
                            DEBUG.log("PUBLIC Subscribed to: " + JSON.stringify(topic));
                        else
                            DEBUG.log("Error Subscribing on PUBLIC: " + JSON.stringify(topic));
                    });
                } else {
                    DEBUG.log("PUBLIC Subscribe Publicly  Error: " + JSON.stringify(err));
                }
            });
        }
    }

    public publicOnMessageArrived(topic: string, message: string) {
        try {
            // DEBUG.log("Public Message at " + topic + ": " + message);
            const topicParts = topic.split("/");
            if (topicParts[2] == "ping") {
                DEBUG.log("PUBLIC PING: " + message);
                return;
            } else if (topicParts[2] == "scheduler") {
                DEBUG.log("Processing ScheduleCommand...");
                SelfProgrammer.handleSchedule(message, (response: SceneSlotCommand|TimeSlotCommand) => {
                    if (this.publicClient) {
                        if ("endTime" in response) {
                            const sceneSlotCommand: any = response;
                            this.publicClient.publish("atomiothub/" + AppProperties.clientMacAddress + "/scheduler/out", SceneSlotCommandConverter.sceneSlotCommandToJson(sceneSlotCommand));
                        } else {
                            const timeSlotCommand: any = response;
                            this.publicClient.publish("atomiothub/" + AppProperties.clientMacAddress + "/scheduler/out", TimeSlotCommandConverter.timeSlotCommandToJson(timeSlotCommand));
                        }
                        DEBUG.log("ScheduleCommand Processing done!!");
                    }
                });
            } else if (topicParts[2] == "binder") {
                DEBUG.log("Processing BinderCommand...");
                SelfProgrammer.handleBinding(message, (response: BindCommand) => {
                    if (this.publicClient) {
                        this.publicClient.publish("atomiothub/" + AppProperties.clientMacAddress + "/binder/out", BindCommandConverter.bindCommandToJson(response));
                        DEBUG.log("BinderCommand Processing done!!");
                    }
                });
            } else if (topicParts[2] == "alarms") {
                DEBUG.log("Processing AlarmCommand...");
                SelfProgrammer.handleAlarms(message, (response: AlarmCommand) => {
                    if (this.publicClient) {
                        this.publicClient.publish("atomiothub/" + AppProperties.clientMacAddress + "/alarm/out", AlarmCommandConverter.alarmCommandToJson(response));
                        DEBUG.log("AlarmCommand Processing done!!");
                    }
                });
            } else if (topicParts[2] == "streamer") {
                DEBUG.log("Processing StreamCommand...");
                StreamFactory.processStreamRequest(message, (response: IStreamResponse) => {
                    if (this.publicClient) {
                        this.publicClient.publish("atomiothub/" + AppProperties.clientMacAddress + "/streamer/out", StreamResponseConvert.streamResponseToJson(response));
                    }
                    DEBUG.log("StreamCommand Processing done!!");
                });
            } else if (this.localClient) {
                let localTopic = topicParts[0];
                localTopic += "/" + AppProperties.localBrokerUsername;
                localTopic += "/" + AppProperties.localBrokerPassword;
                for (let i = 2; i < topicParts.length; i++) {
                    localTopic += "/" + topicParts[i];
                }
                DEBUG.log("<<<---" + localTopic);
                this.localClient.publish(localTopic, message);
            }
        } catch (ex) {
            DEBUG.log("publicOnMessageArrived ERROR: " , ex);
        }
    }

    public publicReconnect() {
        DEBUG.log("Reconnecting to public broker...");
    }
}
