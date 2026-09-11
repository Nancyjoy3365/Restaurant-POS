/* ============================================================================
   Vendors & Inventory — API-backing migration
   ============================================================================
   Adds the columns/procedures needed to move Vendor, Ingredient,
   StockPurchase and VendorPayment off the browser-only Zustand store and
   onto this database, so changes made on one device show up on every
   device. Run this once against the existing database (01/02 already
   applied) — it only adds things, nothing here drops or rewrites data.
   ==========================================================================*/

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

/* ----------------------------------------------------------------------
   dbo.Vendor was missing the contact/payment-terms fields the app's
   Vendor type already carries (AddVendorModal.tsx) — 01_schema.sql only
   had Name/Category/IsActive.
   ------------------------------------------------------------------- */
ALTER TABLE dbo.Vendor ADD
    ContactPerson   NVARCHAR(150)   NULL,
    Phone           NVARCHAR(30)    NULL,
    PaymentTerms    NVARCHAR(20)    NULL
                                     CONSTRAINT DF_Vendor_PaymentTerms DEFAULT ('net-30')
                                     CONSTRAINT CK_Vendor_PaymentTerms CHECK (PaymentTerms IN ('due-on-receipt','net-15','net-30','net-60'));
GO

/* ============================================================================
   VENDOR CRUD
   ==========================================================================*/

CREATE PROCEDURE dbo.usp_CreateVendor
    @Name           NVARCHAR(150),
    @Category       NVARCHAR(100),
    @ContactPerson  NVARCHAR(150) = NULL,
    @Phone          NVARCHAR(30)  = NULL,
    @PaymentTerms   NVARCHAR(20)  = 'net-30',
    @VendorId       INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    INSERT INTO dbo.Vendor (Name, Category, IsActive, ContactPerson, Phone, PaymentTerms)
    VALUES (@Name, @Category, 1, @ContactPerson, @Phone, @PaymentTerms);

    SET @VendorId = SCOPE_IDENTITY();
END
GO

-- Mirrors updateVendor in lib/store.ts (full field replace, IsActive untouched).
CREATE PROCEDURE dbo.usp_UpdateVendor
    @VendorId       INT,
    @Name           NVARCHAR(150),
    @Category       NVARCHAR(100),
    @ContactPerson  NVARCHAR(150) = NULL,
    @Phone          NVARCHAR(30)  = NULL,
    @PaymentTerms   NVARCHAR(20)  = 'net-30'
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE dbo.Vendor
    SET Name = @Name, Category = @Category,
        ContactPerson = @ContactPerson, Phone = @Phone, PaymentTerms = @PaymentTerms
    WHERE VendorId = @VendorId;
END
GO

-- Replaces the original usp_SetVendorActive (database/02_procedures.sql) with
-- a version that enforces server-side what the UI already enforces
-- client-side (app/settings/vendors/page.tsx disables the button while a
-- balance is owed) — now that other devices can race the same vendor, that
-- guard has to hold at the database too, not just in one browser's button.
CREATE OR ALTER PROCEDURE dbo.usp_SetVendorActive
    @VendorId   INT,
    @IsActive   BIT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF @IsActive = 0 AND EXISTS (
        SELECT 1 FROM dbo.vw_VendorBalanceOwed WHERE VendorId = @VendorId AND BalanceOwed > 0
    )
        THROW 50006, 'Settle the balance owed before deactivating this vendor.', 1;

    UPDATE dbo.Vendor SET IsActive = @IsActive WHERE VendorId = @VendorId;
END
GO

/* ============================================================================
   INGREDIENT CRUD
   ==========================================================================*/

CREATE PROCEDURE dbo.usp_CreateIngredient
    @Name               NVARCHAR(150),
    @Packaging          NVARCHAR(50),
    @Quantity           DECIMAL(12,2),
    @PiecesPerPackage   DECIMAL(12,2),
    @TotalCost          DECIMAL(12,2),
    @Unit               NVARCHAR(20),
    @UnitAmount         DECIMAL(12,2),
    @ReorderThreshold   DECIMAL(12,2),
    @UnitCost           DECIMAL(12,4),
    @PurchasedAt        DATETIME2(3) = NULL,
    @IngredientId       INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    INSERT INTO dbo.Ingredient
        (Name, Packaging, Quantity, PiecesPerPackage, TotalCost, Unit, UnitAmount, ReorderThreshold, UnitCost, PurchasedAt)
    VALUES
        (@Name, @Packaging, @Quantity, @PiecesPerPackage, @TotalCost, @Unit, @UnitAmount, @ReorderThreshold, @UnitCost, @PurchasedAt);

    SET @IngredientId = SCOPE_IDENTITY();
END
GO

-- Mirrors updateIngredient in lib/store.ts (full field replace).
CREATE PROCEDURE dbo.usp_UpdateIngredient
    @IngredientId       INT,
    @Name               NVARCHAR(150),
    @Packaging          NVARCHAR(50),
    @Quantity           DECIMAL(12,2),
    @PiecesPerPackage   DECIMAL(12,2),
    @TotalCost          DECIMAL(12,2),
    @Unit               NVARCHAR(20),
    @UnitAmount         DECIMAL(12,2),
    @ReorderThreshold   DECIMAL(12,2),
    @UnitCost           DECIMAL(12,4),
    @PurchasedAt        DATETIME2(3) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE dbo.Ingredient
    SET Name = @Name, Packaging = @Packaging, Quantity = @Quantity,
        PiecesPerPackage = @PiecesPerPackage, TotalCost = @TotalCost, Unit = @Unit,
        UnitAmount = @UnitAmount, ReorderThreshold = @ReorderThreshold,
        UnitCost = @UnitCost, PurchasedAt = @PurchasedAt
    WHERE IngredientId = @IngredientId;
END
GO
