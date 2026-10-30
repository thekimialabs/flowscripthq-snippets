# Snippets — Power Automate Error Handling: Configure Run After So a Failed Flow Alerts You

Tutorial: https://flowscripthq.blogspot.com/2026/10/power-automate-error-handling-configure.html

## The pattern (in order)

1. **Scope "Try"** — put every risky action inside a Scope action named `Try`.
2. **Scope "Catch"** — a second Scope after `Try`, holding the alert/log actions.
3. **Configure run after** — on the FIRST action inside `Catch`, open the action's `...` menu → **Configure run after** and tick **has failed** and **has timed out**. That is the whole trick: the branch now runs exactly when `Try` fails, and is skipped when `Try` succeeds. With parallel branches, select every predecessor the next action must wait for.
4. **result()** — inside `Catch`, `result('Try')` returns one entry per action in the `Try` scope (name, status, error), so the alert can name the action that actually failed instead of just saying "the flow failed".
5. **Filter array** — filter the `result('Try')` output down to the failed action.
6. **Compose "First_failed_action"** — take the first failed entry.
7. **Send an email (V2)** — the alert, using the Compose outputs below, plus a deep link to the failed run.
8. **Terminate** — end the `Catch` branch with a Terminate action, Status = **Failed**, so the run history still shows the run as failed (without it, the run shows as Succeeded and nobody notices).
9. **Retry policy** — on actions that fail transiently (HTTP, SharePoint throttling), set Settings → Retry Policy to exponential interval instead of the default fixed count.

## Filter array (find the failed action)

- **From:** `result('Try')`
- **Condition:** `item()?['status']` **is equal to** `Failed`

## First failed action (Compose)

```
first(body('Filter_array'))
```

From that Compose, the alert can use:

- Failing action name: `outputs('First_failed_action')?['name']`
- Error message: `outputs('First_failed_action')?['error']?['message']`
- Error code: `outputs('First_failed_action')?['error']?['code']`

Alert subject line used in the tutorial:

```
Flow failed: @{outputs('First_failed_action')?['name']} — @{outputs('First_failed_action')?['error']?['code']}
```

## Link to the failed run (put it in the alert body)

```
https://flow.microsoft.com/manage/environments/@{workflow().tags.environmentName}/flows/@{workflow().name}/runs/@{workflow().run.name}
```

## Notes

- `result()` only works on a Scope — it returns the results of the actions inside that scope, which is why the Try/Catch scopes are not optional decoration.
- Nested scopes: call `result('Outer')` on the outer scope to see the inner scopes' results.
- Do not end the Catch branch without the Terminate action: a handled failure otherwise records the run as Succeeded.
