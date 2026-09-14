/* ============================================================================
   Delete Menu Item
   ============================================================================
   Lets an admin permanently remove a menu item — but only once it's already
   deactivated (IsAvailable = 0) and only if it has no real order/receipt
   history, so a dish that's actually been sold can never be erased from
   past bills. MenuItemAlias/SpiceLevel/AddOn/ComboComponent all cascade
   from MenuItem already (01_schema.sql); Recipe does not, so it's cleared
   explicitly here (RecipeComponent then cascades from Recipe).
   Run once against the existing database (01-08 already applied).
   ==========================================================================*/

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

CREATE PROCEDURE dbo.usp_DeleteMenuItem
    @MenuItemId INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    BEGIN TRAN;

    IF NOT EXISTS (SELECT 1 FROM dbo.MenuItem WHERE MenuItemId = @MenuItemId AND IsAvailable = 0)
        THROW 50010, 'Only a deactivated (unavailable) item can be deleted.', 1;

    IF EXISTS (SELECT 1 FROM dbo.OrderLineItem WHERE MenuItemId = @MenuItemId)
       OR EXISTS (SELECT 1 FROM dbo.ReceiptLineItem WHERE MenuItemId = @MenuItemId)
        THROW 50011, 'This item has order history and cannot be deleted.', 1;

    DELETE FROM dbo.Recipe WHERE MenuItemId = @MenuItemId;
    DELETE FROM dbo.MenuItem WHERE MenuItemId = @MenuItemId;

    COMMIT TRAN;
END
GO
