import { patch } from "@web/core/utils/patch";
import { ProductScreen } from "@point_of_sale/app/screens/product_screen/product_screen";

patch(ProductScreen.prototype, {
    getProductName(product) {
        const baseName = super.getProductName(...arguments) || product?.name || "";
        const price = product?.displayPriceUnit;
        if (!price) {
            return baseName;
        }
        return `${price} | ${baseName}`;
    },
});
