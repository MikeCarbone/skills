#!/usr/bin/env python3
"""Poll GitHub PRs for a stack-tracker canvas snapshot.

Usage:
  python3 poll-pr-stack.py --owner my-org --repo my-repo 101 102 103

Prints JSON:
  { "at": ISO8601, "prs": { "pr1": { branch, unresolved, resolved, ... }, ... } }
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from datetime import datetime, timezone


def gh_json(args: list[str]):
    out = subprocess.check_output(["gh", *args], text=True)
    return json.loads(out)


def rollup_status(checks: list[dict]) -> tuple[str, str]:
    if not checks:
        return "none", "No checks"

    failing = 0
    running = 0

    for check in checks:
        status = check.get("status") or ""
        conclusion = (check.get("conclusion") or check.get("state") or "").upper()
        if status in ("IN_PROGRESS", "QUEUED", "PENDING") or conclusion == "PENDING":
            running += 1
            continue
        if conclusion in (
            "FAILURE",
            "ERROR",
            "CANCELLED",
            "TIMED_OUT",
            "ACTION_REQUIRED",
        ):
            failing += 1

    if failing:
        return "failure", f"{failing} failing"
    if running:
        return "running", f"{running} running"
    return "success", "Passing"


def review_state(is_draft: bool, decision: str | None) -> tuple[str, str]:
    if is_draft:
        return "draft", "Draft"
    if decision == "APPROVED":
        return "approved", "Approved"
    if decision == "CHANGES_REQUESTED":
        return "changes_requested", "Changes requested"
    return "not_approved", "Not approved"


def poll_pr(owner: str, repo: str, number: int) -> dict:
    pr = gh_json(
        [
            "pr",
            "view",
            str(number),
            "--repo",
            f"{owner}/{repo}",
            "--json",
            "number,isDraft,reviewDecision,statusCheckRollup,url,headRefName",
        ]
    )

    gql = gh_json(
        [
            "api",
            "graphql",
            "-f",
            f"query=\nquery($owner:String!,$repo:String!,$number:Int!) {{\n"
            f"  repository(owner:$owner,name:$repo) {{\n"
            f"    pullRequest(number:$number) {{\n"
            f"      reviewThreads(first:100) {{ nodes {{ isResolved }} }}\n"
            f"    }}\n"
            f"  }}\n"
            f"}}",
            "-f",
            f"owner={owner}",
            "-f",
            f"repo={repo}",
            "-F",
            f"number={number}",
        ]
    )

    threads = gql["data"]["repository"]["pullRequest"]["reviewThreads"]["nodes"]
    unresolved = sum(1 for thread in threads if not thread["isResolved"])
    resolved = sum(1 for thread in threads if thread["isResolved"])
    ci, ci_label = rollup_status(pr.get("statusCheckRollup") or [])
    state, state_label = review_state(pr["isDraft"], pr.get("reviewDecision") or "")

    return {
        "branch": pr["headRefName"],
        "unresolved": unresolved,
        "resolved": resolved,
        "readyForReview": not pr["isDraft"],
        "reviewState": state,
        "reviewStateLabel": state_label,
        "ci": ci,
        "ciLabel": ci_label,
        "url": pr["url"],
        "number": number,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("numbers", nargs="+", type=int, help="PR numbers in stack order")
    parser.add_argument("--owner", required=True, help="GitHub org or user")
    parser.add_argument("--repo", required=True, help="Repository name")
    args = parser.parse_args()

    prs = {}
    for index, number in enumerate(args.numbers, start=1):
        prs[f"pr{index}"] = poll_pr(args.owner, args.repo, number)

    payload = {
        "at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "prs": prs,
    }
    json.dump(payload, sys.stdout, indent=2)
    print()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
