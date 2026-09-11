/* ============================================================================
   Units of Measure — a plain, growable lookup for Ingredient.Unit.
   ============================================================================
   Ingredient.Unit itself stays a free NVARCHAR(20) (01_schema.sql) — this
   table only backs the Add/Edit Item form's dropdown, seeded with the
   original hardcoded options so nothing already stored changes meaning.
   Run once against the existing database (01-06 already applied).
   ==========================================================================*/

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

CREATE TABLE dbo.UnitOfMeasure (
    UnitId  INT             IDENTITY(1,1) CONSTRAINT PK_UnitOfMeasure PRIMARY KEY,
    Label   NVARCHAR(20)    NOT NULL CONSTRAINT UQ_UnitOfMeasure_Label UNIQUE
);
GO

INSERT INTO dbo.UnitOfMeasure (Label) VALUES ('kg'), ('litre'), ('pc'), ('g'), ('ml');
GO

/* ============================================================================
   UNIT OF MEASURE CRUD
   ==========================================================================*/

-- Get-or-create: a custom unit typed on the Add Item form is idempotent by
-- Label (case-sensitive) — retyping one that already exists just selects it
-- rather than erroring on the UNIQUE constraint or creating a duplicate.
CREATE PROCEDURE dbo.usp_AddUnitOfMeasure
    @Label      NVARCHAR(20),
    @UnitId     INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    SELECT @UnitId = UnitId FROM dbo.UnitOfMeasure WHERE Label = @Label;
    IF @UnitId IS NULL
    BEGIN
        INSERT INTO dbo.UnitOfMeasure (Label) VALUES (@Label);
        SET @UnitId = SCOPE_IDENTITY();
    END
END
GO
