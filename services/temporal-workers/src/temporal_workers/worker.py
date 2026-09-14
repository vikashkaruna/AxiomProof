"""Temporal worker entry point.

The worker registers the workflow and activity implementations
with the Temporal cluster (Cloud, ap-south-1). Multiple workers can
be deployed for HA; Temporal handles distribution.
"""

from __future__ import annotations

import asyncio
import logging
import os
from typing import Any

from temporalio.client import Client
from temporalio.worker import Worker

from .workflows import ComplianceEngagementWorkflow, call_agent_runtime, persist_finding, wait_for_human_approval


async def main():
    address = os.environ.get("TEMPORAL_ADDRESS", "ap-south-1.aws.api.temporal.io:7233")
    namespace = os.environ.get("TEMPORAL_NAMESPACE", "axiom-proof")
    api_key = os.environ.get("TEMPORAL_API_KEY")
    tls_enabled = os.environ.get("TEMPORAL_TLS", "true").lower() == "true"
    client_cert = os.environ.get("TEMPORAL_CLIENT_CERT")
    client_key = os.environ.get("TEMPORAL_CLIENT_KEY")
    cert_path = os.environ.get("TEMPORAL_CERT_PATH")
    key_path = os.environ.get("TEMPORAL_KEY_PATH")

    tls_config: bool | Any = tls_enabled
    if client_cert and client_key:
        from temporalio.service import TLSConfig
        tls_config = TLSConfig(
            client_cert=client_cert.encode("utf-8") if isinstance(client_cert, str) else client_cert,
            client_private_key=client_key.encode("utf-8") if isinstance(client_key, str) else client_key,
        )
    elif cert_path and key_path and os.path.exists(cert_path) and os.path.exists(key_path):
        from temporalio.service import TLSConfig
        with open(cert_path, "rb") as f:
            cert_bytes = f.read()
        with open(key_path, "rb") as f:
            key_bytes = f.read()
        tls_config = TLSConfig(client_cert=cert_bytes, client_private_key=key_bytes)

    if not api_key and not client_cert and not cert_path and ("temporal.io" in address or "tmprl.cloud" in address):
        logging.warning("No TEMPORAL_API_KEY or mTLS certs provided; proceeding with TLS enabled.")

    client = await Client.connect(
        address,
        namespace=namespace,
        api_key=api_key if api_key else None,
        tls=tls_config,
    )

    worker = Worker(
        client,
        task_queue="axiom-compliance",
        workflows=[ComplianceEngagementWorkflow],
        activities=[call_agent_runtime, persist_finding, wait_for_human_approval],
    )

    logging.basicConfig(level=logging.INFO)
    logging.info(f"temporal_worker.starting address={address} namespace={namespace}")
    await worker.run()


if __name__ == "__main__":
    asyncio.run(main())
