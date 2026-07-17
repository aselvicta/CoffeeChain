from collections import defaultdict

from django.contrib.auth import get_user_model
from django.db.models import Count, Q
from django.utils import timezone

from supply_chain.models import (
    AuditLog,
    Branch,
    FertilizerBatch,
    Notification,
    Supplier,
    Transfer,
    WarehouseManager,
)

from .models import AdminRecommendation, ComplianceFlag


User = get_user_model()


def set_flag_status(flag, status, *, save=True, at=None):
    """Update flag status and the matching lifecycle timestamp."""
    now = at or timezone.now()
    flag.status = status

    extra = {"updated_at": now}
    if status == ComplianceFlag.Status.UNDER_REVIEW:
        # First time entering review; keep original if reopened then reviewed again.
        if not flag.reviewed_at:
            flag.reviewed_at = now
            extra["reviewed_at"] = now
    elif status == ComplianceFlag.Status.ESCALATED:
        if not flag.escalated_at:
            flag.escalated_at = now
            extra["escalated_at"] = now
        # Escalation implies review has started.
        if not flag.reviewed_at:
            flag.reviewed_at = now
            extra["reviewed_at"] = now
    elif status == ComplianceFlag.Status.RESOLVED:
        if not flag.resolved_at:
            flag.resolved_at = now
            extra["resolved_at"] = now
    elif status == ComplianceFlag.Status.OPEN:
        # Reopen clears resolution stamp so a later resolve gets a fresh time.
        if flag.resolved_at is not None:
            flag.resolved_at = None
            extra["resolved_at"] = None

    if save:
        ComplianceFlag.objects.filter(pk=flag.pk).update(status=status, **extra)
        refresh_fields = ["status", "updated_at", "reviewed_at", "escalated_at", "resolved_at"]
        flag.refresh_from_db(fields=refresh_fields)
    return flag


def sync_flag_status_with_recommendation(flag):
    """
    Keep flag.status aligned with its recommendation decision.
    Heals cases where admin actioned/dismissed but UI still showed escalated.
    """
    try:
        recommendation = flag.recommendation
    except AdminRecommendation.DoesNotExist:
        return flag
    except AttributeError:
        return flag

    if recommendation is None:
        return flag

    if recommendation.admin_decision in (
        AdminRecommendation.AdminDecision.ACTIONED,
        AdminRecommendation.AdminDecision.DISMISSED,
    ):
        if flag.status != ComplianceFlag.Status.RESOLVED:
            resolved_at = recommendation.decided_at or timezone.now()
            set_flag_status(flag, ComplianceFlag.Status.RESOLVED, at=resolved_at)
    elif recommendation.admin_decision == AdminRecommendation.AdminDecision.PENDING:
        if (
            recommendation.recommended_action != AdminRecommendation.RecommendedAction.NO_ACTION
            and flag.status != ComplianceFlag.Status.ESCALATED
        ):
            escalated_at = recommendation.created_at or timezone.now()
            set_flag_status(flag, ComplianceFlag.Status.ESCALATED, at=escalated_at)

    return flag


def get_user_organisation(user):
    supplier = Supplier.objects.filter(user=user).first()
    if supplier:
        return ("supplier", supplier.id, supplier.name)

    branch = Branch.objects.filter(user=user).first()
    if branch:
        return ("branch", branch.id, branch.name)

    manager = WarehouseManager.objects.select_related("supplier").filter(user=user).first()
    if manager and manager.supplier_id:
        return ("supplier", manager.supplier_id, manager.supplier.name)

    return (None, None, "")


def can_user_access_flag(user, flag):
    if not user or not user.is_authenticated:
        return False
    if user.is_staff:
        return True
    if user.groups.filter(name="Regulator").exists():
        return True

    org_type, org_id, _ = get_user_organisation(user)
    if org_type == "supplier" and flag.flagged_supplier_id:
        return flag.flagged_supplier_id == org_id
    if org_type == "branch" and flag.flagged_branch_id:
        return flag.flagged_branch_id == org_id
    return False


