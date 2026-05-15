import { PosData } from "@point_of_sale/app/services/data_service";
import { patch } from "@web/core/utils/patch";
import { session } from "@web/session";
import { rpc } from "@web/core/network/rpc";
import { registerPythonTemplate } from "@point_of_sale/app/utils/convert_python_template";

export const unpatchSelf = patch(PosData.prototype, {
    async loadInitialData() {
        const configId = session.data.config_id;
        const localData = await this.getCachedServerDataFromIndexedDB();
        const partners = localData?.["res.partner"] || [];
        await this.fetchReceiptTemplate();
        const data = await rpc(`/pos-self/data/${parseInt(configId)}`, {
            access_token: odoo.access_token,
        });
        data["res.partner"] = partners;
        return data;
    },
    async fetchReceiptTemplate() {
        const configId = session.data.config_id;
        const data = await rpc(`/pos-self/receipt-template/${parseInt(configId)}`);
        for (const [name, string] of data) {
            registerPythonTemplate(name, "", string);
        }
    },
    async loadFieldsAndRelations() {
        const configId = session.data.config_id;
        return await rpc(`/pos-self/relations/${parseInt(configId)}`);
    },
    get databaseName() {
        return `pos-self-order-${odoo.access_token}`;
    },
    async initializeDeviceIdentifier() {
        return false;
    },
    initIndexedDB() {
        // x_device_type: tablet mode bypasses IndexedDB to prevent cross-table data pollution
        return session.data.self_ordering_mode === "mobile" && session.data.x_device_type !== "tablet"
            ? super.initIndexedDB(...arguments)
            : true;
    },
    initListeners() {
        // x_device_type: tablet mode bypasses IndexedDB to prevent cross-table data pollution
        return session.data.self_ordering_mode === "mobile" && session.data.x_device_type !== "tablet"
            ? super.initListeners(...arguments)
            : true;
    },
    synchronizeLocalDataInIndexedDB() {
        // x_device_type: tablet mode bypasses IndexedDB to prevent cross-table data pollution
        return session.data.self_ordering_mode === "mobile" && session.data.x_device_type !== "tablet"
            ? super.synchronizeLocalDataInIndexedDB(...arguments)
            : true;
    },
    synchronizeServerDataInIndexedDB() {
        // x_device_type: tablet mode bypasses IndexedDB to prevent cross-table data pollution
        return session.data.self_ordering_mode === "mobile" && session.data.x_device_type !== "tablet"
            ? super.synchronizeServerDataInIndexedDB(...arguments)
            : true;
    },
    async getCachedServerDataFromIndexedDB() {
        // x_device_type: tablet mode bypasses IndexedDB to prevent cross-table data pollution
        return session.data.self_ordering_mode === "mobile" && session.data.x_device_type !== "tablet"
            ? await super.getCachedServerDataFromIndexedDB(...arguments)
            : {};
    },
    async getLocalDataFromIndexedDB() {
        // x_device_type: tablet mode bypasses IndexedDB to prevent cross-table data pollution
        return session.data.self_ordering_mode === "mobile" && session.data.x_device_type !== "tablet"
            ? await super.getLocalDataFromIndexedDB(...arguments)
            : {};
    },
    async missingRecursive(recordMap) {
        return recordMap;
    },
    async checkAndDeleteMissingOrders(results) {},
    async deleteRecordsInIndexedDB(model, ids) {
        // x_device_type: tablet mode bypasses IndexedDB to prevent cross-table data pollution
        return session.data.self_ordering_mode === "mobile" && session.data.x_device_type !== "tablet"
            ? await super.deleteRecordsInIndexedDB(...arguments)
            : true;
    },
});
