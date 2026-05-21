import { patch } from "@web/core/utils/patch";
import { GeneratePrinterData } from "@point_of_sale/app/utils/printer/generate_printer_data";

/**
 * This class is a JS copy of the class PosOrderReceipt in Python.
 */
patch(GeneratePrinterData.prototype, {
    generateReceiptData() {
        const data = super.generateReceiptData(...arguments);
        const points = this.order.getLoyaltyPoints();
        const loyaltyLabelByKey = {
            won: "会员充值金额：",
            spent: "会员消费金额：",
            balance: "会员当前余额：",
        };
        data.extra_data.loyalties = [];

        for (const coupon of points) {
            for (const key of ["won", "spent", "balance"]) {
                if (coupon.points[key]) {
                    data.extra_data.loyalties.push({
                        name: coupon.program.portal_point_name,
                        type: loyaltyLabelByKey[key],
                        points: coupon.points[key],
                    });
                }
            }
        }

        data.extra_data.new_coupons = (this.order.new_coupon_info || []).map((coupon) => ({
            name: coupon.program_name,
            code: coupon.code,
            expiration_date: coupon.expiration_date,
            barcode_base64: coupon.barcode_base64,
        }));

        return data;
    },
});
