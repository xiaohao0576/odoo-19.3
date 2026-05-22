# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

import uuid
from typing import Dict, Callable, List, Optional

from odoo import api, fields, models


class RestaurantTable(models.Model):
    _inherit = "restaurant.table"

    identifier = fields.Char(
        "Security Token",
        copy=False,
        required=True,
        default=lambda self: self._get_identifier(),
    )

    # 针对中国餐厅的特殊需求，添加了一个字段来存储桌位名称，比如“西湖厅”，“长安厅”等中国餐厅常用的命名方式。这对于餐厅管理和顾客识别非常有帮助。
    table_name = fields.Char(
        "Table Name",
        store=True,
    )

    @api.model_create_multi
    def create(self, vals_list):
        for vals in vals_list:
            if not vals.get('table_name') and vals.get('table_number') is not None:
                vals['table_name'] = str(vals['table_number'])
        return super().create(vals_list)

    def write(self, vals):
        has_table_name = 'table_name' in vals
        has_table_number = 'table_number' in vals
        has_effective_table_name = bool(vals.get('table_name')) if has_table_name else False

        result = super().write(vals)

        if has_table_number and (not has_table_name or not has_effective_table_name):
            empty_names = self.filtered(lambda table: not table.table_name)
            for table in empty_names:
                table.table_name = str(table.table_number)

        return result

    @staticmethod
    def _get_identifier():
        return uuid.uuid4().hex[:8]

    @api.model
    def _update_identifier(self):
        tables = self.env["restaurant.table"].search([])
        for table in tables:
            table.identifier = self._get_identifier()

    @api.model
    def _load_pos_self_data_fields(self, config):
        return ['table_number', 'identifier', 'floor_id', 'table_name']

    @api.model
    def _load_pos_self_data_domain(self, data, config):
        return [('floor_id', 'in', [floor['id'] for floor in data['restaurant.floor']])]


class RestaurantFloor(models.Model):
    _inherit = "restaurant.floor"

    @api.model
    def _load_pos_self_data_fields(self, config):
        return ['name', 'table_ids']

    @api.model
    def _load_pos_self_data_domain(self, data, config):
        return [('id', 'in', config.floor_ids.ids)]