def resolve_target_summary(target_type, target_id):
    if target_type == ComplianceFlag.TargetType.TRANSFER:
        transfer = Transfer.objects.select_related("batch", "to_branch").filter(pk=target_id).first()
        if not transfer:
            return f"Transfer #{target_id}"
        branch_name = transfer.to_branch.name if transfer.to_branch else "Unknown branch"
        batch_code = transfer.batch.batch_code if transfer.batch else "Unknown batch"
        return f"Transfer #{transfer.id} - {batch_code} -> {branch_name}"

    if target_type == ComplianceFlag.TargetType.DISPATCH:
        transfer = Transfer.objects.select_related("batch", "to_branch").filter(pk=target_id).first()
        if not transfer:
            return f"Dispatch #{target_id}"
        branch_name = transfer.to_branch.name if transfer.to_branch else "Unknown branch"
        batch_code = transfer.batch.batch_code if transfer.batch else "Unknown batch"
        return f"Dispatch #{transfer.id} - {batch_code} -> {branch_name}"

    if target_type == ComplianceFlag.TargetType.BATCH:
        batch = FertilizerBatch.objects.select_related("supplier").filter(pk=target_id).first()
        if not batch:
            return f"Batch #{target_id}"
        supplier_name = batch.supplier.name if batch.supplier else "Unknown supplier"
        return f"Batch {batch.batch_code} - {supplier_name}"

    if target_type == ComplianceFlag.TargetType.USER_ACCOUNT:
        user = User.objects.filter(pk=target_id).first()
        if not user:
            return f"User #{target_id}"
        return f"User {user.username} (#{user.id})"

    return f"{target_type} #{target_id}"


def serialize_flagged_organisation(flag):
    if flag.flagged_supplier_id:
        return {
            "type": "supplier",
            "id": flag.flagged_supplier_id,
            "name": flag.flagged_supplier.name,
            "organisation_type": "Supplier",
        }
    if flag.flagged_branch_id:
        branch_type = (flag.flagged_branch.branch_type or "").title()
        return {
            "type": "branch",
            "id": flag.flagged_branch_id,
            "name": flag.flagged_branch.name,
            "organisation_type": branch_type,
        }
    return None


def _notify(users, title, message, metadata=None, priority=Notification.PRIORITY_MEDIUM):
    for user in users:
        if not user:
            continue
        Notification.objects.create(
            user=user,
            notification_type=Notification.TYPE_SYSTEM,
            title=title,
            message=message,
            priority=priority,
            metadata=metadata or {"tab": "compliance"},
        )


def _flagged_organisation_users(flag):
    users = []
    if flag.flagged_supplier_id and flag.flagged_supplier.user_id:
        users.append(flag.flagged_supplier.user)
        manager_users = User.objects.filter(
            warehouse_manager_profile__supplier_id=flag.flagged_supplier_id
        ).distinct()
        users.extend(list(manager_users))
    elif flag.flagged_branch_id and flag.flagged_branch.user_id:
        users.append(flag.flagged_branch.user)
    return list({u.id: u for u in users if u}.values())


def notify_flag_created(flag):
    org = serialize_flagged_organisation(flag) or {}
    org_name = org.get("name", "organisation")

    admin_users = User.objects.filter(is_staff=True)
    _notify(
        admin_users,
        title="New compliance flag",
        message=f"Flag #{flag.id} raised against {org_name}.",
        metadata={"tab": "compliance", "flag_id": flag.id},
        priority=Notification.PRIORITY_MEDIUM,
    )


def notify_flag_response(response):
    flag = response.flag
    _notify(
        [flag.raised_by],
        title="Compliance response received",
        message=f"Flag #{flag.id} has a new response from {response.responded_by.username}.",
        metadata={"tab": "compliance", "flag_id": flag.id},
    )


def notify_recommendation_submitted(recommendation):
    flag = recommendation.flag
    admins = User.objects.filter(is_staff=True)
    _notify(
        admins,
        title="Recommendation pending decision",
        message=f"Flag #{flag.id}: regulator recommends '{recommendation.recommended_action}'.",
        metadata={"tab": "compliance", "recommendation_id": recommendation.id},
        priority=Notification.PRIORITY_HIGH,
    )


def notify_admin_decision(recommendation):
    flag = recommendation.flag
    decision = recommendation.get_admin_decision_display().lower()
    _notify(
        [flag.raised_by],
        title="Compliance decision recorded",
        message=f"Admin {decision} recommendation for flag #{flag.id}.",
        metadata={"tab": "compliance", "recommendation_id": recommendation.id, "flag_id": flag.id},
        priority=Notification.PRIORITY_MEDIUM,
    )


