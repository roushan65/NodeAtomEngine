import { FfmpegCommand } from "fluent-ffmpeg";
import * as md5 from "md5";
import { AppProperties } from "./../appProperties/AppProperties";
import { DEBUG } from "./../helpers/DEBUG";
import { StreamCommand, StreamCommandConvter } from "./StreamCommand";
import { IStreamResponse } from "./StreamRespose";
const ffmpeg = require("fluent-ffmpeg");

export class StreamFactory {

    public static processStreamRequest(jsonStr: string, callBack: any) {
        const jsonObj = JSON.parse(jsonStr);
        if (!jsonObj.type) {
            return;
        }
        const streamCommand: StreamCommand = StreamCommandConvter.toStreamCommand(jsonStr);
        if (!this.streamMap.get(streamCommand.source) && streamCommand.command == "start") {
            DEBUG.log("Creating new Handler for " + streamCommand.source);
            const newStreamHandler: StreamHandler = new StreamHandler(StreamCommandConvter.streamCommandToJson(streamCommand));
            this.streamMap.set(streamCommand.source, newStreamHandler);
            this.streamClientMap.set(streamCommand.source, 1);
            newStreamHandler.handleStreamCommand((streamResponse: IStreamResponse) => {
                if (streamResponse.command == "error") {
                    this.streamClientMap.delete(streamCommand.source);
                    this.streamMap.delete(streamCommand.source);
                }
                callBack(streamResponse);
            });
        }
        const streamHandler = this.streamMap.get(streamCommand.source);
        if (streamHandler) {
            let num = this.streamClientMap.get(streamCommand.source);
            if (num) {
                if (streamCommand.command == "start") {
                    this.streamClientMap.set(streamCommand.source, ++num);
                    callBack(streamHandler.getStreamResponse());
                } else if (streamCommand.command == "stop") {
                    this.streamClientMap.set(streamCommand.source, --num);
                    console.log("num=" + this.streamClientMap.get(streamCommand.source));
                    if (num == 1) {
                        const handler: StreamHandler|undefined = this.streamMap.get(streamCommand.source);
                        if (handler) {
                            handler.setStreamCommand(jsonStr);
                            handler.handleStreamCommand(callBack);
                        }
                        this.streamClientMap.delete(streamCommand.source);
                        this.streamMap.delete(streamCommand.source);
                    }
                }
            }
        }
    }

    private static streamMap: Map<string, StreamHandler> = new Map<string, StreamHandler>();
    private static streamClientMap: Map<string, number> = new Map<string, number>();
}

export class StreamHandler {

    private streamCommand: StreamCommand;

    private ffmpeg: FfmpegCommand;

    private streamResponse: IStreamResponse | null;

    constructor(jsonStr: string) {
        this.streamCommand = StreamCommandConvter.toStreamCommand(jsonStr);
        this.ffmpeg = ffmpeg(); // new FfmpegCommand();
        this.streamResponse = null;
    }

    public setStreamCommand(jsonStr: string) {
        this.streamCommand = StreamCommandConvter.toStreamCommand(jsonStr);
    }

    public getStreamResponse(): IStreamResponse | null {
        return this.streamResponse;
    }

    public handleStreamCommand(callBack: any) {
        if (this.streamCommand.command.toLowerCase() == "start") {
            this.startStreaming(callBack);
        } else if (this.streamCommand.command.toLowerCase() == "stop") {
            this.stopStreaming(callBack);
             }
    }

    private startStreaming(callBack: any) {
        console.log("Starting streaming");
        let sign = "";
        if (this.streamCommand.auth.toLowerCase() == "true") {
            const streamPath = this.streamCommand.destination;
            const expiryTime = Math.floor(Date.now() / 1000) + 120;
            const plainString = streamPath + "-" + expiryTime + "-testkey";
            sign = expiryTime + "-" + md5(plainString);
        }
        DEBUG.log("sign=" + sign);

        const port = (AppProperties.RTMP_SERVER_PORT != "") ? ":" + AppProperties.RTMP_SERVER_PORT : "";
        const signArg = (this.streamCommand.auth.toLowerCase() == "true") ? "?sign=" + sign : "";
        this.ffmpeg.addInput(this.streamCommand.source)
            .outputFormat("flv")
            .outputOption(this.streamCommand.outputOptions.split(","))
            .output("rtmp://" + AppProperties.RTMP_SERVER_HOST_NAME + port + this.streamCommand.destination + signArg)
            .on("start", (commandLine: any) => {
                DEBUG.log("Streaming started with command: " + commandLine);
            })
            .on("codecData", (data: any) => {
                this.streamResponse = {
                    type: "streamResponse",
                    command: "started",
                    url: "rtmp://" + AppProperties.RTMP_SERVER_HOST_NAME + port + this.streamCommand.destination + signArg,
                    auth: this.streamCommand.auth,
                };
                callBack(this.streamResponse);
                DEBUG.log("Input is " + data.audio + " audio " + "with " + data.video + " video");
            })
            .on("progress", (progress: any) => {
                // console.log("Time :" + progress.timemark);
            })
            .on("end", (stdout: any, stderr: any) => {
                DEBUG.log("Transcoding succeeded !");
            })
            .on("error", (err, stdout, stderr) => {
                DEBUG.log("Cannot process video: " + err.message);
                this.streamResponse = {
                    type: "streamResponse",
                    command: "error",
                    url: "",
                    auth: this.streamCommand.auth,
                };
                callBack(this.streamResponse);
            }).run();
    }

    private stopStreaming(callBack: any) {
        DEBUG.log("Stoping Stream");
        this.ffmpeg.kill("SIGKILL");
        const streamResponse: IStreamResponse = {
            type: "streamResponse",
            command: "stopped",
            url: "",
            auth: this.streamCommand.auth,
        };
        callBack(streamResponse);
    }
}
