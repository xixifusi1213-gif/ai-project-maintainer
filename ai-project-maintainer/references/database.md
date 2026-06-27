# Database Review

Use this reference when the repo has SQL files, ORM migrations, schema definitions, migration tools, or the user mentions database risk.

## Review Goals

- Prevent downtime from locks, table rewrites, long transactions, blocking backfills, and incompatible app/schema deploy order.
- Preserve rollback options and data integrity.
- Separate migration safety from application query correctness.

## High-Risk Migration Patterns

Flag and verify these patterns:

- Adding `NOT NULL` columns with defaults on large existing tables.
- Creating non-concurrent indexes on hot Postgres tables.
- Dropping, renaming, or changing types of columns used by deployed code.
- Large backfills inside a schema migration transaction.
- Adding foreign keys or constraints without staged validation.
- Rewriting large tables with `ALTER TABLE` operations.
- Deleting data during deploy instead of after a compatibility window.
- Mixing app logic changes and irreversible schema/data changes in one deploy.
- Missing rollback, down migration, or forward-only recovery plan.

## PostgreSQL Routing

- Use Squawk for raw SQL or Postgres migration linting.
- Use Atlas for schema diff and migration lint when Atlas config or migration dirs exist.
- Use pgroll when zero-downtime, expand/contract, or rollback-safe Postgres migrations are needed.
- In Rails, use `strong_migrations` patterns when `db/migrate` exists.

Prefer staged changes:

1. Expand schema compatibly.
2. Deploy code that reads/writes both old and new shape if needed.
3. Backfill in small batches outside the deploy transaction.
4. Validate constraints concurrently or in staged form.
5. Contract after old code is gone.

## MySQL Routing

- Use gh-ost or Percona `pt-online-schema-change` for online schema changes on large tables.
- Watch for metadata locks, long-running transactions, replication lag, and unsafe DDL.
- Require a rollback or forward-fix plan for destructive changes.

## ORM-Specific Checks

- Prisma/Drizzle/TypeORM/Knex: inspect generated SQL, not only the migration source.
- Django/Alembic/Flyway/Liquibase: verify transaction behavior, lock behavior, and migration ordering.
- Rails: check `strong_migrations` compatibility and avoid data backfills inside migration files.

## Output Shape

For each migration risk, report:

- Affected table or migration file.
- Lock/rewrite/compatibility risk.
- Safer migration sequence.
- Tool coverage used or missing.
- Verification: local migration test, shadow DB diff, staging dry run, or CI lint.
