# Snippets — Power Automate Get Items Filter Query: Complete OData Guide

Tutorial: https://flowscripthq.blogspot.com/2026/10/power-automate-get-items-filter-query.html

## Additional snippets

```
Title eq 'Laptop'
Status ne 'Archived'
```

```
startswith(Title, 'Lap')
```

```
substringof('Lap', Title)
```

```
Quantity gt 10
TotalAmount ge 1000
Discount lt 0.15
```

```
DueDate le '2026-10-21'
```

```
DueDate le '@{formatDateTime(utcNow(),'yyyy-MM-dd')}'
```

```
Priority eq 'High'
Status ne 'Closed'
```

```
Approved eq 1
IsOverdue eq 0
```

```
AssignedTo/EMail eq 'ana@company.com'
```

```
Department/Title eq 'Finance'
DepartmentId eq 4
```

```
Manager eq null
CompletedDate ne null
```

```
Manager eq null          // text, date, number, choice
AssignedToId eq null     // person column — note the Id suffix
DepartmentId eq null     // lookup column — note the Id suffix
```

```
Priority eq 'High' and Status ne 'Closed'
(Status eq 'Open' or Status eq 'In Progress') and Priority eq 'High'
not (Status eq 'Archived')
```