def apply_suspend_action_for_flag(flag, decided_by):
    updated_users = []
    if flag.target_type == ComplianceFlag.TargetType.USER_ACCOUNT:
        user = User.objects.filter(pk=flag.target_id).first()
        if user and user.is_active:
            user.is_active = False
            user.save(update_fields=["is_active"])
            updated_users.append(user)

    for user in _flagged_organisation_users(flag):
        if user.is_active:
            user.is_active = False
            user.save(update_fields=["is_active"])
            updated_users.append(user)

    for user in {u.id: u for u in updated_users}.values():
        AuditLog.objects.create(
            action="user_deactivated",
            user=decided_by,
            details={
                "target_user": user.username,
                "source": "compliance_recommendation",
                "flag_id": flag.id,
            },
        )


def compute_compliance_snapshot(*, supplier=None, branch=None):
    qs = ComplianceFlag.objects.all()
    if supplier is not None:
        qs = qs.filter(flagged_supplier=supplier)
    if branch is not None:
        qs = qs.filter(flagged_branch=branch)

    open_flags = qs.filter(status__in=[ComplianceFlag.Status.OPEN, ComplianceFlag.Status.UNDER_REVIEW]).count()
    escalated_flags = qs.filter(status=ComplianceFlag.Status.ESCALATED).count()

    if escalated_flags > 0:
        status_value = "flagged"
    elif open_flags > 0:
        status_value = "under_review"
    else:
        status_value = "good_standing"

    return {
        "status": status_value,
        "open_flags": open_flags,
        "escalated_flags": escalated_flags,
    }


def bulk_compliance_snapshots():
    supplier_rows = (
        ComplianceFlag.objects.filter(flagged_supplier__isnull=False)
        .values("flagged_supplier")
        .annotate(
            open_flags=Count(
                "id",
                filter=Q(status__in=[ComplianceFlag.Status.OPEN, ComplianceFlag.Status.UNDER_REVIEW]),
            ),
            escalated_flags=Count("id", filter=Q(status=ComplianceFlag.Status.ESCALATED)),
        )
    )
    branch_rows = (
        ComplianceFlag.objects.filter(flagged_branch__isnull=False)
        .values("flagged_branch")
        .annotate(
            open_flags=Count(
                "id",
                filter=Q(status__in=[ComplianceFlag.Status.OPEN, ComplianceFlag.Status.UNDER_REVIEW]),
            ),
            escalated_flags=Count("id", filter=Q(status=ComplianceFlag.Status.ESCALATED)),
        )
    )

    supplier_map = defaultdict(lambda: {"status": "good_standing", "open_flags": 0, "escalated_flags": 0})
    branch_map = defaultdict(lambda: {"status": "good_standing", "open_flags": 0, "escalated_flags": 0})

    for row in supplier_rows:
        supplier_id = row["flagged_supplier"]
        open_flags = row["open_flags"]
        escalated_flags = row["escalated_flags"]
        status_value = "flagged" if escalated_flags > 0 else ("under_review" if open_flags > 0 else "good_standing")
        supplier_map[supplier_id] = {
            "status": status_value,
            "open_flags": open_flags,
            "escalated_flags": escalated_flags,
        }

    for row in branch_rows:
        branch_id = row["flagged_branch"]
        open_flags = row["open_flags"]
        escalated_flags = row["escalated_flags"]
        status_value = "flagged" if escalated_flags > 0 else ("under_review" if open_flags > 0 else "good_standing")
        branch_map[branch_id] = {
            "status": status_value,
            "open_flags": open_flags,
            "escalated_flags": escalated_flags,
        }

    return {
        "supplier": supplier_map,
        "branch": branch_map,
    }


def organisation_has_active_certificate(*, supplier=None, branch=None) -> bool:
    from .models import OrganisationCertificate

    today = timezone.now().date()
    qs = OrganisationCertificate.objects.filter(
        status=OrganisationCertificate.Status.VERIFIED,
        is_active=True,
        expires_on__gte=today,
    )
    if supplier is not None:
        qs = qs.filter(supplier=supplier)
    elif branch is not None:
        qs = qs.filter(branch=branch)
    else:
        return False
    return qs.exists()


