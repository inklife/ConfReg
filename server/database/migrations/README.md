# Database Migration Guide

## Adding paper_type Field

This migration adds a new `paper_type` field to the `backend_registrationsubmission` table.

### Migration Details

- **File**: `20251024_add_paper_type.js`
- **Purpose**: Add paper type support (research paper, poster, or none)
- **Affected Table**: `backend_registrationsubmission`

### Running the Migration

#### Using the migration runner script

```bash
cd server
node mgt/run-js-migration.js 20251024_add_paper_type.js
```

### Verification

After running the migration, verify the column was added:

```sql
PRAGMA table_info(backend_registrationsubmission);
```

You should see a new column `paper_type` with type TEXT and default value 'research'.

### Rollback

To rollback this migration:

```sql
-- Note: SQLite has limited ALTER TABLE support
-- You may need to recreate the table without the paper_type column
ALTER TABLE backend_registrationsubmission DROP COLUMN paper_type;
```
