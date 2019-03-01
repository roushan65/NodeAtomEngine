import { createSocket, Socket } from "dgram";
import * as ip from "ip";
import { AddressInfo } from "net";
import { AppProperties } from "./../appProperties/AppProperties";
import { DEBUG } from "./../helpers/DEBUG";

export class AutoDetectServer {

    public static start() {
        this.server = createSocket("udp4");
        this.server.on("error", (err) => {
            console.log(`server error:\n${err.stack}`);
            this.server.close();
        });

        this.server.on("message", (msg, rinfo) => {
            this.onMessage(msg, rinfo);
        });

        this.server.on("listening", () => {
            const address = this.server.address();
            console.log("Autodetector is listening...");
        });

        this.server.bind(AppProperties.AUTODETECT_UDP_PORT, "0.0.0.0", () => {DEBUG.log("Binding done!!"); });
    }
    private static server: Socket;

    private static onMessage(msg: Buffer, rinfo: AddressInfo) {
        console.log(`server got: ${msg} from ${rinfo.address}:${rinfo.port}`);
        const details = {
            name: "AtomEngine",
            isBroker: "true",
            version: AppProperties.VERSION,
            MAC: AppProperties.clientMacAddress,
            ip: ip.address(),
            brokerPort: "1883",
        };
        this.server.send(JSON.stringify(details), rinfo.port, rinfo.address, (err) => {
            if (!err) {
                DEBUG.log("Reply sent back");
            }
        });
    }

}
