/* ============================================================================
   Menu & Staff — API-backing migration
   ============================================================================
   Adds the stored procedures needed to move MenuItem (+ its alias/spice
   level/add-on/combo-component children), Staff, ShiftEntry, LeaveRecord,
   and IncentiveRecord off the browser-only Zustand store and onto this
   database. Purely additive — no columns or tables change shape, and
   nothing here deletes existing rows.
   ==========================================================================*/

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

/* ============================================================================
   MENU ITEM CRUD
   ============================================================================
   Aliases/spice levels are plain string arrays; @SpiceLevelsJson preserves
   array order into SortOrder via OPENJSON's own array index ([key]). Add-ons
   and combo components are objects, passed the same way usp_AddOrderLineItem
   already accepts @AddOnsJson (see database/02_procedures.sql).
   ==========================================================================*/

CREATE PROCEDURE dbo.usp_CreateMenuItem
    @Name                   NVARCHAR(150),
    @Category               NVARCHAR(20),
    @Price                  DECIMAL(12,2),
    @IsVeg                  BIT,
    @IsAvailable            BIT = 1,
    @ComboTag               NVARCHAR(100) = NULL,
    @ImageUrl               NVARCHAR(500) = NULL,
    @VariantGroup           NVARCHAR(100) = NULL,
    @VariantLabel           NVARCHAR(100) = NULL,
    @IsPriority             BIT = 0,
    @AliasesJson            NVARCHAR(MAX) = NULL,
    @SpiceLevelsJson        NVARCHAR(MAX) = NULL,
    @AddOnsJson             NVARCHAR(MAX) = NULL,
    @ComboComponentsJson    NVARCHAR(MAX) = NULL,
    @MenuItemId             INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    BEGIN TRAN;

    INSERT INTO dbo.MenuItem
        (Name, Category, Price, IsVeg, IsAvailable, ComboTag, ImageUrl, VariantGroup, VariantLabel, IsPriority)
    VALUES
        (@Name, @Category, @Price, @IsVeg, @IsAvailable, @ComboTag, @ImageUrl, @VariantGroup, @VariantLabel, @IsPriority);

    SET @MenuItemId = SCOPE_IDENTITY();

    IF @AliasesJson IS NOT NULL
        INSERT INTO dbo.MenuItemAlias (MenuItemId, Alias)
        SELECT @MenuItemId, [value] FROM OPENJSON(@AliasesJson);

    IF @SpiceLevelsJson IS NOT NULL
        INSERT INTO dbo.MenuItemSpiceLevel (MenuItemId, Level, SortOrder)
        SELECT @MenuItemId, [value], CAST([key] AS INT) FROM OPENJSON(@SpiceLevelsJson);

    IF @AddOnsJson IS NOT NULL
        INSERT INTO dbo.MenuItemAddOn (MenuItemId, Name, Price)
        SELECT @MenuItemId, j.Name, j.Price
        FROM OPENJSON(@AddOnsJson) WITH (Name NVARCHAR(150) '$.name', Price DECIMAL(12,2) '$.price') j;

    IF @ComboComponentsJson IS NOT NULL
        INSERT INTO dbo.MenuItemComboComponent (MenuItemId, Name, Qty)
        SELECT @MenuItemId, j.Name, j.Qty
        FROM OPENJSON(@ComboComponentsJson) WITH (Name NVARCHAR(150) '$.name', Qty NVARCHAR(50) '$.qty') j;

    COMMIT TRAN;
END
GO

