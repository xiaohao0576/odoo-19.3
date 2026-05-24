from odoo import _, models


class PosSession(models.Model):
    _inherit = "pos.session"

    def run_session_report_action_text(self):
        self.ensure_one()

        action = self.env.ref("pos_session.send_report", raise_if_not_found=False)
        if not action:
            action = self.env.ref("pos_session_report.send_report", raise_if_not_found=False)

        if not action:
            return {
                "message": _(
                    "Server action was not found. Expected xmlid: 'pos_session.send_report'."
                ),
            }

        result = action.with_context(
            active_model="pos.session",
            active_id=self.id,
            active_ids=[self.id],
        ).run()

        message = self._extract_report_message(result)
        return {
            "message": message or _("The report action did not return any text."),
        }

    @staticmethod
    def _extract_report_message(result):
        if isinstance(result, str):
            return result.strip()

        if isinstance(result, dict):
            for key in ("message", "text", "body", "report_text"):
                value = result.get(key)
                if isinstance(value, str) and value.strip():
                    return value.strip()
            return ""

        if result is None:
            return ""

        return str(result)
