using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MyToggleService.ApiService.Migrations
{
    /// <inheritdoc />
    public partial class ApplicationRegistry : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("CREATE EXTENSION IF NOT EXISTS \"pgcrypto\";");

            migrationBuilder.Sql(@"
CREATE TABLE IF NOT EXISTS applications (
    id uuid NOT NULL PRIMARY KEY,
    name character varying(200) NOT NULL,
    description character varying(1000) NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);");

            migrationBuilder.Sql(@"
CREATE UNIQUE INDEX IF NOT EXISTS ux_applications_name
ON applications (name);");

            migrationBuilder.Sql(@"
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'feature_toggles'
    ) THEN
        CREATE TABLE feature_toggles (
            id uuid NOT NULL PRIMARY KEY,
            key character varying(200) NOT NULL,
            application_id uuid NOT NULL,
            tenant_id uuid NULL,
            is_enabled boolean NOT NULL,
            created_at timestamp with time zone NOT NULL,
            updated_at timestamp with time zone NOT NULL
        );
    END IF;
END
$$;");

            migrationBuilder.Sql(@"
ALTER TABLE feature_toggles
ADD COLUMN IF NOT EXISTS application_id uuid;");

            migrationBuilder.Sql(@"
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'feature_toggles'
          AND column_name = 'application'
    ) THEN
        INSERT INTO applications (id, name, description, created_at, updated_at)
        SELECT gen_random_uuid(), source.application_name, NULL, NOW(), NOW()
        FROM (
            SELECT DISTINCT application AS application_name
            FROM feature_toggles
            WHERE application IS NOT NULL AND btrim(application) <> ''
        ) source
        WHERE NOT EXISTS (
            SELECT 1 FROM applications app WHERE app.name = source.application_name
        );
    END IF;
END
$$;");

            migrationBuilder.Sql(@"
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'feature_toggles'
          AND column_name = 'application'
    ) THEN
        UPDATE feature_toggles ft
        SET application_id = app.id
        FROM applications app
        WHERE ft.application_id IS NULL
          AND ft.application IS NOT NULL
          AND btrim(ft.application) <> ''
          AND app.name = ft.application;
    END IF;
END
$$;");

            migrationBuilder.Sql(@"
INSERT INTO applications (id, name, description, created_at, updated_at)
SELECT gen_random_uuid(), 'legacy', 'Auto-created during migration', NOW(), NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM applications WHERE name = 'legacy'
);");

            migrationBuilder.Sql(@"
UPDATE feature_toggles ft
SET application_id = app.id
FROM applications app
WHERE ft.application_id IS NULL
  AND app.name = 'legacy';");

            migrationBuilder.Sql(@"
ALTER TABLE feature_toggles
ALTER COLUMN application_id SET NOT NULL;");

            migrationBuilder.Sql(@"
DROP INDEX IF EXISTS ux_feature_toggles_global;
DROP INDEX IF EXISTS ux_feature_toggles_tenant;
DROP INDEX IF EXISTS ix_feature_toggles_app_key;");

            migrationBuilder.Sql(@"
CREATE INDEX IF NOT EXISTS ix_feature_toggles_tenant
ON feature_toggles (tenant_id);");

            migrationBuilder.Sql(@"
CREATE INDEX IF NOT EXISTS ix_feature_toggles_app_key
ON feature_toggles (application_id, key);");

            migrationBuilder.Sql(@"
CREATE UNIQUE INDEX IF NOT EXISTS ux_feature_toggles_global
ON feature_toggles (application_id, key)
WHERE tenant_id IS NULL;");

            migrationBuilder.Sql(@"
CREATE UNIQUE INDEX IF NOT EXISTS ux_feature_toggles_tenant
ON feature_toggles (application_id, key, tenant_id)
WHERE tenant_id IS NOT NULL;");

            migrationBuilder.Sql(@"
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'FK_feature_toggles_applications_application_id'
    ) THEN
        ALTER TABLE feature_toggles
        ADD CONSTRAINT ""FK_feature_toggles_applications_application_id""
        FOREIGN KEY (application_id)
        REFERENCES applications (id)
        ON DELETE RESTRICT;
    END IF;
END
$$;");

            migrationBuilder.Sql(@"
ALTER TABLE feature_toggles
DROP COLUMN IF EXISTS application;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "feature_toggles");

            migrationBuilder.DropTable(
                name: "applications");
        }
    }
}
