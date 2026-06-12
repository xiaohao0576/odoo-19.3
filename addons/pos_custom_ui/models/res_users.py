from odoo import api, models


class ResUsers(models.Model):
    _inherit = "res.users"

    @api.model
    def _load_pos_data_fields(self, config):
        fields_list = super()._load_pos_data_fields(config)
        if "tz" not in fields_list:
            fields_list.append("tz")
        return fields_list
