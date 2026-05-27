import { patch } from "@web/core/utils/patch";
import { TicketScreen } from "@point_of_sale/app/screens/ticket_screen/ticket_screen";

patch(TicketScreen.prototype, {
    setup() {
        super.setup(...arguments);
        this.activeOrderFilter = this.activeOrderFilter.bind(this);
    },
    _isTableOrderAllowed(order) {
        const filter = this.state.tableOrderFilter;
        if (!filter) {
            return true;
        }

        const allowedIds = new Set(filter.orderIds || []);
        const allowedUuids = new Set(filter.orderUuids || []);
        return allowedIds.has(order.id) || allowedUuids.has(order.uuid);
    },
    activeOrderFilter(order) {
        return super.activeOrderFilter(...arguments) && this._isTableOrderAllowed(order);
    },
});