# Snippets — Power Automate: Send Email When SharePoint Status Changes to Approved

Tutorial: https://flowscripthq.blogspot.com/2026/10/power-automate-send-email-when.html

## Power Automate expressions

```
@equals(triggerOutputs()?['body/Status']?['Value'], 'Approved')
```

## Additional snippets

```
Your request has been approved.

Request: [Title token]
Status: [Status Value token]
Approved by: [Modified By DisplayName token]

View the request: [Link to item token]
```
