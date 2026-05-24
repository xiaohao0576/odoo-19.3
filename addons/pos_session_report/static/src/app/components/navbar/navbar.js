import { Navbar } from "@point_of_sale/app/components/navbar/navbar";
import { _t } from "@web/core/l10n/translation";
import { AlertDialog } from "@web/core/confirmation_dialog/confirmation_dialog";
import { patch } from "@web/core/utils/patch";

patch(Navbar.prototype, {
    async showSaleDetails() {
        try {
            const response = await this.pos.data.call("pos.session", "run_session_report_action_text", [
                [this.pos.session.id],
            ]);
            const message = response?.message || _t("No report text returned.");
            this.dialog.add(AlertDialog, {
                title: _t("Session Report"),
                body: message,
            });
        } catch (error) {
            const message =
                error?.data?.message || error?.message || _t("Failed to load session report.");
            this.dialog.add(AlertDialog, {
                title: _t("Session Report"),
                body: message,
            });
        }
    },
});
