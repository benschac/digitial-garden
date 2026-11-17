# Triage vocabulary

| Skill role      | Tracker label   |
| --------------- | --------------- |
| needs-triage    | needs-triage    |
| needs-info      | needs-info      |
| ready-for-agent | ready-for-agent |
| ready-for-human | ready-for-human |
| wontfix         | wontfix         |

These names describe triage roles. They do not grant dispatch permission. The current asset-workflow import uses none of these labels and remains blocked, as required by [the tracker contract](issue-tracker.md).

Tickets created from the approved spec are already specified; do not send them through an incoming-report triage workflow. Do not create label-triggered automation during setup.
