import { patch } from "@web/core/utils/patch";
import { PosStore } from "@point_of_sale/app/services/pos_store";
import { getOrderChanges } from "@point_of_sale/app/models/utils/order_change";

patch(PosStore.prototype, {
    _getStrictTableMergeTarget(destinationTable, sourceOrder) {
        const targetTable = destinationTable?.rootTable || destinationTable;
        if (!targetTable?.id) {
            return null;
        }

        return (
            this.models["pos.order"].find(
                (order) =>
                    !order.finalized &&
                    order.table_id?.id === targetTable.id &&
                    (!sourceOrder || order.uuid !== sourceOrder.uuid)
            ) || null
        );
    },
    async mergeOrders(sourceOrder, destOrder) {
        // Guard against accidental self-merge or empty destination.
        if (!sourceOrder || !destOrder || sourceOrder.uuid === destOrder.uuid) {
            return destOrder || sourceOrder;
        }
        return await super.mergeOrders(...arguments);
    },
    async transferOrder(orderUuid, destinationTable = null, destinationOrder = null) {
        if (!destinationTable && !destinationOrder) {
            return;
        }

        const sourceOrder = this.models["pos.order"].getBy("uuid", orderUuid);
        if (!sourceOrder) {
            return;
        }

        if (destinationOrder?.uuid === sourceOrder.uuid) {
            return;
        }

        if (destinationTable) {
            if (!this.prepareOrderTransfer(sourceOrder, destinationTable)) {
                await this.syncAllOrders({ orders: [sourceOrder] });
                return;
            }

            destinationOrder = this._getStrictTableMergeTarget(destinationTable, sourceOrder);
            if (!destinationOrder) {
                sourceOrder.table_id = destinationTable;
                this.setOrder(sourceOrder);
                await this.syncAllOrders({ orders: [sourceOrder] });
                await this.setTable(destinationTable);
                return;
            }
        }

        await this.mergeOrders(sourceOrder, destinationOrder);
        if (destinationTable) {
            await this.setTable(destinationTable);
        }
    },
    async mergeTableOrders(orderUuid, destinationTable) {
        const sourceOrder = this.models["pos.order"].getBy("uuid", orderUuid);
        if (!sourceOrder) {
            return;
        }

        if (!this.prepareOrderTransfer(sourceOrder, destinationTable)) {
            await this.syncAllOrders({ orders: [sourceOrder] });
            return;
        }

        const destinationOrder = this._getStrictTableMergeTarget(destinationTable, sourceOrder);
        if (!destinationOrder) {
            sourceOrder.table_id = destinationTable;
            this.setOrder(sourceOrder);
            await this.syncAllOrders({ orders: [sourceOrder] });
            await this.setTable(destinationTable);
            return;
        }

        await this.mergeOrders(sourceOrder, destinationOrder);
        await this.setTable(destinationTable);
    },
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