# Snippets — Power Automate Approval Reminder: Remind Without Spam

Tutorial: https://flowscripthq.blogspot.com/2026/10/power-automate-approval-reminder-remind.html

## Power Automate expressions

```
@equals(coalesce(body('Wait_for_an_approval')?['outcome'], body('Wait_for_an_approval_2')?['outcome']), 'Approve')
```

```
@greaterOrEquals(
  div(
    sub(
      ticks(utcNow()),
      ticks(coalesce(items('Apply_to_each')?['LastReminderSent'], items('Apply_to_each')?['Created']))
    ),
    864000000000
  ),
  3
)
```

```
@add(coalesce(items('Apply_to_each')?['ReminderCount'], 0), 1)
```

```
@equals(add(coalesce(items('Apply_to_each')?['ReminderCount'], 0), 1), 2)
```

## Additional snippets

```
Subject: Reminder: approval waiting for your response — [Title token]

Body:
Hi [Approver DisplayName token],

A request is still waiting for your approval:

Request: [Title token]
Link: [Link to item token]

Please approve or reject it using the link above. If you have already responded, please ignore this reminder.
```

```
Status eq 'Pending'
```

```
Subject: Escalation: approval pending for [Title token]

Body:
Hi [Manager DisplayName token],

A request assigned to [Approver DisplayName token] has waited through 2 reminders:

Request: [Title token]
Link: [Link to item token]

Please follow up or reassign it.
```
