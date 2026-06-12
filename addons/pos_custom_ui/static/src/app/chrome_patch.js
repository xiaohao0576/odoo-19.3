import { user } from "@web/core/user";
import { patch } from "@web/core/utils/patch";
import { onWillDestroy } from "@odoo/owl";
import { useState } from "@web/owl2/utils";
import { Chrome } from "@point_of_sale/app/pos_app";

const { DateTime } = luxon;

const WARNING_WINDOW_SECONDS = 7 * 24 * 60 * 60;

patch(Chrome.prototype, {
    setup() {
        super.setup(...arguments);
        this.expirationBannerState = useState({
            visible: false,
            mode: "warning",
            message: "",
            deadlineText: "",
        });

        this._expirationTimer = null;
        this._clockStartMs = Date.now();
        this._serverStartUtc = this._parseServerNowUtc();
        this._expirationUtc = this._parseExpirationUtc();
        this._timezone = this._resolveTimezone();
        this._updateExpirationBanner();

        this._expirationTimer = setInterval(() => {
            this._updateExpirationBanner();
        }, 1000);

        onWillDestroy(() => {
            if (this._expirationTimer) {
                clearInterval(this._expirationTimer);
                this._expirationTimer = null;
            }
        });
    },

    _resolveTimezone() {
        const candidate =
            user.tz || Intl.DateTimeFormat().resolvedOptions().timeZone || "local";
        const zoneDate = DateTime.now().setZone(candidate);
        return zoneDate.isValid ? candidate : "local";
    },

    _parseServerNowUtc() {
        const serverDate = this.pos?.config?._data_server_date;
        if (!serverDate) {
            return DateTime.utc();
        }

        const parsed = DateTime.fromSQL(serverDate, { zone: "UTC" });
        return parsed.isValid ? parsed : DateTime.utc();
    },

    _parseExpirationUtc() {
        const expirationDate = this.pos?.config?._expiration_date;
        if (!expirationDate) {
            return null;
        }

        const parsed = DateTime.fromSQL(expirationDate, { zone: "UTC" });
        return parsed.isValid ? parsed : null;
    },

    _computeCurrentUtc() {
        return this._serverStartUtc.plus({ milliseconds: Date.now() - this._clockStartMs });
    },

    _formatDuration(totalSeconds) {
        const seconds = Math.max(0, totalSeconds);
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600)
            .toString()
            .padStart(2, "0");
        const minutes = Math.floor((seconds % 3600) / 60)
            .toString()
            .padStart(2, "0");
        const secs = (seconds % 60).toString().padStart(2, "0");
        if (this._isSimplifiedChinese()) {
            return `${days}天 ${hours}:${minutes}:${secs}`;
        }
        return `${days} day(s) ${hours}:${minutes}:${secs}`;
    },

    _isSimplifiedChinese() {
        const lang = (this.pos?.user?.lang || user.lang || "").toLowerCase();
        return lang === "zh_cn" || lang.startsWith("zh");
    },

    _buildWarningMessage(durationText) {
        if (this._isSimplifiedChinese()) {
            return `系统服务将于 ${durationText} 后到期，请及时续费，以免造成业务中断。`;
        }
        return `System service will expire in ${durationText}. Please renew promptly to avoid business interruption.`;
    },

    _buildExpiredMessage(durationText) {
        if (this._isSimplifiedChinese()) {
            return `系统服务已过期 ${durationText}。`;
        }
        return `System service has expired for ${durationText}.`;
    },

    _buildDeadlineMessage(deadlineText) {
        if (this._isSimplifiedChinese()) {
            return `到期时间（${this._timezone}）：${deadlineText}`;
        }
        return `Expiration time (${this._timezone}): ${deadlineText}`;
    },

    _formatDeadline(expirationInTz) {
        return expirationInTz.toFormat("yyyy-LL-dd HH:mm:ss ZZZZ");
    },

    _updateExpirationBanner() {
        if (!this._expirationUtc) {
            this.expirationBannerState.visible = false;
            return;
        }

        const nowInTz = this._computeCurrentUtc().setZone(this._timezone);
        const expirationInTz = this._expirationUtc.setZone(this._timezone);

        const diffSeconds = Math.floor(expirationInTz.diff(nowInTz, "seconds").seconds);
        const isExpired = diffSeconds < 0;

        if (!isExpired && diffSeconds > WARNING_WINDOW_SECONDS) {
            this.expirationBannerState.visible = false;
            return;
        }

        const durationText = this._formatDuration(Math.abs(diffSeconds));
        this.expirationBannerState.visible = true;
        this.expirationBannerState.mode = isExpired ? "expired" : "warning";
        this.expirationBannerState.message = isExpired
            ? this._buildExpiredMessage(durationText)
            : this._buildWarningMessage(durationText);
        this.expirationBannerState.deadlineText = this._buildDeadlineMessage(
            this._formatDeadline(expirationInTz)
        );
    },
});
