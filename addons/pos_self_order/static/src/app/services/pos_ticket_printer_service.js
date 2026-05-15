import { patch } from "@web/core/utils/patch";
import { PosTicketPrinterService } from "@point_of_sale/app/services/pos_ticket_printer_service";
import { ConnectionLostError } from "@web/core/network/rpc";

patch(PosTicketPrinterService.prototype, {
    showPrinterErrorDialog(message, retryFunction, fallbackFunction = undefined) {
        return false;
    },
    async markReceiptAsPrinted(order) {
        return false;
    },
    // x_device_type: used to check printer reachability before tablet mode order confirmation
    async pingPrinters() {
        const printers = this.printers;
        if (!printers.length) {
            return true;
        }

        // Build deduplicated set of /ping URLs based on host:port
        const pingUrls = new Set();
        for (const printer of printers) {
            try {
                const protocol = printer.use_lna ? "http:" : "https:";
                const parsed = new URL(`${protocol}//${printer.printer_ip}`);
                pingUrls.add(`${parsed.protocol}//${parsed.host}/ping`);
            } catch (e) {
                throw new ConnectionLostError({
                    message: `Invalid printer IP: ${printer.printer_ip}`,
                    data: { printer_ip: printer.printer_ip },
                });
            }
        }

        const results = await Promise.allSettled(
            Array.from(pingUrls).map(async (url) => {
                const response = await fetch(url, {
                    method: "POST",
                    signal: AbortSignal.timeout(2000),
                });
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }
                const text = await response.text();
                if (text.trim() !== "pong") {
                    throw new Error(`Unexpected response: ${text}`);
                }
                return true;
            })
        );

        const failed = results.filter((r) => r.status === "rejected");
        if (failed.length > 0) {
            throw new ConnectionLostError({
                message: `Printers unreachable: ${failed.map((f) => f.reason?.message).join(", ")}`,
                data: { failedCount: failed.length },
            });
        }
        return true;
    },
});
