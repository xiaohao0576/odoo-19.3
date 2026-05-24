// x_device_type: lightweight PIN popup for tablet ordering mode
import { Component, useState, useRef, onMounted } from "@odoo/owl";
import { _t } from "@web/core/l10n/translation";

export class XTabletPinPopup extends Component {
    static template = "pos_self_order.XTabletPinPopup";
    static props = {
        getPayload: Function,
        close: Function,
    };

    setup() {
        this.inputRef = useRef("input");
        this.state = useState({ value: "" });
        onMounted(() => this.inputRef.el?.focus());
    }

    confirm() {
        this.props.getPayload(this.state.value);
        this.props.close();
    }

    onInput(ev) {
        const digitsOnly = ev.target.value.replace(/\D+/g, "");
        if (digitsOnly !== ev.target.value) {
            ev.target.value = digitsOnly;
        }
        this.state.value = digitsOnly;
    }

    onKeydown(ev) {
        if (ev.key === "Enter") {
            this.confirm();
        }
    }
}