-- Mirrors updateMenuItem in lib/store.ts: a full field replace, including
-- every child collection (deleted and reinserted from the same JSON shape
-- usp_CreateMenuItem takes) — matches the store's "{...updates, id}" swap.
CREATE PROCEDURE dbo.usp_UpdateMenuItem
    @MenuItemId             INT,
    @Name                   NVARCHAR(150),
    @Category               NVARCHAR(20),
    @Price                  DECIMAL(12,2),
    @IsVeg                  BIT,
    @IsAvailable            BIT,
    @ComboTag               NVARCHAR(100) = NULL,
    @ImageUrl               NVARCHAR(500) = NULL,
    @VariantGroup           NVARCHAR(100) = NULL,
    @VariantLabel           NVARCHAR(100) = NULL,
    @IsPriority             BIT = 0,
    @AliasesJson            NVARCHAR(MAX) = NULL,
    @SpiceLevelsJson        NVARCHAR(MAX) = NULL,
    @AddOnsJson             NVARCHAR(MAX) = NULL,
    @ComboComponentsJson    NVARCHAR(MAX) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    BEGIN TRAN;

    UPDATE dbo.MenuItem
    SET Name = @Name, Category = @Category, Price = @Price, IsVeg = @IsVeg,
        IsAvailable = @IsAvailable, ComboTag = @ComboTag, ImageUrl = @ImageUrl,
        VariantGroup = @VariantGroup, VariantLabel = @VariantLabel, IsPriority = @IsPriority
    WHERE MenuItemId = @MenuItemId;

    DELETE FROM dbo.MenuItemAlias WHERE MenuItemId = @MenuItemId;
    DELETE FROM dbo.MenuItemSpiceLevel WHERE MenuItemId = @MenuItemId;
    DELETE FROM dbo.MenuItemAddOn WHERE MenuItemId = @MenuItemId;
    DELETE FROM dbo.MenuItemComboComponent WHERE MenuItemId = @MenuItemId;

    IF @AliasesJson IS NOT NULL
        INSERT INTO dbo.MenuItemAlias (MenuItemId, Alias)
        SELECT @MenuItemId, [value] FROM OPENJSON(@AliasesJson);

    IF @SpiceLevelsJson IS NOT NULL
        INSERT INTO dbo.MenuItemSpiceLevel (MenuItemId, Level, SortOrder)
        SELECT @MenuItemId, [value], CAST([key] AS INT) FROM OPENJSON(@SpiceLevelsJson);

    IF @AddOnsJson IS NOT NULL
        INSERT INTO dbo.MenuItemAddOn (MenuItemId, Name, Price)
        SELECT @MenuItemId, j.Name, j.Price
        FROM OPENJSON(@AddOnsJson) WITH (Name NVARCHAR(150) '$.name', Price DECIMAL(12,2) '$.price') j;

    IF @ComboComponentsJson IS NOT NULL
        INSERT INTO dbo.MenuItemComboComponent (MenuItemId, Name, Qty)
        SELECT @MenuItemId, j.Name, j.Qty
        FROM OPENJSON(@ComboComponentsJson) WITH (Name NVARCHAR(150) '$.name', Qty NVARCHAR(50) '$.qty') j;

    COMMIT TRAN;
END
GO

CREATE PROCEDURE dbo.usp_SetMenuItemAvailable
    @MenuItemId     INT,
    @IsAvailable    BIT
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE dbo.MenuItem SET IsAvailable = @IsAvailable WHERE MenuItemId = @MenuItemId;
END
GO

CREATE PROCEDURE dbo.usp_SetMenuItemPriority
    @MenuItemId     INT,
    @IsPriority     BIT
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE dbo.MenuItem SET IsPriority = @IsPriority WHERE MenuItemId = @MenuItemId;
END
GO

/* ============================================================================
   STAFF CRUD
   ==========================================================================*/

CREATE PROCEDURE dbo.usp_CreateStaff
    @Name               NVARCHAR(150),
    @Role               NVARCHAR(30),
    @Title              NVARCHAR(100)   = NULL,
    @PayType            NVARCHAR(20),
    @Rate               DECIMAL(12,2)   = 0,
    @Phone              NVARCHAR(30)    = NULL,
    @CommissionType     NVARCHAR(30)    = NULL,
    @CommissionValue    DECIMAL(12,4)   = NULL,
    @StaffId            INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    INSERT INTO dbo.Staff (Name, Role, Title, PayType, Rate, Phone, CommissionType, CommissionValue, IsActive, CreatedAt)
    VALUES (@Name, @Role, @Title, @PayType, @Rate, @Phone, @CommissionType, @CommissionValue, 1, SYSUTCDATETIME());

    SET @StaffId = SCOPE_IDENTITY();
