/* ============================================================================
   Personal staff PINs
   ============================================================================
   Gives every staff member their own 3-digit login PIN (Staff.Pin) instead
   of one PIN shared by everyone. Stored as plain digits by choice — with
   only 1,000 possible 3-digit PINs, hashing would add little; access to this
   database is what protects them.

   Switch-over: Pin starts NULL for everyone. Someone without a personal PIN
   logs in once with the existing shared PIN (dbo.StaffPin) and is then made
   to choose their own before they can use the app. An Admin can also set or
   reset anyone's PIN from Staff & Payroll.

   Run once against the existing database (01-11 already applied). No
   transaction is left open — it can't lock anything.
   ==========================================================================*/

USE SamakiMjiniPOS;
GO

IF COL_LENGTH('dbo.Staff', 'Pin') IS NULL
BEGIN
    ALTER TABLE dbo.Staff ADD Pin NVARCHAR(3) NULL
        CONSTRAINT CK_Staff_Pin CHECK (Pin IS NULL OR Pin LIKE '[0-9][0-9][0-9]');
END
GO

-- Check: every row should show HasPersonalPin = 0 straight after running.
SELECT StaffId, Name, Role, CASE WHEN Pin IS NULL THEN 0 ELSE 1 END AS HasPersonalPin
FROM dbo.Staff
WHERE IsActive = 1
ORDER BY Name;
GO
