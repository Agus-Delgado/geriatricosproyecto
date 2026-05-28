# Export all route modules for easy importing
from . import admin
from . import auth
from . import attendance
from . import certificates
from . import clinical
from . import dashboard
from . import documents
from . import external_platforms
from . import facilities
from . import finance
from . import medications
from . import prescriptions
from . import agenda
from . import resident_contacts
from . import resident_external_events
from . import residents
from . import staff
from . import activity
from . import push
from . import support

__all__ = [
    "admin",
    "auth",
    "attendance",
    "certificates",
    "clinical",
    "dashboard",
    "documents",
    "external_platforms",
    "facilities",
    "finance",
    "medications",
    "prescriptions",
    "agenda",
    "resident_contacts",
    "resident_external_events",
    "residents",
    "staff",
    "activity",
    "push",
    "support",
]
