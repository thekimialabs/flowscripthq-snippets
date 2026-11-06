# Snippets — Power Automate: Create a SharePoint List Item from an Outlook Email

Tutorial: https://flowscripthq.blogspot.com/2026/11/power-automate-create-sharepoint-list.html

## Email format this flow expects

```
Subject: New order - ORD-1042
Name: Priya Sharma
Product: Widget Pro
Quantity: 5
Delivery date: 2026-11-20
```

## Power Automate expressions

### Compose - Customer name

```
if(contains(outputs('Html_to_text')?['body'], 'Name: '),
  trim(first(split(last(split(outputs('Html_to_text')?['body'], 'Name: ')), decodeUriComponent('%0A')))),
  '')
```

### Compose - Order ID

```
if(contains(triggerOutputs()?['body/subject'], 'New order - '), trim(last(split(triggerOutputs()?['body/subject'], 'New order - '))), '')
```

### Compose - Product

```
if(contains(outputs('Html_to_text')?['body'], 'Product: '),
  trim(first(split(last(split(outputs('Html_to_text')?['body'], 'Product: ')), decodeUriComponent('%0A')))),
  '')
```

### Compose - Quantity

```
if(contains(outputs('Html_to_text')?['body'], 'Quantity: '),
  int(trim(first(split(last(split(outputs('Html_to_text')?['body'], 'Quantity: ')), decodeUriComponent('%0A'))))),
  0)
```

### Compose - Delivery date

```
if(contains(outputs('Html_to_text')?['body'], 'Delivery date: '),
  trim(first(split(last(split(outputs('Html_to_text')?['body'], 'Delivery date: ')), decodeUriComponent('%0A')))),
  null)
```

## Duplicate check (Going further)

Before Create item, add a Get items action with Filter Query `Title eq '<output of Compose - Order ID>'`, then a Condition checking the expression below `is equal to` `0` — Create item runs only on the Yes branch.

```
length(outputs('Get_items')?['body/value'])
```
