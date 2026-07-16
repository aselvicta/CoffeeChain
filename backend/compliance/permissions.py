from supply_chain.permissions import has_group


def is_regulator(user):
    return bool(user and user.is_authenticated and has_group(user, "Regulator"))


def is_admin(user):
    return bool(user and user.is_authenticated and user.is_staff)
