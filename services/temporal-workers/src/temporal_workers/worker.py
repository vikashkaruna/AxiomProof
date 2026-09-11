"""Temporal worker entry point.

The worker registers the workflow and activity implementations
with the Temporal cluster (Cloud, ap-south-1). Multiple workers can
be deployed for HA; Temporal handles distribution.
"""

from __future__ import annotations

import asyncio
import logging
import os

from temporalio.client import Client
from temporalio.worker import Worker

from .workflows import ComplianceEngagementWorkflow, call_agent_runtime, persist_finding, wait_for_human_approval


async def main():
    address = os.environ.get("TEMPORAL_ADDRESS", "ap-south-1.aws.api.temporal.io:7233")
    namespace = os.environ.get("TEMPORAL_NAMESPACE", "axiom-proof")
    api_key = os.environ.get("TEMPORAL_API_KEY")
    tls = os.environ.get("TEMPORAL_TLS", "true").lower() == "true"

    if not api_key and ("temporal.io" in address or tls):
        raise RuntimeError("TEMPORAL_API_KEY is required for Temporal Cloud connections")

    client = await Client.connect(
        address,
        namespace=namespace,
        api_key=api_key if api_key else None,
        tls=tls,
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
