from django.apps import AppConfig


class SupplyChainConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "supply_chain"

    def ready(self):
        import supply_chain.signals  # noqa: F401

        from supply_chain.services.integrity_watcher import start_integrity_watcher

        start_integrity_watcher()
