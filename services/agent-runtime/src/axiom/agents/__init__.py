"""Agent implementations for Axiom Proof.

10 named agents:
  - Drishti   (Discovery)
  - Vibhaag   (Classification)
  - Parikshan (Assessment)
  - Saakshi   (Evidence)
  - Sudhaar   (Remediation Planning)
  - Karya     (Execution) — Phase 3, stub here
  - Lekha     (Audit & Traceability)
  - Nazar     (Regulatory Watch)
  - Prativedan (Reporting)
  - Sanket    (Market Signal — internal GTM)
"""

from .parikshan import ParikshanAgent
from .prativedan import PrativedanAgent
from .drishti import DrishtiAgent
from .vibhaag import VibhaagAgent
from .saakshi import SaakshiAgent
from .sudhaar import SudhaarAgent
from .lekha import LekhaAgent
from .nazar import NazarAgent
from .sanket import SanketAgent
from .karya import KaryaAgent

__all__ = [
    "ParikshanAgent",
    "PrativedanAgent",
    "DrishtiAgent",
    "VibhaagAgent",
    "SaakshiAgent",
    "SudhaarAgent",
    "LekhaAgent",
    "NazarAgent",
    "SanketAgent",
    "KaryaAgent",
]
