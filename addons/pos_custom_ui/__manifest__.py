{
    "name": "POS Custom UI",
    "summary": "Show product name with sale price on POS product cards",
    "version": "1.0",
    "category": "Sales/Point of Sale",
    "license": "LGPL-3",
    "depends": ["point_of_sale", "pos_restaurant"],
    "assets": {
        "point_of_sale._assets_pos": [
            "pos_custom_ui/static/src/**/*",
        ],
    },
    "installable": True,
    "application": False,
}
