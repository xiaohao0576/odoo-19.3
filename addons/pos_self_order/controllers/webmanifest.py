# Part of Odoo. See LICENSE file for full copyright and licensing details.

import json
import mimetypes
import re

from urllib.parse import unquote
from odoo import http
from odoo.http import request
from odoo.addons.web.controllers import webmanifest
from odoo.tools import file_open
from odoo.tools import consteq


class WebManifest(webmanifest.WebManifest):
    def _get_scoped_app_name(self, app_id):
        if app_id == "pos_self_order":
            if match := re.findall(r'pos-self/(\d+)', unquote(request.params['path'])):
                if record := request.env['pos.config'].search([('id', '=', match[0])]):
                    return record.name
        return super()._get_scoped_app_name(app_id)

    def _get_scoped_app_icons(self, app_id):
        if app_id == "pos_self_order":
            company = request.env.company
            if company.uses_default_logo:
                icon_src = '/point_of_sale/static/description/icon.svg'
            else:
                icon_src = f'/web/image?model=res.company&id={company.id}&field=logo&height=192&width=192'
            return [{
                'src': icon_src,
                'sizes': 'any',
                'type': mimetypes.guess_type(icon_src)[0] or 'image/png'
            }]
        return super()._get_scoped_app_icons(app_id)

    @http.route()
    def scoped_app_icon_png(self, app_id):
        if app_id == "pos_self_order" and request.env.company.uses_default_logo:
            return super().scoped_app_icon_png('point_of_sale')
        return super().scoped_app_icon_png(app_id)

    @http.route('/pos-self/service-worker.js', type='http', auth='public', methods=['GET'], readonly=True)
    def service_worker(self):
        """Returns the Service Worker for POS Self Order PWA"""
        with file_open('pos_self_order/static/src/service_worker.js') as f:
            body = f.read()
        return request.make_response(body, [
            ('Content-Type', 'text/javascript'),
            ('Service-Worker-Allowed', '/pos-self/'),
        ])

    @http.route('/pos-self/manifest.json', type='http', auth='public', methods=['GET'], readonly=True)
    def manifest(self):
        """Returns the manifest for POS Self Order PWA"""
        config_id = None
        access_token = None
        x_device_type = None

        try:
            access_token = request.params.get('access_token')
            x_device_type = request.params.get('x_device_type')

            if 'path' in request.params:
                match = re.findall(r'pos-self/(\d+)', unquote(request.params['path']))
                if match:
                    config_id = int(match[0])

            is_valid = False
            if config_id and access_token and x_device_type == 'tablet':
                pos_config = request.env['pos.config'].sudo().search([('id', '=', config_id)], limit=1)
                if pos_config and consteq(pos_config.access_token or '', access_token):
                    is_valid = True

            if is_valid:
                start_url = f"/pos-self/{config_id}?access_token={access_token}&x_device_type={x_device_type}"
                manifest_data = {
                    "name": "Odoo POS Self Order for Tablet",
                    "short_name": "Odoo",
                    "description": "Select your table to start ordering",
                    "id": f"/pos-self/{config_id}/",
                    "start_url": start_url,
                    "scope": "/pos-self",
                    "display": "fullscreen",
                    "background_color": "#ffffff",
                    "theme_color": "#3498db",
                    "orientation": "any",
                    "icons": [
                        {
                            "src": "https://raw.githubusercontent.com/xiaohao0576/blog/master/images/restaurnat-icon.png",
                            "sizes": "192x192",
                            "type": "image/png",
                            "purpose": "any maskable"
                        },
                        {
                            "src": "https://raw.githubusercontent.com/xiaohao0576/blog/master/images/restaurnat-icon.png",
                            "sizes": "512x512",
                            "type": "image/png",
                            "purpose": "any maskable"
                        }
                    ]
                }
            else:
                manifest_data = {}

            body = json.dumps(manifest_data)
            return request.make_response(body, [
                ('Content-Type', 'application/manifest+json'),
            ])
        except Exception:
            return request.make_response(json.dumps({}), [
                ('Content-Type', 'application/manifest+json'),
            ])
