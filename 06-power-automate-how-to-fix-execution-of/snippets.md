# Snippets — Power Automate: How to Fix "The execution of template action 'Apply_to_each' failed" (Null Check Architecture)

Tutorial: https://flowscripthq.blogspot.com/2026/10/power-automate-how-to-fix-execution-of.html

## Power Automate expressions

```
empty(outputs('Get_items')?['body/value'])
```

```
coalesce(items('Apply_to_each')?['OptionalPhone'], 'N/A')
```

## Upgrade 4 additions (FlowScriptHQ, Nov 2026)

Loop over the array property inside a Parse JSON body, not the whole body:

```
body('Parse_JSON')?['value']
```

Null-safe Parse JSON schema: a field that is sometimes a string and
sometimes null declares both types. Once a property has more than one
type, the designer stops offering it as a dynamic content card, so
reference it with an expression instead (for example the coalesce
expression above):

```json
{
  "type": "object",
  "properties": {
    "OptionalPhone": { "type": ["string", "null"] }
  }
}
```

Remove a field from the schema `required` array when a missing field
is allowed, so a record without that field passes validation.

Collect one property from every object into a new array without a
loop: use a Select action with From set to the Parse JSON body and the
property mapped in text mode.

Per-item error capture: initialize an Array variable named FailedItems
once at the top of the flow, before the loop. Inside the loop, a Catch
scope (Run after: Has failed, Has timed out; Is successful cleared)
appends the failed item ID to FailedItems. After the loop, one summary
action reads the whole array. Never initialize the variable inside the
loop, and never append to it on the success path.
