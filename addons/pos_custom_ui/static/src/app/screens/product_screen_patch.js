import { patch } from "@web/core/utils/patch";
import { ProductScreen } from "@point_of_sale/app/screens/product_screen/product_screen";

patch(ProductScreen.prototype, {
    getProductName(product) {
        const baseName = super.getProductName(...arguments) || product?.name || "";

        try {
            const currentOrder = this.currentOrder;
            const pricelist = currentOrder?.pricelist_id || this.pos?.config?.pricelist_id;

            if (!product?.getPrice) {
                return baseName;
            }

            // Pricelist can be missing in some UI states; getPrice(false, ...) falls back to base sale price.
            const basePrice = product.getPrice(pricelist || false, 1, 0, false, false);
            const fiscalPosition = currentOrder?.fiscal_position_id || false;
            const taxesData = product.getTaxDetails?.({
                overridedValues: {
                    price: basePrice,
                    fiscalPosition,
                },
            });
            const displayPrice =
                taxesData && this.pos?.config?.iface_tax_included === "total"
                    ? taxesData.total_included
                    : taxesData?.total_excluded ?? basePrice;

            if (!Number.isFinite(displayPrice)) {
                console.warn(`${LOG_PREFIX} getProductName fallback: displayPrice is not finite`, {
                    productId: product?.id,
                    basePrice,
                    displayPrice,
                    taxesData,
                });
                return baseName;
            }

            const formatCurrency = this?.env?.utils?.formatCurrency;
            if (!formatCurrency) {
                return baseName;
            }

            const formattedPrice = formatCurrency(displayPrice);
            return `${baseName}(${formattedPrice})`;
        } catch {
            return baseName;
        }
    },
});