END
GO

-- Mirrors updateStaffMember (full field replace; IsActive/CreatedAt untouched
-- — this app has no staff deactivate/delete feature yet).
CREATE PROCEDURE dbo.usp_UpdateStaff
    @StaffId            INT,
    @Name               NVARCHAR(150),
    @Role               NVARCHAR(30),
    @Title              NVARCHAR(100)   = NULL,
    @PayType            NVARCHAR(20),
    @Rate               DECIMAL(12,2)   = 0,
    @Phone              NVARCHAR(30)    = NULL,
    @CommissionType     NVARCHAR(30)    = NULL,
    @CommissionValue    DECIMAL(12,4)   = NULL
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE dbo.Staff
    SET Name = @Name, Role = @Role, Title = @Title, PayType = @PayType, Rate = @Rate,
        Phone = @Phone, CommissionType = @CommissionType, CommissionValue = @CommissionValue
    WHERE StaffId = @StaffId;
END
GO

/* ============================================================================
   LEAVE & INCENTIVE RECORDS
   ============================================================================
   The app's Leave modal always does a full-field save (add or edit), rather
   than routing status changes through the narrower usp_ApproveLeaveRecord/
   usp_DeclineLeaveRecord already in database/02_procedures.sql (those stay,
   unused by the app today but harmless to keep for direct DB use).
   ==========================================================================*/

CREATE PROCEDURE dbo.usp_CreateLeaveRecord
    @StaffId        INT,
    @StartDate      DATE,
    @EndDate        DATE,
    @Reason         NVARCHAR(500),
    @Status         NVARCHAR(20),
    @IsPaid         BIT,
    @RequestedAt    DATETIME2(3) = NULL,
    @LeaveRecordId  INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    INSERT INTO dbo.LeaveRecord (StaffId, StartDate, EndDate, Reason, Status, IsPaid, RequestedAt)
    VALUES (@StaffId, @StartDate, @EndDate, @Reason, @Status, @IsPaid, @RequestedAt);

    SET @LeaveRecordId = SCOPE_IDENTITY();
END
GO

CREATE PROCEDURE dbo.usp_UpdateLeaveRecord
    @LeaveRecordId  INT,
    @StartDate      DATE,
    @EndDate        DATE,
    @Reason         NVARCHAR(500),
    @Status         NVARCHAR(20),
    @IsPaid         BIT,
    @DeclineReason  NVARCHAR(500) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE dbo.LeaveRecord
    SET StartDate = @StartDate, EndDate = @EndDate, Reason = @Reason,
        Status = @Status, IsPaid = @IsPaid, DeclineReason = @DeclineReason
    WHERE LeaveRecordId = @LeaveRecordId;
END
GO

CREATE PROCEDURE dbo.usp_DeleteLeaveRecord
    @LeaveRecordId  INT
AS
BEGIN
    SET NOCOUNT ON;
    DELETE FROM dbo.LeaveRecord WHERE LeaveRecordId = @LeaveRecordId;
END
GO

CREATE PROCEDURE dbo.usp_CreateIncentiveRecord
    @StaffId            INT,
    @Amount             DECIMAL(12,2),
    @Reason             NVARCHAR(500),
    @DateGiven          DATETIME2(3),
    @GivenBy            NVARCHAR(150) = NULL,
    @IncentiveRecordId  INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    INSERT INTO dbo.IncentiveRecord (StaffId, Amount, Reason, DateGiven, GivenBy)
    VALUES (@StaffId, @Amount, @Reason, @DateGiven, @GivenBy);

    SET @IncentiveRecordId = SCOPE_IDENTITY();
END
GO
