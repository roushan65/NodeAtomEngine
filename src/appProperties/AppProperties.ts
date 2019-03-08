import {getMac} from "getmac";
import { DEBUG } from "./../helpers/DEBUG";
import { QoS } from "mqtt";
export class AppProperties {

    public static clientMacAddress: string = "202481586688028";
    public static readonly VERSION: string = "VER_1.0.1";
    public static readonly AUTODETECT_UDP_PORT: number = 10000;
    public static readonly CONFIG_FILE_NAME: string = "data/config.json";

    public static readonly localBrokerHostName: string = "mqtt://localhost";
    public static readonly localBrokerHostPort: number = 1883;
    public static readonly localBrokerUsername: string = "mqtthub";
    public static readonly localBrokerPassword: string = "mqtthub";
    public static readonly localBrokerRequirePassword: boolean = true;
    public static readonly localSubscribeQos: QoS = 1;

    public static readonly publicBrokerHostName: string = "mqtt://test.mosquitto.org";
    public static readonly publicBrokerHostPort: number = 1883;
    public static readonly publicBrokerPassword: string = "";
    public static readonly publicBrokerRequirePassword: boolean = false;
    public static readonly publicSubscribeQos: QoS = 1;

    public static readonly RTMP_SERVER_HOST_NAME: string = "13.127.29.43";
    public static readonly RTMP_SERVER_PORT: string = "5555";
    public static readonly STREAMKEY = "testkey";

    public static initialize(onFinished: any) {

        console.log("ATOMEngine (" + this.VERSION + ") Starting...");

        console.log("   ______                   ______            _          ");
        console.log("  / ____/___  ________     / ____/___  ____ _(_)___  ___ ");
        console.log(" / /   / __ \\/ ___/ _ \\   / __/ / __ \\/ __ \\`/ / __ \\/ _ \\");
        console.log("/ /___/ /_/ / /  /  __/  / /___/ / / / /_/ / / / / /  __/");
        console.log("\\____/\\____/_/   \\___/  /_____/_/ /_/\\__, /_/_/ /_/\\___/");
        console.log("                                    /____/ " + this.VERSION);

        console.log("Loading configurartion...");

        getMac((err: any, macAddress: any) => {
            if (err) {  throw err; }
            this.clientMacAddress = macAddress.replace( RegExp(":", 'g'),"");
            this.clientMacAddress = parseInt(this.clientMacAddress,16).toString();
            console.log("Device MAC-ADDRESS: " + this.clientMacAddress);
            //console.log("Device MAC-ADDRESS: " + this.clientMacAddress);
            onFinished();
        });
    }
}
