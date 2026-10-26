# Snippets — Power Automate: How to Fix "The execution of template action 'Apply_to_each' failed" (Null Check Architecture)

Tutorial: https://flowscripthq.blogspot.com/2026/10/power-automate-how-to-fix-execution-of.html

## Power Automate expressions

```
empty(outputs('Get_items')?['body/value'])
```

```
coalesce(items('Apply_to_each')?['OptionalPhone'], 'N/A')
```
