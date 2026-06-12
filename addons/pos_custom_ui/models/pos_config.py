from odoo import api, models


class PosConfig(models.Model):
    _inherit = "pos.config"

    @api.model
    def _load_pos_data_read(self, records, config):
        read_records = super()._load_pos_data_read(records, config)
        if read_records:
            expiration_date = (
                self.env["ir.config_parameter"]
                .sudo()
                .get_str("database.expiration_date", default=False)
            )
            read_records[0]["_expiration_date"] = expiration_date or False
        return read_records
