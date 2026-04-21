# Supabase Integration Guide

**Current Status:** Using existing Mission Control Supabase (temporary)  
**Target:** Migrate to dedicated jamie-os Supabase (when ready)

---

## Temporary Setup (Current)

For the prototype phase, we're reusing the Mission Control Supabase to avoid additional subscription costs.

### Configuration

1. Get credentials from Mission Control Supabase project
2. Add to `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

3. These are gitignored (never committed)

### Creating the Supabase Client

```tsx
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
```

---

## Data Strategy (Temporary)

### Option A: Namespace Approach (Recommended)
Create `jamie_os_*` prefixed tables in Mission Control Supabase:
- `jamie_os_tasks` — All jamie-os tasks
- `jamie_os_workspaces` — jamie-os workspace config
- Easy to isolate later

### Option B: Reuse Approach
Reuse existing `tasks` table with workspace filtering:
- Simpler initially
- Harder to separate later

**Recommendation:** Use Option A (namespace) for cleaner separation.

---

## Schema (jamie_os_tasks)

```sql
CREATE TABLE jamie_os_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'todo',
  priority VARCHAR(50) DEFAULT 'medium',
  due_date TIMESTAMP,
  assignee_id UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID NOT NULL,
  
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
  CONSTRAINT status_check CHECK (status IN ('todo', 'doing', 'done', 'blocked', 'backlog')),
  CONSTRAINT priority_check CHECK (priority IN ('low', 'medium', 'high'))
);

-- Add indexes
CREATE INDEX idx_jamie_os_tasks_workspace ON jamie_os_tasks(workspace_id);
CREATE INDEX idx_jamie_os_tasks_status ON jamie_os_tasks(status);
CREATE INDEX idx_jamie_os_tasks_assignee ON jamie_os_tasks(assignee_id);
```

---

## Migration Path (Phase 4)

When ready to move to dedicated jamie-os Supabase:

1. **Create new Supabase project:**
   ```bash
   supabase projects create --name jamie-os --db-password <secure-password>
   ```

2. **Run schema migration:**
   - Set up schema in new project
   - Create RLS policies

3. **Migrate data:**
   ```bash
   pg_dump -h old.supabase.co -U postgres -d postgres -t jamie_os_tasks | \
   psql -h new.supabase.co -U postgres -d postgres
   ```

4. **Update environment:**
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://new-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=new-anon-key
   ```

5. **Verify and cut over**

---

## RLS Policies (Security)

```sql
-- Enable RLS
ALTER TABLE jamie_os_tasks ENABLE ROW LEVEL SECURITY;

-- Users can only see tasks in their workspace
CREATE POLICY "Users can view own workspace tasks"
  ON jamie_os_tasks FOR SELECT
  USING (workspace_id IN (
    SELECT id FROM workspaces 
    WHERE owner_id = auth.uid()
  ));

-- Users can only create tasks in their workspace
CREATE POLICY "Users can create tasks in own workspace"
  ON jamie_os_tasks FOR INSERT
  WITH CHECK (workspace_id IN (
    SELECT id FROM workspaces 
    WHERE owner_id = auth.uid()
  ));
```

---

## No Hardcoding

The repository layer (`lib/tasks/TaskRepository.ts`) should:
- Handle all Supabase queries
- Never expose connection details to UI
- Allow swapping backends easily

Example:

```tsx
// UI level - never talks to Supabase directly
const tasks = await taskRepository.list({ workspace: 'my-workspace' });

// Repository level - handles Supabase
class TaskRepository {
  async list(filters: TaskFilters) {
    const { data } = await supabase
      .from('jamie_os_tasks')
      .select('*')
      .eq('workspace_id', filters.workspace);
    return data;
  }
}
```

This means moving to new Supabase just requires updating the repository, not every component.

---

## Cost Optimization

**Free tier Supabase includes:**
- 500MB database
- 1GB bandwidth/month
- Unlimited real-time
- Up to 100 concurrent connections

**jamie-os needs:**
- Small task table (< 1MB initially)
- Light bandwidth usage
- Real-time subscriptions for task updates

**Fits comfortably in free tier** for prototype phase.

---

## Environment Variables

**Never commit:**
- `.env.local` (local secrets)
- Supabase keys in code

**Always use:**
- `.env.example` (template, safe to commit)
- Environment variables in Vercel dashboard
- Secrets manager in production

---

## Next Steps

1. ✅ Add Supabase client setup to `lib/supabase/client.ts`
2. Create TaskRepository in `lib/tasks/TaskRepository.ts`
3. Create schema in Mission Control Supabase
4. Set up RLS policies
5. Wire up UI to repository

---

**See Also:**
- `docs/data-strategy.md` — Overall data strategy
- `docs/PHASE_3_ROADMAP.md` — Task 4 for data layer