def require_active_certificate(*, supplier=None, branch=None):
    """Raise DRF ValidationError if the organisation lacks a verified, non-expired certificate."""
    from rest_framework.exceptions import ValidationError

    if organisation_has_active_certificate(supplier=supplier, branch=branch):
        return
    raise ValidationError(
        {
            "detail": (
                "Organisation licence/certificate is missing, expired, or not yet verified by a regulator. "
                "Upload your document under Compliance and wait for verification before continuing."
            )
        }
    )


def expire_due_certificates():
    from .models import OrganisationCertificate

    today = timezone.now().date()
    qs = OrganisationCertificate.objects.filter(
        status=OrganisationCertificate.Status.VERIFIED,
        is_active=True,
        expires_on__lt=today,
    )
    count = 0
    for cert in qs:
        cert.status = OrganisationCertificate.Status.EXPIRED
        cert.is_active = False
        cert.save(update_fields=["status", "is_active", "updated_at"])
        count += 1
        _notify_certificate_expired(cert)
    return count


def certificates_due_for_renewal(within_days=30):
    from datetime import timedelta

    from .models import OrganisationCertificate

    today = timezone.now().date()
    cutoff = today + timedelta(days=within_days)
    return OrganisationCertificate.objects.filter(
        status=OrganisationCertificate.Status.VERIFIED,
        is_active=True,
        expires_on__gte=today,
        expires_on__lte=cutoff,
    ).select_related("supplier", "branch", "uploaded_by", "reviewed_by")


def serialize_certificate_organisation(cert):
    if cert.supplier_id:
        return {
            "type": "supplier",
            "id": cert.supplier_id,
            "name": cert.supplier.name,
            "organisation_type": "Supplier",
        }
    if cert.branch_id:
        return {
            "type": "branch",
            "id": cert.branch_id,
            "name": cert.branch.name,
            "organisation_type": (cert.branch.branch_type or "").title(),
        }
    return None


def _certificate_org_users(cert):
    users = []
    if cert.supplier_id and cert.supplier.user_id:
        users.append(cert.supplier.user)
        users.extend(
            list(
                User.objects.filter(warehouse_manager_profile__supplier_id=cert.supplier_id).distinct()
            )
        )
    elif cert.branch_id and cert.branch.user_id:
        users.append(cert.branch.user)
    return list({u.id: u for u in users if u}.values())


def notify_certificate_uploaded(cert):
    org = serialize_certificate_organisation(cert) or {}
    regulators = User.objects.filter(groups__name="Regulator")
    _notify(
        regulators,
        title="Certificate pending review",
        message=f"{org.get('name', 'An organisation')} uploaded a {cert.get_document_type_display()} for verification.",
        metadata={"tab": "compliance", "certificate_id": cert.id, "section": "certificates"},
        priority=Notification.PRIORITY_HIGH,
    )


def notify_certificate_reviewed(cert):
    recipients = _certificate_org_users(cert)
    status_label = cert.get_status_display().lower()
    _notify(
        recipients,
        title=f"Certificate {status_label}",
        message=(
            f"Your {cert.get_document_type_display()} was {status_label}."
            + (f" Note: {cert.review_note}" if cert.review_note else "")
        ),
        metadata={"tab": "compliance", "certificate_id": cert.id, "section": "certificates"},
        priority=Notification.PRIORITY_HIGH,
    )


def _notify_certificate_expired(cert):
    recipients = _certificate_org_users(cert)
    org = serialize_certificate_organisation(cert) or {}
    _notify(
        recipients,
        title="Certificate expired",
        message=f"Your {cert.get_document_type_display()} for {org.get('name', 'your organisation')} has expired. Please upload a renewed document.",
        metadata={"tab": "compliance", "certificate_id": cert.id, "section": "certificates"},
        priority=Notification.PRIORITY_HIGH,
    )
    regulators = User.objects.filter(groups__name="Regulator")
    _notify(
        regulators,
        title="Organisation certificate expired",
        message=f"{org.get('name', 'An organisation')} certificate expired on {cert.expires_on}.",
        metadata={"tab": "compliance", "certificate_id": cert.id, "section": "certificates"},
        priority=Notification.PRIORITY_MEDIUM,
    )
