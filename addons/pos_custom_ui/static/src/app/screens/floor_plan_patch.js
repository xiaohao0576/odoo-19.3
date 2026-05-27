import { patch } from "@web/core/utils/patch";
import { FloorPlan } from "@pos_restaurant/app/screens/floor_screen/floor_plan/floor_plan";

patch(FloorPlan.prototype, {
    getTableDraftOrders(table) {
        const baseTable = table?.rootTable || table;
        if (!baseTable?.id) {
            return [];
        }

        return this.pos.getTableOrders(baseTable.id).filter((order) => order.state === "draft");
    },
    getTableDraftOrderCount(table) {
        return this.getTableDraftOrders(table).length;
    },
    getTableDraftOrderAmount(table) {
        return this.getTableDraftOrders(table).reduce(
            (sum, order) => sum + (order.amount_total || 0),
            0
        );
    },
    getTableDraftOrderAmountLabel(table) {
        return this.env.utils.formatCurrency(this.getTableDraftOrderAmount(table));
    },
    async onClickTable(table, ev) {
        if (table.parent_id) {
            return this.onClickTable(table.parent_id, ev);
        }
        if (this.pos.isOrderTransferMode) {
            return;
        }

        const orders = this.getTableDraftOrders(table);
        if (orders.length > 1) {
            this.onClickTableDraftOrders(table, ev);
            return;
        }

        await this.pos.setTableFromUi(table);
    },
    onClickTableDraftOrders(table, ev) {
        ev?.preventDefault?.();
        ev?.stopPropagation?.();

        const orders = this.getTableDraftOrders(table);
        if (!orders.length) {
            return;
        }

        this.pos.navigate("TicketScreen", {
            stateOverride: {
                selectedOrderUuid: orders[0].uuid,
                page: 1,
                tableOrderFilter: {
                    orderIds: orders.map((order) => order.id),
                    orderUuids: orders.map((order) => order.uuid),
                },
            },
        });
    },
});