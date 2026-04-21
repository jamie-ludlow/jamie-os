# jamie-os Data Strategy

## Recommended prototype posture

Use a repository/service layer from day one so the UI does not care whether data comes from:
- a dedicated jamie-os Supabase project, or
- the existing Mission Control Supabase temporarily.

## Preferred prototype option

### Option A — temporary shared Supabase
Use the existing Mission Control Supabase during prototype stage if this avoids subscription/admin friction.

Rules:
- avoid coupling UI components directly to Mission Control table names
- isolate data access in `lib/tasks/` and `lib/supabase/`
- prefer jamie-os-specific tables or schema names if practical
- keep environment variable names jamie-os-friendly even if they point to the existing backend temporarily

## Future target option

### Option B — dedicated jamie-os Supabase
Move to a dedicated Supabase project once the prototype proves direction and the product shape is stable.

Benefits:
- cleaner ownership
- cleaner schema
- lower accidental coupling
- easier future evolution

## Minimum task model for prototype

Fields:
- id
- title
- description
- status
- priority
- due_at
- assignee_id (nullable)
- created_at
- updated_at
- order_index (for board/list ordering)

Optional later:
- parent_task_id
- labels
- comments
- activity items
- attachments
- agent_id

## Repository layer recommendation

Create a task repository abstraction with methods like:
- listTasks(filters)
- getTask(id)
- createTask(input)
- updateTask(id, patch)
- moveTask(id, status, order)
- archiveTask(id)

UI components should only call repository/service functions, not Supabase directly.

## Boundary rule

Even if the prototype uses Mission Control data initially, jamie-os should behave like its own product.

That means:
- own naming
- own docs
- own design system
- own repository layer
- own future migration path
