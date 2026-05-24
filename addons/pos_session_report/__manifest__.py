{
    "name": "POS Session Report",
    "summary": "Show session report text in POS dialog",
    "category": "Sales/Point of Sale",
    "version": "1.0",
    "depends": ["point_of_sale"],
    "data": [
        "data/pos_session_report_data.xml",
    ],
    "assets": {
        "point_of_sale._assets_pos": [
            "pos_session_report/static/src/**/*",
        ],
    },
    "license": "LGPL-3",
    "installable": True,
}
