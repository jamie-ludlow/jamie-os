# Training System Migration

## Running the Migration

Since Supabase doesn't support arbitrary SQL execution via the REST API, you need to run the migration manually:

### Option 1: Supabase Dashboard (Recommended)

1. Go to https://supabase.com/dashboard/project/mvqdrzlzviofizostibh/sql/new
2. Copy the contents of `001_training_plan.sql`
3. Paste into the SQL editor
4. Click "Run"

### Option 2: psql (if you have direct DB access)

```bash
psql "postgresql://postgres:[YOUR_PASSWORD]@db.mvqdrzlzviofizostibh.supabase.co:5432/postgres" \
  -f supabase/migrations/001_training_plan.sql
```

## After Migration

Once the tables are created, seed the data:

```bash
curl -X POST http://localhost:3000/api/training/seed
```

This will populate:
- 63 training sessions (9 weeks × 7 days)
- 4 race targets (Surrey HM, Kew 10K, Sutton 10K, London Marathon)
