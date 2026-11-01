/* ============================================================================
   Rename menu category "Drinks" -> "Soda"
   ============================================================================
   Swaps the CK_MenuItem_Category constraint to allow 'Soda' instead of
   'Drinks' and moves existing rows across.
   Run once against the existing database (01-10 already applied).
   ==========================================================================*/

USE SamakiMjiniPOS;
GO

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

BEGIN TRAN;

ALTER TABLE dbo.MenuItem DROP CONSTRAINT CK_MenuItem_Category;

UPDATE dbo.MenuItem SET Category = 'Soda' WHERE Category = 'Drinks';

ALTER TABLE dbo.MenuItem ADD CONSTRAINT CK_MenuItem_Category
    CHECK (Category IN ('Main','Extra','Soda','Water','Juice','Packaging'));

COMMIT TRAN;
GO
