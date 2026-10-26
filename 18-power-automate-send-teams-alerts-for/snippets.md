# Snippets — Power Automate: Send Teams Alerts for New SharePoint Items

Tutorial: https://flowscripthq.blogspot.com/2026/10/power-automate-send-teams-alerts-for.html

## Power Automate expressions

```
@equals(triggerOutputs()?['body/Priority/Value'], 'High')
```

## Additional snippets

```
New support ticket: {Title}

Priority: {Priority Value}
Requested by: {Created By DisplayName}
Link: {Link to item}
```

```
{
  "type": "AdaptiveCard",
  "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
  "version": "1.4",
  "body": [
    {
      "type": "TextBlock",
      "size": "Medium",
      "weight": "Bolder",
      "text": "New high-priority ticket"
    },
    {
      "type": "FactSet",
      "facts": [
        { "title": "Title", "value": "PUT_TITLE_HERE" },
        { "title": "Priority", "value": "PUT_PRIORITY_HERE" },
        { "title": "Requested by", "value": "PUT_REQUESTER_HERE" }
      ]
    }
  ],
  "actions": [
    {
      "type": "Action.OpenUrl",
      "title": "View item",
      "url": "PUT_ITEM_LINK_HERE"
    }
  ]
}
```

```
"msteams": {
  "entities": [
    {
      "type": "mention",
      "text": "<at>Assignee Name</at>",
      "mentioned": { "id": "assignee@company.com", "name": "Assignee Name" }
    }
  ]
}
```
