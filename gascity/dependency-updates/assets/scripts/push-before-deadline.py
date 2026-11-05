import datetime
import fcntl
import hashlib
import json
import os
from pathlib import Path
import re
import stat
import subprocess
import sys
import time


GIT = "/usr/bin/git"
GC = "/opt/homebrew/bin/gc"
ORIGIN = "git@github.com:benschac/digitial-garden.git"
PUBLIC_ORIGIN = "https://github.com/benschac/digitial-garden.git"
LOCK_FD = 9
SOURCE_KIND = "reviewed-source-integration"
PUBLISHERS = ("personal-site/deps.publisher", "personal-site/skills.publisher")
FIELDS = {"schema_version", "purpose", "bead_id", "owner", "session_id", "claim_utc", "deadline_utc", "budget_seconds", "push_limit", "base", "commit", "tree", "checkout", "guard_sha256", "git_sha256", "gc_sha256", "qualification_evidence_path", "qualification_evidence_sha256"}

SOURCE_FIELDS = FIELDS | {"authority_kind", "reviewed_source_authority", "source_root", "source_handoff_path", "source_handoff_sha256", "allowed_paths"}
SOURCE_BINDINGS = ("bead_id", "owner", "session_id", "claim_utc", "deadline_utc", "base", "commit", "tree", "checkout", "source_root", "allowed_paths", "qualification_evidence_path", "qualification_evidence_sha256")


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def timestamp(value):
    parsed = datetime.datetime.fromisoformat(value)
    if parsed.utcoffset() != datetime.timedelta(0):
        raise ValueError("Publication timestamps must be explicit UTC")
    return parsed.timestamp()


def require_time(cutoff, monotonic_cutoff):
    if time.time() >= cutoff or time.monotonic() >= monotonic_cutoff:
        raise TimeoutError("Original publication deadline reached; zero push admission")


def checked(argv, cutoff, monotonic_cutoff):
    require_time(cutoff, monotonic_cutoff)
    budget = min(5, cutoff - time.time(), monotonic_cutoff - time.monotonic())
    if budget <= 0:
        raise TimeoutError("No publication preflight time remains")
    return subprocess.check_output(argv, timeout=budget, stderr=subprocess.PIPE).decode().strip()


