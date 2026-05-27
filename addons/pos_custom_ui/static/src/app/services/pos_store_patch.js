import { patch } from "@web/core/utils/patch";
import { PosStore } from "@point_of_sale/app/services/pos_store";
import { getOrderChanges } from "@point_of_sale/app/models/utils/order_change";

patch(PosStore.prototype, {
    getTableOrders(tableId) {
        const table = this.models["restaurant.table"].get(tableId);
        if (!table) {
            return [];
        }

        // Keep base restaurant ordering: table_id orders first.
        const baseOrders = super.getTableOrders(...arguments) || [];
        // Ensure self-ordering orders are present even when another patch is not loaded first.
        const selfOrderingOrders = this.models["pos.order"].filter(
            (order) =>
                order.self_ordering_table_id?.id === table.id &&
                order.table_id?.id !== table.id &&
                (!order.finalized || order.uiState.screen_data?.value?.name === "TipScreen")
        );

        const mergedOrders = [...baseOrders];
        const seen = new Set(baseOrders.map((order) => order.uuid));
        for (const order of selfOrderingOrders) {
            if (!seen.has(order.uuid)) {
                seen.add(order.uuid);
                mergedOrders.push(order);
            }
        }

        const withMeta = mergedOrders.map((order, index) => ({
            order,
            index,
            hasChanges:
                getOrderChanges(order, this.config.preparationCategories).nbrOfChanges > 0,
        }));

        if (!withMeta.some((item) => item.hasChanges)) {
            return mergedOrders;
        }

        withMeta.sort((a, b) => {
            if (a.hasChanges !== b.hasChanges) {
                return a.hasChanges ? -1 : 1;
            }
            if (a.hasChanges && b.hasChanges) {
                const aTs = a.order.date_order?.ts ?? Number.MAX_SAFE_INTEGER;
                const bTs = b.order.date_order?.ts ?? Number.MAX_SAFE_INTEGER;
                if (aTs !== bTs) {
                    return aTs - bTs;
                }
            }
            return a.index - b.index;
        });

        return withMeta.map((item) => item.order);
    },
    getChangeCount(tableId) {
        // Include regular restaurant orders and self-ordering orders linked to the same table.
        const tableOrders = this.models["pos.order"].filter(
            (order) =>
                !order.finalized &&
                (order.table_id?.id === tableId || order.self_ordering_table_id?.id === tableId)
        );

        let changeCount = 0;
        for (const order of tableOrders) {
            const changes = getOrderChanges(order, this.config.preparationCategories);
            changeCount += changes.nbrOfChanges;
        }

        return { changes: changeCount };
    },
});