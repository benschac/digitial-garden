import datetime
import fcntl
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import threading
import time
import unittest
from unittest.mock import patch


HERE = Path(__file__).resolve().parent
SPEC = importlib.util.spec_from_file_location("push_guard", HERE / "push-before-deadline.py")
guard = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(guard)


def utc(value):
    return datetime.datetime.fromtimestamp(value, datetime.timezone.utc).isoformat()


class PublicationAdmissionTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.city = Path(self.temp.name).resolve()
        self.root = self.city / ".gc/dependency-updates/ps-test/attempt"
        self.root.mkdir(parents=True)
        self.checkout = self.root / "checkout"
        self.checkout.mkdir()
        self.lock_path = self.city / ".gc/dependency-updates/verify.lock"
        self.lock = self.lock_path.open("a")
        self.addCleanup(self.lock.close)
        os.set_inheritable(self.lock.fileno(), True)
        fcntl.flock(self.lock, fcntl.LOCK_EX)
        self.wall = 1000.0
        self.monotonic = 2000.0
        self.launches = []
        self.native_mode = "valid"
        self.remote_mode = "valid"
        self.source_anchors = {}
        self.publisher_activity = None
        self.actual_scope = ["guard.py", "publisher.md"]
        self.record_path = self.root / "publication.json"
        self.record = {"schema_version": 1, "purpose": "timed-dependency-publication", "bead_id": "ps-test", "owner": "personal-site/deps.publisher", "session_id": "psc-synthetic", "claim_utc": utc(990), "deadline_utc": utc(1010), "budget_seconds": 20, "push_limit": 1, "base": "a" * 40, "commit": "b" * 40, "tree": "c" * 40, "checkout": str(self.checkout), "guard_sha256": "d" * 64, "git_sha256": "e" * 64, "gc_sha256": "f" * 64, "qualification_evidence_path": str(self.root / "qualification.json"), "qualification_evidence_sha256": "0" * 64}
        self.save_record()
        self.anchor = self.digest
        self.original_claim = self.record["claim_utc"]
        self.original_cutoff = self.record["deadline_utc"]
        self.calls = []
        self.stack = []
        self.addCleanup(self.unpatch)
        for context in [patch.dict(os.environ, {"GC_CITY": str(self.city), "GC_SESSION_ID": "psc-synthetic"}, clear=True), patch.object(guard, "LOCK_FD", self.lock.fileno()), patch.object(guard.time, "time", lambda: self.wall), patch.object(guard.time, "monotonic", lambda: self.monotonic), patch.object(guard, "sha", self.file_hash), patch.object(guard.subprocess, "check_output", self.transport), patch.object(guard.os, "execve", self.launch)]:
            context.__enter__()
            self.stack.append(context)

    def unpatch(self):
        for context in reversed(self.stack):
            context.__exit__(None, None, None)

    def save_record(self):
        self.record_path.write_text(json.dumps(self.record))
        self.digest = hashlib.sha256(self.record_path.read_bytes()).hexdigest()

    def file_hash(self, path):
        if str(path) == self.record.get("source_handoff_path"):
            return hashlib.sha256(Path(path).read_bytes()).hexdigest()
        return {str(HERE / "push-before-deadline.py"): self.record["guard_sha256"], guard.GIT: self.record["git_sha256"], guard.GC: self.record["gc_sha256"], self.record["qualification_evidence_path"]: self.record["qualification_evidence_sha256"]}[str(path)]

    def transport(self, argv, **kwargs):
        self.calls.append(argv)
        if argv[0] == guard.GC:
            if "ready" in argv:
                return json.dumps([{"id": "ordinary-ready"}] if self.publisher_activity == "ready" else []).encode()
            if "list" in argv and "bd" in argv:
                return json.dumps([{"id": "ps-other", "status": "in_progress", "assignee": "personal-site/deps.publisher"}] if self.publisher_activity == "claim" else []).encode()
            if "hook" in argv:
                return b"ps-test\n"
            if "session" in argv:
                rows = [{"id": "psc-synthetic", "state": "active", "agent_name": self.record["owner"]}]
                if self.publisher_activity == "session":
                    rows.append({"id": "psc-ordinary", "state": "active", "agent_name": "personal-site/deps.publisher"})
                if self.publisher_activity == "skills-session":
                    rows.append({"id": "psc-skills", "state": "active", "agent_name": "personal-site/skills.publisher"})
                return json.dumps({"sessions": rows}).encode()
            bead = argv[argv.index("show") + 1]
            if bead == "psc-synthetic":
                return json.dumps([{"id": bead, "status": "open", "metadata": {"state": "awake", "agent_name": self.record["owner"], "current_claim_bead_id": "ps-test"}}]).encode()
            return json.dumps([{"id": "ps-test", "status": "in_progress", "assignee": "lost-owner" if self.native_mode == "lost" else self.record["owner"], "lease_expires_at": utc(1020), "metadata": {"gc.session_id": "psc-synthetic", "dependency_publication_record_path": str(self.record_path), "dependency_publication_record_sha256": self.anchor, "dependency_publication_claim_utc": self.original_claim, "dependency_publication_deadline_utc": self.original_cutoff, **self.source_anchors}}]).encode()
        command = argv[3:]
        if command[:1] == ["rev-parse"]:
            return (self.record["commit"] + "\n").encode()
        if command[:1] == ["show"]:
            return ("\n".join(self.record[k] for k in ["commit", "base", "tree"]) + "\n").encode()
        if command[:1] == ["diff-tree"]:
            return ("\n".join(self.actual_scope) + "\n").encode()
        if command[:1] == ["status"]:
            return b""
        if command[:1] == ["remote"]:
            return (guard.ORIGIN + "\n").encode()
        if command[:1] == ["ls-remote"]:
            if command[1] == guard.PUBLIC_ORIGIN:
                if self.remote_mode == "expire":
                    self.wall = 1010
                    self.monotonic = 2010
                if self.remote_mode == "rollback":
                    self.wall = 950
                    self.monotonic = 2011
                if self.remote_mode == "lose-owner":
                    self.native_mode = "lost"
            return (self.record["base"] + "\trefs/heads/main\n").encode()
        raise AssertionError(argv)

    def launch(self, executable, argv, environment):
        self.launches.append((executable, argv, environment, self.wall, self.monotonic))

    def invoke(self):
        return guard.publish(self.record_path, self.digest)

    def refused(self, expected="deadline"):
        with self.assertRaisesRegex((RuntimeError, TimeoutError, FileExistsError), expected):
            self.invoke()
        self.assertEqual(self.launches, [])

    def test_expired_at_entry_has_zero_launches(self):
        self.wall = 1011
        self.refused()
        self.assertEqual(self.calls, [])

    def test_exact_cutoff_has_zero_launches(self):
        self.wall = 1010
        self.refused()

    def test_expiration_during_lock_admission_has_zero_launches(self):
        original = guard.inherited_lock
        def delayed(city):
            original(city)
            self.wall = 1010
            self.monotonic = 2010
        with patch.object(guard, "inherited_lock", delayed):
            self.refused()

    def test_expiration_during_final_remote_has_zero_launches(self):
        self.remote_mode = "expire"
        self.refused()

    def test_wall_clock_rollback_cannot_extend_monotonic_budget(self):
        self.remote_mode = "rollback"
        self.refused()

    def test_changed_record_hash_is_rejected(self):
        self.record_path.write_text("{}")
        self.refused("record hash mismatch")

    def test_changed_original_claim_or_cutoff_is_rejected(self):
        for field in ["claim_utc", "deadline_utc"]:
            with self.subTest(field=field):
                previous = self.record[field]
                self.record[field] = utc(995 if field == "claim_utc" else 1009)
                self.save_record()
                self.refused("Native publication authority")
                self.record[field] = previous
                self.save_record()

    def test_owner_loss_during_remote_check_is_rejected(self):
        self.remote_mode = "lose-owner"
        self.refused("publisher claim changed")

    def test_broader_argv_override_is_rejected(self):
        self.record["argv"] = [guard.GIT, "push", "--force"]
        self.save_record()
        self.refused("Missing or broader")

    def test_valid_case_has_exact_nonforce_argv_once_and_lock_remains(self):
        self.invoke()
        self.assertEqual(len(self.launches), 1)
        self.assertEqual(self.launches[0][1], [guard.GIT, "-C", str(self.checkout), "push", "origin", "b" * 40 + ":refs/heads/main"])
        self.assertLess(self.launches[0][3], 1010)
        self.assertLess(self.launches[0][4], 2010)
        self.assertTrue((self.root / "publication-reservation.json").exists())
        with self.lock_path.open("a") as contender:
            with self.assertRaises(BlockingIOError):
                fcntl.flock(contender, fcntl.LOCK_EX | fcntl.LOCK_NB)
        with self.assertRaises(FileExistsError):
            self.invoke()
        self.assertEqual(len(self.launches), 1)

    def test_unrelated_inherited_descriptor_cannot_replace_the_lock(self):
        with (self.root / "wrong-lock").open("a") as wrong:
            os.set_inheritable(wrong.fileno(), True)
            with patch.object(guard, "LOCK_FD", wrong.fileno()):
                self.refused("existing verification lock")

    def test_expiry_after_durable_reservation_keeps_reservation_and_launches_zero(self):
        fsync = guard.os.fsync
        def expire_after_reservation(fd):
            fsync(fd)
            if guard.stat.S_ISDIR(os.fstat(fd).st_mode):
                self.wall = 1010
                self.monotonic = 2010
        with patch.object(guard.os, "fsync", expire_after_reservation):
            self.refused()
        self.assertTrue((self.root / "publication-reservation.json").exists())

    def source_case(self):
        self.root = self.city / ".gc/dependency-remediation/reviewed-source/psc-synthetic"
        self.root.mkdir(parents=True, exist_ok=True)
        self.checkout = self.root / "checkout"
        self.checkout.mkdir(exist_ok=True)
        self.record_path = self.root / "publication.json"
        self.record.update(purpose="timed-reviewed-source-integration", owner="personal-site/gc.implementation-worker-source", checkout=str(self.checkout), authority_kind=guard.SOURCE_KIND, reviewed_source_authority=True, source_root=str(self.root), source_handoff_path=str(self.root / "reviewed-handoff.json"), source_handoff_sha256="pending", allowed_paths=["guard.py", "publisher.md"], qualification_evidence_path=str(self.root / "qualification.json"))
        self.bind_source()

    def bind_source(self):
        approved = {key: self.record[key] for key in guard.SOURCE_BINDINGS}
        approved.update(authority_kind=guard.SOURCE_KIND, approved=True)
        handoff = Path(self.record["source_handoff_path"])
        handoff.write_text(json.dumps(approved))
        self.record["source_handoff_sha256"] = hashlib.sha256(handoff.read_bytes()).hexdigest()
        self.source_anchors = {"dependency_publication_authority_kind": guard.SOURCE_KIND, "dependency_source_integration_owner": self.record["owner"], "dependency_source_integration_session_id": self.record["session_id"], "dependency_source_integration_root": self.record["source_root"], "dependency_source_integration_handoff_sha256": self.record["source_handoff_sha256"]}
        self.save_record()
        self.anchor = self.digest

    def test_normal_mode_cannot_infer_source_privilege_from_owner(self):
        self.record["owner"] = "personal-site/gc.implementation-worker-source"
        self.save_record()
        self.refused("Missing or broader publication authority")

    def test_normal_mode_cannot_move_record_to_remediation_namespace(self):
        root = self.city / ".gc/dependency-remediation/unapproved-source"
        root.mkdir(parents=True)
        self.record_path = root / "publication.json"
        self.save_record()
        self.refused("canonical bead directory")

    def test_source_valid_designated_owner_executes_exact_argv_once(self):
        self.source_case()
        self.invoke()
        self.assertEqual(len(self.launches), 1)
        self.assertEqual(self.launches[0][1], [guard.GIT, "-C", str(self.checkout), "push", "origin", "b" * 40 + ":refs/heads/main"])
        with self.assertRaises(FileExistsError):
            self.invoke()
        self.assertEqual(len(self.launches), 1)

    def test_source_ordinary_publishers_must_all_be_quiescent(self):
        self.source_case()
        for activity in ["session", "skills-session", "claim", "ready"]:
            with self.subTest(activity=activity):
                self.publisher_activity = activity
                self.refused("publisher|publication owner")

    def test_source_unknown_kind_has_no_privilege(self):
        self.source_case()
        self.record["authority_kind"] = "unknown-source-kind"
        self.save_record()
        self.refused("Explicit reviewed source authority")

    def test_source_missing_positive_review_authority_is_rejected(self):
        self.source_case()
        self.record["reviewed_source_authority"] = False
        self.save_record()
        self.refused("Explicit reviewed source authority")

    def test_source_wrong_actual_owner_is_rejected(self):
        self.source_case()
        self.native_mode = "lost"
        self.refused("publisher claim changed")

    def test_source_checkout_outside_approved_owner_root_is_rejected(self):
        self.source_case()
        self.record["checkout"] = str(self.city / ".gc/dependency-remediation/other-owner/checkout")
        self.bind_source()
        self.refused("checkout or calling session mismatch")

    def test_source_missing_native_main_anchors_is_rejected(self):
        self.source_case()
        self.source_anchors = {}
        self.refused("Native Main source-integration approval anchors")

    def test_source_scope_drift_is_rejected(self):
        self.source_case()
        self.actual_scope = ["unrelated.py"]
        self.refused("source changed-path scope drift")

    def test_timed_publisher_callsite_requires_the_guard_and_foreground_lock(self):
        prompt = (HERE.parents[1] / "agents/publisher/prompt.template.md").read_text()
        for required in ["push-before-deadline.py", "Never run bare timed", "flock --exclusive --timeout 300 9", "python3 \"$TRUSTED_GUARD\" \"$PUBLICATION_RECORD\" \"$APPROVED_RECORD_SHA256\"", "dependency_publication_record_sha256"]:
            self.assertIn(required, prompt)

    def test_real_foreground_flock_wait_past_cutoff_refuses_before_git(self):
        self.unpatch()
        self.stack = []
        deadline = time.time() + 0.15
        self.record["claim_utc"] = utc(deadline - 1)
        self.record["deadline_utc"] = utc(deadline)
        self.record["budget_seconds"] = 1
        self.save_record()
        release = threading.Thread(target=lambda: (time.sleep(0.35), fcntl.flock(self.lock, fcntl.LOCK_UN)))
        release.start()
        command = 'exec 9>"$1"; /opt/homebrew/bin/flock --exclusive --timeout 2 9; "$2" "$3" "$4" "$5"'
        result = subprocess.run(["bash", "-c", command, "synthetic", str(self.lock_path), sys.executable, str(HERE / "push-before-deadline.py"), str(self.record_path), self.digest], env=dict(os.environ, GC_CITY=str(self.city), GC_SESSION_ID="psc-synthetic"), capture_output=True, text=True, timeout=5)
        release.join()
        self.assertEqual(result.returncode, 2)
        self.assertIn("deadline", result.stderr)
        self.assertFalse((self.root / "publication-reservation.json").exists())
        self.assertEqual(self.launches, [])


if __name__ == "__main__":
    unittest.main(verbosity=2)
