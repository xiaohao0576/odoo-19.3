import { useState } from "@web/owl2/utils";
import { Component, onMounted, onWillUnmount } from "@odoo/owl";
import { useService } from "@web/core/utils/hooks";

export class PrintersConnectionLostPopup extends Component {
    static template = "pos_self_order.PrintersConnectionLostPopup";
    static props = ["close"];

    setup() {
        this.ticketPrinter = useService("pos_ticket_printer");
        this.state = useState({
            online: false,
        });

        this.checkConnectivity = this.checkConnectivity.bind(this);

        onMounted(() => {
            this.checkConnectivity();
            this.interval = setInterval(this.checkConnectivity, 2000);
        });

        onWillUnmount(() => {
            clearInterval(this.interval);
            clearTimeout(this.closeTimeout);
        });
    }

    async checkConnectivity() {
        try {
            await this.ticketPrinter.pingPrinters();
            this.state.online = true;
            clearTimeout(this.closeTimeout);
            this.closeTimeout = setTimeout(() => {
                this.props.close();
            }, 2000);
        } catch {
            this.state.online = false;
            clearTimeout(this.closeTimeout);
        }
    }
}
