from django.contrib import admin

from .models import (
    AuditLog,
    BlockchainAnchor,
    Branch,
    DeliveryProof,
    Farmer,
    FertilizerBatch,
    Issue,
    OTPVerification,
    Supplier,
    Transfer,
)


admin.site.register(Supplier)
admin.site.register(Branch)
admin.site.register(Farmer)
admin.site.register(FertilizerBatch)
admin.site.register(Issue)
admin.site.register(Transfer)
admin.site.register(DeliveryProof)
admin.site.register(OTPVerification)
admin.site.register(BlockchainAnchor)
admin.site.register(AuditLog)
