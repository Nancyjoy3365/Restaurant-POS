/* ============================================================================
   Service Expenses & Recipes — API-backing migration
   ============================================================================
   ServiceExpense had no table at all yet (Inventory's "Services and Repair"
   tab was local-only) — this adds one plus its CRUD procedures. Recipe/
   RecipeComponent already exist in database/01_schema.sql (currently
   unused by any write path in the app — lib/reports.ts only reads them for
   COGS) so this just adds the read side; no create/update procs needed
   since nothing in the app populates them.
   ==========================================================================*/

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

CREATE TABLE dbo.ServiceExpense (
    ServiceExpenseId    INT             IDENTITY(1,1) CONSTRAINT PK_ServiceExpense PRIMARY KEY,
    Description         NVARCHAR(500)   NOT NULL,
    Category            NVARCHAR(100)   NOT NULL,
    Amount              DECIMAL(12,2)   NOT NULL,
    IncurredAt          DATETIME2(3)    NOT NULL
);
GO
CREATE INDEX IX_ServiceExpense_IncurredAt ON dbo.ServiceExpense(IncurredAt DESC);
GO

CREATE PROCEDURE dbo.usp_CreateServiceExpense
    @Description    NVARCHAR(500),
    @Category       NVARCHAR(100),
    @Amount         DECIMAL(12,2),
    @IncurredAt     DATETIME2(3),
    @ServiceExpenseId INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO dbo.ServiceExpense (Description, Category, Amount, IncurredAt)
    VALUES (@Description, @Category, @Amount, @IncurredAt);
    SET @ServiceExpenseId = SCOPE_IDENTITY();
END
GO

CREATE PROCEDURE dbo.usp_UpdateServiceExpense
    @ServiceExpenseId  INT,
    @Description       NVARCHAR(500),
    @Category          NVARCHAR(100),
    @Amount            DECIMAL(12,2),
    @IncurredAt        DATETIME2(3)
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE dbo.ServiceExpense
    SET Description = @Description, Category = @Category, Amount = @Amount, IncurredAt = @IncurredAt
    WHERE ServiceExpenseId = @ServiceExpenseId;
END
GO

CREATE PROCEDURE dbo.usp_DeleteServiceExpense
    @ServiceExpenseId INT
AS
BEGIN
    SET NOCOUNT ON;
    DELETE FROM dbo.ServiceExpense WHERE ServiceExpenseId = @ServiceExpenseId;
END
GO
