# Snippets — Power Automate: Create Planner Task from SharePoint List Item

Tutorial: https://flowscripthq.blogspot.com/2026/11/power-automate-create-planner-task-from.html

## SharePoint list this flow expects

List name: `Task Requests`

| Column | Type | Notes |
| --- | --- | --- |
| Title | Single line of text | The Planner task title. |
| Description | Multiple lines of text | The task description. |
| Assigned To | Person or Group | Who the task goes to. Allow multiple selections for shared tasks. |
| Due Date | Date and time (Date only) | Due date for the Planner task. |
| BucketName | Single line of text | Must match a bucket in the plan exactly: To do, Doing, or Done. |
| Priority | Choice | Low, Medium, or High. |
| Planner Task ID | Single line of text | Leave blank. The flow writes the created task's ID here. |

Planner plan: `Team Tasks`, with buckets `To do`, `Doing`, `Done`.

## Flow structure

Trigger: SharePoint **When an item is created** on the `Task Requests` list. Use "created", not "created or modified", or the flow re-runs on its own write-back in Step 8 and creates duplicate tasks.

## Power Automate expressions

### Filter array — buckets from the plan

From:

```
body('List_buckets_in_a_plan')?['value']
```

Filter condition (only the bucket named in the list item passes through):

```
@equals(item()?['name'], triggerOutputs()?['body/BucketName'])
```

### Compose - Bucket ID

Takes the first bucket left after the filter and returns its ID:

```
first(body('Filter_array')?['value'])?['id']
```

If the filter returns nothing, this returns no ID and **Create a task** fails with an invalid bucket error — usually a name mismatch between the list item and the plan.

### Apply to each — assignee loop

Loop over the Assigned To array from the trigger:

```
triggerOutputs()?['body/AssignedTo']
```

Inside the loop, **Get user profile (V2)**, User (UPN):

```
items('Apply_to_each')?['Email']
```

Then **Append to array variable** (variable `AssigneeIds`, initialized as an empty array before the loop), Value:

```
outputs('Get_user_profile_(V2)')?['body/id']
```

If Assigned To is empty, the loop never runs and the task is created unassigned.

### Create a task — key fields

| Field | Value |
| --- | --- |
| Title | `triggerOutputs()?['body/Title']` |
| Assigned User Ids | `variables('AssigneeIds')` |
| Due Date Time | `if(empty(triggerOutputs()?['body/DueDate']), null, formatDateTime(triggerOutputs()?['body/DueDate'], 'yyyy-MM-ddT12:00:00Z'))` |
| Description | `if(empty(triggerOutputs()?['body/Description']), '', triggerOutputs()?['body/Description'])` |

The due date is set to noon UTC: SharePoint date-only columns arrive at midnight UTC, and Planner displays the date in the viewer's time zone, so anyone west of UTC sees the previous day without this. The `empty()` check matters because Due Date is optional and `formatDateTime` on a blank date fails the run.

Priority values, if you set them: 1 is Urgent, 3 is Important, 5 is Medium, 9 is Low.

### Update item — write the task ID back

SharePoint **Update item**, Planner Task ID set to the Id output from **Create a task**:

```
body('Create_a_task')?['id']
```

Only set the fields you are changing. The trigger is "created", so this edit does not retrigger the flow.

## Going further — update flow trigger condition

Second flow, trigger **When an item is created or modified**, with this trigger condition so new items are skipped and only edits run it:

```
@not(empty(triggerOutputs()?['body/PlannerTaskID']))
```

Then use Planner **Update a task (V2)** with Task Id set to the trigger's Planner Task ID. Do not put an Update item action in this second flow: it would modify the item again and retrigger the flow.

## Multiple assignees

Set Assigned To to allow multiple selections in the list settings, then use the Apply to each loop above. In **Create a task**, set Assigned User Ids to the joined array:

```
join(variables('AssigneeIds'), ';')
```

Planner allows up to 11 assignees on one task.