def inherited_lock(city):
    path = city / ".gc/dependency-updates/verify.lock"
    actual = os.fstat(LOCK_FD)
    expected = path.stat()
    if not stat.S_ISREG(actual.st_mode) or (actual.st_dev, actual.st_ino) != (expected.st_dev, expected.st_ino) or not os.get_inheritable(LOCK_FD):
        raise RuntimeError("Inherited foreground FD9 is not the existing verification lock")
    fcntl.flock(LOCK_FD, fcntl.LOCK_EX | fcntl.LOCK_NB)
    with path.open("a") as contender:
        try:
            fcntl.flock(contender, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            return
        raise RuntimeError("Kernel verification lock is not exclusive")


def native_owner(record, record_path, digest, cutoff, monotonic_cutoff):
    city = os.environ["GC_CITY"]
    prefix = [GC, "--city", city]
    bead = json.loads(checked([*prefix, "--rig", "personal-site", "bd", "show", record["bead_id"], "--json"], cutoff, monotonic_cutoff))
    bead = bead[0] if isinstance(bead, list) else bead
    metadata = bead.get("metadata", {})
    if bead.get("id") != record["bead_id"] or bead.get("status") != "in_progress" or bead.get("assignee") != record["owner"] or metadata.get("gc.session_id") != record["session_id"]:
        raise RuntimeError("Actual singleton publisher claim changed")
    if metadata.get("dependency_publication_record_sha256") != digest or metadata.get("dependency_publication_record_path") != str(record_path) or metadata.get("dependency_publication_claim_utc") != record["claim_utc"] or metadata.get("dependency_publication_deadline_utc") != record["deadline_utc"]:
        raise RuntimeError("Native publication authority hash or original clock changed")
    lease = timestamp(bead["lease_expires_at"])
    if lease <= time.time():
        raise RuntimeError("Native publication lease expired")
    durable = json.loads(checked([*prefix, "bd", "show", record["session_id"], "--json"], cutoff, monotonic_cutoff))
    durable = durable[0] if isinstance(durable, list) else durable
    fields = durable.get("metadata", {})
    if durable.get("id") != record["session_id"] or durable.get("status") != "open" or fields.get("state") not in ("awake", "active") or fields.get("agent_name") != record["owner"] or fields.get("current_claim_bead_id") != record["bead_id"]:
        raise RuntimeError("Durable publisher current claim changed")
    if checked([*prefix, "hook", "current", "--id-only"], cutoff, monotonic_cutoff) != record["bead_id"]:
        raise RuntimeError("Actual calling publisher hook changed")
    sessions = json.loads(checked([*prefix, "session", "list", "--json"], cutoff, monotonic_cutoff))["sessions"]
    owners = [row for row in sessions if row.get("agent_name") == record["owner"] and row.get("state") == "active"]
    if len(owners) != 1 or owners[0]["id"] != record["session_id"] or lease <= time.time():
        raise RuntimeError("Singleton publisher identity or lease changed")
    if record.get("authority_kind") == SOURCE_KIND:
        anchors = {"dependency_publication_authority_kind": SOURCE_KIND, "dependency_source_integration_owner": record["owner"], "dependency_source_integration_session_id": record["session_id"], "dependency_source_integration_root": record["source_root"], "dependency_source_integration_handoff_sha256": record["source_handoff_sha256"]}
        if any(metadata.get(key) != value for key, value in anchors.items()):
            raise RuntimeError("Native Main source-integration approval anchors missing or changed")
        if any(row.get("state") == "active" and any(row.get(key) in PUBLISHERS for key in ("agent_name", "template", "name", "alias")) for row in sessions):
            raise RuntimeError("Ordinary publisher is active during source integration")
        queue = json.loads(checked([*prefix, "--rig", "personal-site", "bd", "list", "--all", "--limit", "0", "--json"], cutoff, monotonic_cutoff))
        if not isinstance(queue, list):
            raise RuntimeError("Full publication queue proof is unavailable")
        for row in queue:
            fields = row.get("metadata", {})
            if row.get("status") == "in_progress" and (row.get("assignee") in PUBLISHERS or fields.get("gc.routed_to") in PUBLISHERS or (row.get("id") != record["bead_id"] and fields.get("dependency_publication_authority_kind") == SOURCE_KIND)):
                raise RuntimeError("Another publication owner is active")
        for publisher in PUBLISHERS:
            if json.loads(checked([*prefix, "ready", "--metadata-field", "gc.routed_to=" + publisher, "--json"], cutoff, monotonic_cutoff)) != []:
                raise RuntimeError("Ordinary publisher frontier is not quiescent")
    return lease, time.monotonic() + lease - time.time()


def publish(record_path, approved_sha256):
    raw = record_path.read_bytes()
    digest = hashlib.sha256(raw).hexdigest()
    if not re.fullmatch("[0-9a-f]{64}", approved_sha256) or digest != approved_sha256:
        raise RuntimeError("Approved publication record hash mismatch")
    record = json.loads(raw)
    source = record.get("purpose") == "timed-reviewed-source-integration"
    if set(record) != (SOURCE_FIELDS if source else FIELDS) or type(record["schema_version"]) is not int or record["schema_version"] != 1 or type(record["push_limit"]) is not int or record["push_limit"] != 1:
        raise RuntimeError("Missing or broader publication authority")
    if source:
        if record["authority_kind"] != SOURCE_KIND or record["reviewed_source_authority"] is not True or not isinstance(record["owner"], str) or not record["owner"].strip() or record["owner"] in PUBLISHERS:
            raise RuntimeError("Explicit reviewed source authority or designated source owner is missing")
    elif record["purpose"] != "timed-dependency-publication" or record["owner"] != "personal-site/deps.publisher":
        raise RuntimeError("Missing or broader publication authority")
    if type(record["budget_seconds"]) is not int or not 0 < record["budget_seconds"] <= 2700:
        raise RuntimeError("Invalid finite publication budget")
    claimed, cutoff = timestamp(record["claim_utc"]), timestamp(record["deadline_utc"])
    start_monotonic = time.monotonic()
    start_wall = time.time()
    monotonic_cutoff = start_monotonic + min(cutoff - start_wall, record["budget_seconds"])
    if not claimed <= start_wall < cutoff <= claimed + record["budget_seconds"]:
        raise TimeoutError("Original publication deadline reached or invalid claim clock")
    require_time(cutoff, monotonic_cutoff)
    city = Path(os.environ["GC_CITY"])
    root = city / ".gc/dependency-updates" / record["bead_id"]
    if source:
        root = Path(record["source_root"])
        namespace = city / ".gc/dependency-remediation"
        if not root.is_absolute() or root.resolve() != root or root == namespace or not root.is_relative_to(namespace):
            raise RuntimeError("Source integration root is outside the approved remediation namespace")
        handoff = Path(record["source_handoff_path"])
        if handoff.resolve() != handoff or not handoff.is_relative_to(root) or sha(handoff) != record["source_handoff_sha256"]:
            raise RuntimeError("Reviewed source handoff path or digest changed")
        approved = json.loads(handoff.read_text())
        expected = {key: record[key] for key in SOURCE_BINDINGS}
        expected.update(authority_kind=SOURCE_KIND, approved=True)
        if approved != expected or approved.get("approved") is not True:
            raise RuntimeError("Positive reviewed source handoff does not bind this exact publication")
        paths = record["allowed_paths"]
        if not isinstance(paths, list) or not paths or any(not isinstance(name, str) or not name or Path(name).is_absolute() or Path(name).as_posix() != name or ".." in Path(name).parts or Path(name).parts[0] == ".git" for name in paths) or len(paths) != len(set(paths)):
            raise RuntimeError("Reviewed source scope is invalid")
    if not re.fullmatch("ps-[a-z0-9]+", record["bead_id"]) or not city.is_absolute() or city.resolve() != city or record_path.resolve() != record_path or not record_path.is_relative_to(root):
        raise RuntimeError("Publication record escapes its canonical bead directory")
    checkout = Path(record["checkout"])
    if not checkout.is_absolute() or checkout.resolve() != checkout or not checkout.is_relative_to(root) or os.environ.get("GC_SESSION_ID") != record["session_id"]:
        raise RuntimeError("Publication checkout or calling session mismatch")
    if any(key.startswith("GIT_") and key not in ("GIT_OPTIONAL_LOCKS", "GIT_TERMINAL_PROMPT") for key in os.environ):
        raise RuntimeError("Unapproved Git environment override")
    for name in ("base", "commit", "tree"):
        if not re.fullmatch("[0-9a-f]{40}", record[name]):
            raise RuntimeError("Invalid exact publication object")
    for filename, expected in [(Path(__file__), record["guard_sha256"]), (Path(GIT), record["git_sha256"]), (Path(GC), record["gc_sha256"]), (Path(record["qualification_evidence_path"]), record["qualification_evidence_sha256"])]:
        if sha(filename) != expected:
            raise RuntimeError("Approved source, runtime or qualification evidence changed")
    inherited_lock(city)
    native_owner(record, record_path, digest, cutoff, monotonic_cutoff)
    git = [GIT, "-C", str(checkout)]
    if checked([*git, "rev-parse", "HEAD"], cutoff, monotonic_cutoff) != record["commit"] or checked([*git, "show", "-s", "--format=%H%n%P%n%T", "HEAD"], cutoff, monotonic_cutoff).splitlines() != [record["commit"], record["base"], record["tree"]]:
        raise RuntimeError("Publication commit, sole parent or tree changed")
    if source and sorted(checked([*git, "diff-tree", "--no-commit-id", "--name-only", "-r", "HEAD"], cutoff, monotonic_cutoff).splitlines()) != sorted(record["allowed_paths"]):
        raise RuntimeError("Reviewed source changed-path scope drift")
    if checked([*git, "status", "--porcelain=v1", "--untracked-files=all"], cutoff, monotonic_cutoff):
        raise RuntimeError("Publication checkout is not clean")
    for args in (["remote", "get-url", "origin"], ["remote", "get-url", "--push", "origin"]):
        if checked([*git, *args], cutoff, monotonic_cutoff) != ORIGIN:
            raise RuntimeError("Publication origin changed")
    for remote in (ORIGIN, PUBLIC_ORIGIN):
        if checked([*git, "ls-remote", remote, "refs/heads/main"], cutoff, monotonic_cutoff).split() != [record["base"], "refs/heads/main"]:
            raise RuntimeError("Fresh publication remote base changed")
    lease, lease_monotonic = native_owner(record, record_path, digest, cutoff, monotonic_cutoff)
    cutoff = min(cutoff, lease)
    monotonic_cutoff = min(monotonic_cutoff, lease_monotonic)
    if record_path.read_bytes() != raw:
        raise RuntimeError("Publication record changed during admission")
    argv = [GIT, "-C", str(checkout), "push", "origin", record["commit"] + ":refs/heads/main"]
    environment = dict(os.environ)
    with (record_path.parent / "publication-reservation.json").open("x") as reservation:
        reservation.write(json.dumps({"record_sha256": digest, "commit": record["commit"], "deadline_utc": record["deadline_utc"], "state": "exec-admission-reserved; outcome requires actual publisher evidence"}) + "\n")
        reservation.flush()
        os.fsync(reservation.fileno())
    directory = os.open(record_path.parent, os.O_RDONLY)
    try:
        os.fsync(directory)
    finally:
        os.close(directory)
    require_time(cutoff, monotonic_cutoff)
    return os.execve(GIT, argv, environment)


def main():
    if len(sys.argv) != 3:
        print("usage: push-before-deadline.py APPROVED_RECORD APPROVED_SHA256", file=sys.stderr)
        return 2
    path = Path(sys.argv[1])
    try:
        publish(path, sys.argv[2])
    except Exception as error:
        failure = {"utc": datetime.datetime.now(datetime.timezone.utc).isoformat(), "outcome": "push-admission-refused", "error": str(error), "push_outcome_claimed": False}
        print(json.dumps(failure), file=sys.stderr, flush=True)
        city = Path(os.environ.get("GC_CITY", "/nonexistent-city"))
        root = city / ".gc/dependency-updates"
        relative = path.relative_to(root) if path.is_relative_to(root) else None
        source_root = city / ".gc/dependency-remediation"
        source_relative = path.relative_to(source_root) if path.is_relative_to(source_root) else None
        scoped = relative is not None and relative.parts and re.fullmatch("ps-[a-z0-9]+", relative.parts[0])
        source_scoped = source_relative is not None and len(source_relative.parts) >= 2
        if path.is_absolute() and path.resolve() == path and (scoped or source_scoped) and path.parent.is_dir():
            with (path.parent / "publication-refusals.jsonl").open("a") as receipt:
                receipt.write(json.dumps(failure) + "\n")
                receipt.flush()
                os.fsync(receipt.fileno())
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
