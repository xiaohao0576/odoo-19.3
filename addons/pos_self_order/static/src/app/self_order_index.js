import { Component } from "@odoo/owl";
import { MainComponentsContainer } from "@web/core/main_components_container";
import { useSelfOrder } from "@pos_self_order/app/services/self_order_service";
import { Router } from "@pos_self_order/app/router";
import { LandingPage } from "@pos_self_order/app/pages/landing_page/landing_page";
import { ProductListPage } from "@pos_self_order/app/pages/product_list_page/product_list_page";
import { ComboPage } from "@pos_self_order/app/pages/combo_page/combo_page";
import { ProductPage } from "@pos_self_order/app/pages/product_page/product_page";
import { CartPage } from "@pos_self_order/app/pages/cart_page/cart_page";
import { PaymentPage } from "@pos_self_order/app/pages/payment_page/payment_page";
import { ConfirmationPage } from "@pos_self_order/app/pages/confirmation_page/confirmation_page";
import { EatingLocationPage } from "@pos_self_order/app/pages/eating_location_page/eating_location_page";
import { StandNumberPage } from "@pos_self_order/app/pages/stand_number_page/stand_number_page";
import { OrdersHistoryPage } from "@pos_self_order/app/pages/order_history_page/order_history_page";
import { LoadingOverlay } from "@pos_self_order/app/components/loading_overlay/loading_overlay";
import { hasTouch } from "@web/core/browser/feature_detection";
import { init as initDebugFormatters } from "@point_of_sale/app/utils/debug-formatter";
import { insertKioskStyle } from "./kiosk_style";

export class selfOrderIndex extends Component {
    static template = "pos_self_order.selfOrderIndex";
    static props = [];
    static components = {
        Router,
        ProductPage,
        OrdersHistoryPage,
        ComboPage,
        PaymentPage,
        ConfirmationPage,
        ProductListPage,
        CartPage,
        EatingLocationPage,
        StandNumberPage,
        LandingPage,
        LoadingOverlay,
        MainComponentsContainer,
    };

    setup() {
        this.selfOrder = useSelfOrder();
        window.posmodel = this.selfOrder;

        this._setupPwa();

        // Disable cursor on touch devices (required on IoT Box Kiosk)
        if (hasTouch()) {
            document.body.classList.add("touch-device");
        }

        if (this.selfOrder.kioskMode) {
            document.documentElement.classList.add("kiosk");
        }

        insertKioskStyle(this.selfOrder.config.self_ordering_primary_color);

        if (this.env.debug) {
            initDebugFormatters();
        }
    }

    _setupPwa() {
        const url = new URL(window.location.href);
        const pathMatch = url.pathname.match(/^\/pos-self\/(\d+)/);
        const configId = pathMatch?.[1];
        const accessToken = url.searchParams.get("access_token") || window.odoo?.access_token;
        const xDeviceType = url.searchParams.get("x_device_type");

        if (!configId || !accessToken || xDeviceType !== "tablet") {
            return;
        }

        const manifestUrl = `/pos-self/manifest.json?path=${encodeURIComponent(`/pos-self/${configId}`)}&access_token=${encodeURIComponent(accessToken)}&x_device_type=tablet`;

        // Ensure there is exactly one manifest link and keep it up to date.
        let manifestLink = document.querySelector('link[rel="manifest"]');
        if (!manifestLink) {
            manifestLink = document.createElement("link");
            manifestLink.rel = "manifest";
            document.head.appendChild(manifestLink);
        }
        manifestLink.href = manifestUrl;

        if ("serviceWorker" in navigator) {
            navigator.serviceWorker.register("/pos-self/service-worker.js", { scope: "/pos-self/" });
        }
    }

    get selfIsReady() {
        return this.selfOrder.models["product.product"].length > 0;
    }
}
