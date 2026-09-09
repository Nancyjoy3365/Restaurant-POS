/* ============================================================================
   Samaki Mjini Restaurant POS — views, functions & stored procedures
   ============================================================================
   Run 01_schema.sql first. Every procedure here mirrors a specific action
   in lib/store.ts (named in each header comment) so backend behavior stays
   traceable back to the app logic it replaces.

   Safety net: every write procedure sets XACT_ABORT ON, so any runtime
   error auto-rolls-back the whole transaction rather than leaving it
   half-applied — deliberately kept lighter than TRY/CATCH-per-proc so the
   business logic itself stays easy to read.
   ==========================================================================*/

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

/* ============================================================================
   VIEWS
   ==========================================================================*/

-- Mirrors computeWaiterCashAllTime in app/cashier/page.tsx: every waiter's
-- all-time cash/M-Pesa-substitution exposure vs. what's actually been
-- dropped. Pending never resets at midnight — it carries forward until an
-- actual CashDrop clears it.
CREATE VIEW dbo.vw_WaiterCashAllTime
AS
SELECT
    s.StaffId AS WaiterId,
    ISNULL(mp.MpesaAmount, 0) AS MpesaAmount,
    ISNULL(cp.CashAmount, 0) AS CashAmount,
    ISNULL(sub.SubstitutionAmount, 0) AS SubstitutionAmount,
    ISNULL(cp.CashAmount, 0) + ISNULL(sub.SubstitutionAmount, 0) AS ExpectedDrop,
    ISNULL(cd.DropAmount, 0) AS DropAmount,
    CASE
        WHEN (ISNULL(cp.CashAmount, 0) + ISNULL(sub.SubstitutionAmount, 0) - ISNULL(cd.DropAmount, 0)) > 0
        THEN (ISNULL(cp.CashAmount, 0) + ISNULL(sub.SubstitutionAmount, 0) - ISNULL(cd.DropAmount, 0))
        ELSE 0
    END AS Pending
FROM dbo.Staff s
OUTER APPLY (
    SELECT SUM(Amount) AS MpesaAmount FROM dbo.Payment WHERE WaiterId = s.StaffId AND Method = 'mpesa'
) mp
OUTER APPLY (
    SELECT SUM(Amount) AS CashAmount FROM dbo.Payment WHERE WaiterId = s.StaffId AND Method = 'cash'
) cp
OUTER APPLY (
    SELECT SUM(Amount) AS SubstitutionAmount FROM dbo.Payment
    WHERE WaiterId = s.StaffId AND Method = 'mpesa' AND IsCashSubstitution = 1
) sub
OUTER APPLY (
    SELECT SUM(Amount) AS DropAmount FROM dbo.CashDrop WHERE WaiterId = s.StaffId
) cd
WHERE s.Role = 'Waiter';
GO

-- Vendor balance-owed = unpaid StockPurchase rows (see recordVendorPayout —
-- a payment only ever fully settles whole purchases, oldest first, so this
-- is always exact, never a running partial remainder).
CREATE VIEW dbo.vw_VendorBalanceOwed
AS
SELECT VendorId, SUM(TotalCost) AS BalanceOwed
FROM dbo.StockPurchase
WHERE IsPaid = 0
GROUP BY VendorId;
GO

-- Mirrors the Cashier "Orders Awaiting Payment" queue in app/cashier/page.tsx:
-- billing has started (Total is set) and the order isn't fully/verifiably
-- paid yet, while the order is still open.
CREATE VIEW dbo.vw_OrdersAwaitingPayment
AS
SELECT
    t.OrderId, t.DisplayNumber, t.WaiterId, t.OrderType, t.CustomerName,
    o.OrderDetailId, o.Total, o.PaymentStatus
FROM dbo.[Order] t
INNER JOIN dbo.OrderDetail o ON o.OrderId = t.OrderId
WHERE t.Status = 'open' AND o.Total IS NOT NULL AND o.PaymentStatus <> 'paid';
GO

/* ============================================================================
   FUNCTIONS
   ==========================================================================*/

-- Mirrors cyclePaidAmount / verifiedCyclePaidAmount in lib/store.ts: every
-- Payment belonging to an OrderDetail's *current* billing cycle
-- (BillingCycle = BilledThroughRoundIndex + 1), optionally excluding an
-- M-Pesa payment with no confirmation code — those must never be enough on
-- their own to mark an order "paid" (see usp_RecordPayment).
CREATE FUNCTION dbo.fn_CyclePayments (@OrderDetailId INT, @OnlyVerified BIT)
RETURNS TABLE
AS
RETURN
(
    SELECT p.*
    FROM dbo.Payment p
    INNER JOIN dbo.OrderDetail o ON o.OrderDetailId = p.OrderDetailId
    WHERE p.OrderDetailId = @OrderDetailId
      AND p.BillingCycle = o.BilledThroughRoundIndex + 1
      AND (@OnlyVerified = 0 OR p.Method <> 'mpesa' OR LTRIM(RTRIM(ISNULL(p.Reference, ''))) <> '')
);
GO

-- Mirrors computeWaiterCashFrom scoped to a date range (rangePayments /
-- rangeDrops in app/cashier/page.tsx's Day/Week reconciliation view).
CREATE FUNCTION dbo.fn_WaiterCashInRange (@FromDate DATE, @ToDate DATE)
RETURNS TABLE
AS
RETURN
(
    SELECT
        s.StaffId AS WaiterId,
        ISNULL(mp.MpesaAmount, 0) AS MpesaAmount,
        ISNULL(cp.CashAmount, 0) AS CashAmount,
        ISNULL(sub.SubstitutionAmount, 0) AS SubstitutionAmount,
        ISNULL(cp.CashAmount, 0) + ISNULL(sub.SubstitutionAmount, 0) AS ExpectedDrop,
        ISNULL(cd.DropAmount, 0) AS DropAmount
    FROM dbo.Staff s
    OUTER APPLY (
        SELECT SUM(Amount) AS MpesaAmount FROM dbo.Payment
        WHERE WaiterId = s.StaffId AND Method = 'mpesa' AND CAST(PaidAt AS DATE) BETWEEN @FromDate AND @ToDate
    ) mp
    OUTER APPLY (
        SELECT SUM(Amount) AS CashAmount FROM dbo.Payment
        WHERE WaiterId = s.StaffId AND Method = 'cash' AND CAST(PaidAt AS DATE) BETWEEN @FromDate AND @ToDate
    ) cp
    OUTER APPLY (
        SELECT SUM(Amount) AS SubstitutionAmount FROM dbo.Payment
        WHERE WaiterId = s.StaffId AND Method = 'mpesa' AND IsCashSubstitution = 1
              AND CAST(PaidAt AS DATE) BETWEEN @FromDate AND @ToDate
    ) sub
    OUTER APPLY (
        SELECT SUM(Amount) AS DropAmount FROM dbo.CashDrop
        WHERE WaiterId = s.StaffId AND CAST(DroppedAt AS DATE) BETWEEN @FromDate AND @ToDate
    ) cd
    WHERE s.Role = 'Waiter'
);
GO

/* ============================================================================
   ORDER-TAKING
   ==========================================================================*/

-- Mirrors createTicket in lib/store.ts (renamed here to the Order/OrderDetail
-- terminology used throughout this schema).
CREATE PROCEDURE dbo.usp_CreateOrder
    @WaiterId       INT,
    @OrderType      NVARCHAR(20)  = 'dine_in',
    @LocationNote   NVARCHAR(200) = NULL,
    @CustomerName   NVARCHAR(150) = NULL,
    @CustomerPhone  NVARCHAR(30)  = NULL,
    @OrderId        INT OUTPUT,
    @DisplayNumber  INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    BEGIN TRAN;

    SET @DisplayNumber = NEXT VALUE FOR dbo.Seq_OrderDisplayNumber;

    INSERT INTO dbo.[Order] (DisplayNumber, WaiterId, LocationNote, OrderType, CustomerName, CustomerPhone, Status, OpenedAt)
    VALUES (@DisplayNumber, @WaiterId, @LocationNote, @OrderType, @CustomerName, @CustomerPhone, 'open', SYSUTCDATETIME());

    SET @OrderId = SCOPE_IDENTITY();

    INSERT INTO dbo.OrderDetail (OrderId, WaiterId, PaymentStatus, OnHold, BilledThroughRoundIndex)
    VALUES (@OrderId, @WaiterId, 'unpaid', 0, 0);

    COMMIT TRAN;
END
GO

-- Starts (or continues into) the next round of items for an order.
CREATE PROCEDURE dbo.usp_StartOrderRound
    @OrderDetailId  INT,
    @RoundId        INT OUTPUT,
    @RoundIndex     INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    BEGIN TRAN;

    SELECT @RoundIndex = ISNULL(MAX(RoundIndex), 0) + 1
    FROM dbo.[Round] WITH (UPDLOCK, HOLDLOCK)
    WHERE OrderDetailId = @OrderDetailId;

    INSERT INTO dbo.[Round] (OrderDetailId, RoundIndex, CreatedAt)
    VALUES (@OrderDetailId, @RoundIndex, SYSUTCDATETIME());

    SET @RoundId = SCOPE_IDENTITY();
    COMMIT TRAN;
END
GO

-- Adds one line item (+ optional add-ons) to a round.
-- @AddOnsJson example: '[{"name":"Extra Ugali","price":50}]'
CREATE PROCEDURE dbo.usp_AddOrderLineItem
    @RoundId            INT,
    @MenuItemId         INT,
    @Name               NVARCHAR(150),
    @Price              DECIMAL(12,2),
    @Qty                DECIMAL(8,2),
    @IsVeg              BIT,
    @ComboTag           NVARCHAR(100) = NULL,
    @SpiceLevel         NVARCHAR(50)  = NULL,
    @Note               NVARCHAR(500) = NULL,
    @AddOnsJson         NVARCHAR(MAX) = NULL,
    @OrderLineItemId    INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    BEGIN TRAN;

    INSERT INTO dbo.OrderLineItem
        (RoundId, MenuItemId, Name, Price, Qty, IsVeg, ComboTag, SpiceLevel, Note, SentToKitchen, KitchenReady)
    VALUES
        (@RoundId, @MenuItemId, @Name, @Price, @Qty, @IsVeg, @ComboTag, @SpiceLevel, @Note, 0, 0);

    SET @OrderLineItemId = SCOPE_IDENTITY();

    IF @AddOnsJson IS NOT NULL
    BEGIN
        INSERT INTO dbo.OrderLineItemAddOn (OrderLineItemId, Name, Price)
        SELECT @OrderLineItemId, j.Name, j.Price
        FROM OPENJSON(@AddOnsJson) WITH (Name NVARCHAR(150) '$.name', Price DECIMAL(12,2) '$.price') j;
    END

    COMMIT TRAN;
END
GO

-- Mirrors sendRoundToKitchen.
CREATE PROCEDURE dbo.usp_SendRoundToKitchen
    @RoundId INT
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE dbo.[Round] SET SentAt = SYSUTCDATETIME() WHERE RoundId = @RoundId AND SentAt IS NULL;
    UPDATE dbo.OrderLineItem SET SentToKitchen = 1 WHERE RoundId = @RoundId;
END
GO

-- Mirrors the Kitchen Display marking an item ready.
CREATE PROCEDURE dbo.usp_MarkLineItemReady
    @OrderLineItemId INT
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE dbo.OrderLineItem SET KitchenReady = 1 WHERE OrderLineItemId = @OrderLineItemId;
END
GO

/* ============================================================================
   BILLING & PAYMENTS
   ==========================================================================*/

-- Mirrors startBilling in lib/store.ts: totals every unbilled round
-- (RoundIndex > BilledThroughRoundIndex) using the same VAT-inclusive
-- rounding as calcBill() in lib/utils.ts, then derives PaymentStatus from
-- whatever's already verifiably paid in the current cycle.
CREATE PROCEDURE dbo.usp_StartBilling
    @OrderDetailId  INT,
    @VatRate        DECIMAL(5,4)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    BEGIN TRAN;

    DECLARE @BilledThrough INT;
    SELECT @BilledThrough = BilledThroughRoundIndex FROM dbo.OrderDetail WHERE OrderDetailId = @OrderDetailId;

    DECLARE @RawTotal DECIMAL(18,4);
    SELECT @RawTotal = ISNULL(SUM((oli.Price + ISNULL(ao.AddOnTotal, 0)) * oli.Qty), 0)
    FROM dbo.[Round] r
    INNER JOIN dbo.OrderLineItem oli ON oli.RoundId = r.RoundId
    OUTER APPLY (
        SELECT SUM(Price) AS AddOnTotal FROM dbo.OrderLineItemAddOn WHERE OrderLineItemId = oli.OrderLineItemId
    ) ao
    WHERE r.OrderDetailId = @OrderDetailId AND r.RoundIndex > @BilledThrough;

    DECLARE @Subtotal DECIMAL(12,2) = ROUND(@RawTotal, 0);
    DECLARE @Vat      DECIMAL(12,2) = ROUND(@Subtotal * @VatRate, 0);
    DECLARE @Total    DECIMAL(12,2) = @Subtotal + @Vat;

    DECLARE @PaidForCycle DECIMAL(12,2);
    SELECT @PaidForCycle = ISNULL(SUM(Amount), 0) FROM dbo.fn_CyclePayments(@OrderDetailId, 1);

    DECLARE @PaymentStatus NVARCHAR(20) =
        CASE WHEN @Total > 0 AND @PaidForCycle >= @Total THEN 'paid'
             WHEN @PaidForCycle > 0 THEN 'partially_paid'
             ELSE 'unpaid' END;

    UPDATE dbo.OrderDetail
    SET Subtotal = @Subtotal, Vat = @Vat, Total = @Total, OnHold = 0, PaymentStatus = @PaymentStatus
    WHERE OrderDetailId = @OrderDetailId;

    COMMIT TRAN;
END
GO

-- Mirrors recordPayment in lib/store.ts. Crucially: an 'mpesa' payment with
-- no Reference code is recorded (so the cashier can see and match it) but
-- never counts toward PaymentStatus flipping to 'paid' on its own — that
-- would silently skip the cashier's Awaiting Payment verification step.
-- See usp_ConfirmOrderComplete for how the cashier overrides that manually.
CREATE PROCEDURE dbo.usp_RecordPayment
    @OrderDetailId      INT,
    @OrderId            INT,
    @Method             NVARCHAR(10),
    @Amount             DECIMAL(12,2),
    @Reference          NVARCHAR(100) = '',
    @CustomerName       NVARCHAR(150) = NULL,
    @IsCashSubstitution BIT = NULL,
    @CollectedByStaffId INT = NULL,
    @PaymentId          INT OUTPUT,
    @NewPaymentStatus   NVARCHAR(20) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    BEGIN TRAN;

    DECLARE @WaiterId INT, @BilledThrough INT, @Total DECIMAL(12,2);
    SELECT @WaiterId = WaiterId, @BilledThrough = BilledThroughRoundIndex, @Total = ISNULL(Total, 0)
    FROM dbo.OrderDetail WITH (UPDLOCK, HOLDLOCK)
    WHERE OrderDetailId = @OrderDetailId;

    DECLARE @Cycle INT = @BilledThrough + 1;

    INSERT INTO dbo.Payment
        (OrderDetailId, OrderId, WaiterId, CollectedByStaffId, Method, Amount, Reference, CustomerName, IsCashSubstitution, BillingCycle, PaidAt)
    VALUES
        (@OrderDetailId, @OrderId, @WaiterId, @CollectedByStaffId, @Method, @Amount, ISNULL(@Reference, ''), @CustomerName,
         CASE WHEN @Method = 'mpesa' THEN @IsCashSubstitution ELSE NULL END, @Cycle, SYSUTCDATETIME());

    SET @PaymentId = SCOPE_IDENTITY();

    DECLARE @VerifiedPaid DECIMAL(12,2);
    SELECT @VerifiedPaid = ISNULL(SUM(Amount), 0) FROM dbo.fn_CyclePayments(@OrderDetailId, 1);

    SET @NewPaymentStatus =
        CASE WHEN @Total > 0 AND @VerifiedPaid >= @Total THEN 'paid'
             WHEN @VerifiedPaid > 0 THEN 'partially_paid'
             ELSE 'unpaid' END;

    UPDATE dbo.OrderDetail SET PaymentStatus = @NewPaymentStatus WHERE OrderDetailId = @OrderDetailId;

    IF @NewPaymentStatus = 'paid'
        UPDATE dbo.[Order] SET Status = 'paid', ClosedAt = SYSUTCDATETIME() WHERE OrderId = @OrderId;

    COMMIT TRAN;
END
GO

-- Mirrors reverseLastPayment: removes the most recent payment in the
-- order's current billing cycle and re-derives PaymentStatus/Order.Status.
CREATE PROCEDURE dbo.usp_ReverseLastPayment
    @OrderDetailId INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    BEGIN TRAN;

    DECLARE @OrderId INT, @BilledThrough INT, @Total DECIMAL(12,2);
    SELECT @OrderId = OrderId, @BilledThrough = BilledThroughRoundIndex, @Total = ISNULL(Total, 0)
    FROM dbo.OrderDetail WITH (UPDLOCK, HOLDLOCK)
    WHERE OrderDetailId = @OrderDetailId;

    DECLARE @Cycle INT = @BilledThrough + 1;

    DECLARE @LastPaymentId INT;
    SELECT TOP (1) @LastPaymentId = PaymentId
    FROM dbo.Payment
    WHERE OrderDetailId = @OrderDetailId AND BillingCycle = @Cycle
    ORDER BY PaidAt DESC, PaymentId DESC;

    IF @LastPaymentId IS NULL
    BEGIN
        ROLLBACK TRAN;
        RETURN;
    END

    DELETE FROM dbo.Payment WHERE PaymentId = @LastPaymentId;

    DECLARE @VerifiedPaid DECIMAL(12,2);
    SELECT @VerifiedPaid = ISNULL(SUM(Amount), 0) FROM dbo.fn_CyclePayments(@OrderDetailId, 1);

    DECLARE @PaymentStatus NVARCHAR(20) =
        CASE WHEN @Total > 0 AND @VerifiedPaid >= @Total THEN 'paid'
             WHEN @VerifiedPaid > 0 THEN 'partially_paid'
             ELSE 'unpaid' END;

    UPDATE dbo.OrderDetail SET PaymentStatus = @PaymentStatus WHERE OrderDetailId = @OrderDetailId;

    IF @PaymentStatus <> 'paid'
        UPDATE dbo.[Order] SET Status = 'open', ClosedAt = NULL WHERE OrderId = @OrderId;

    COMMIT TRAN;
END
GO

-- Mirrors reverseCompletedPayment: reopens an already-closed/paid order by
-- undoing one specific historical payment (identified by id), rolling
-- BilledThroughRoundIndex back to that payment's own cycle so anything
-- recorded afterward lines up again.
-- NOTE: matches the app exactly, which sums the cycle's *remaining*
-- payments without excluding an unverified M-Pesa one here (unlike
-- usp_RecordPayment / usp_ReverseLastPayment) — tighten both together if
-- that's ever unified.
CREATE PROCEDURE dbo.usp_ReverseCompletedPayment
    @PaymentId INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    BEGIN TRAN;

    DECLARE @OrderDetailId INT, @OrderId INT, @Cycle INT;
    SELECT @OrderDetailId = OrderDetailId, @OrderId = OrderId, @Cycle = BillingCycle
    FROM dbo.Payment WHERE PaymentId = @PaymentId;

    IF @OrderDetailId IS NULL
    BEGIN
        ROLLBACK TRAN;
        RETURN;
    END

    DELETE FROM dbo.Payment WHERE PaymentId = @PaymentId;

    DECLARE @Total DECIMAL(12,2);
    SELECT @Total = ISNULL(Total, 0) FROM dbo.OrderDetail WHERE OrderDetailId = @OrderDetailId;

    DECLARE @SameCyclePaid DECIMAL(12,2);
    SELECT @SameCyclePaid = ISNULL(SUM(Amount), 0)
    FROM dbo.Payment
    WHERE OrderId = @OrderId AND BillingCycle = @Cycle;

    DECLARE @PaymentStatus NVARCHAR(20) =
        CASE WHEN @Total > 0 AND @SameCyclePaid >= @Total THEN 'paid'
             WHEN @SameCyclePaid > 0 THEN 'partially_paid'
             ELSE 'unpaid' END;

    UPDATE dbo.OrderDetail
    SET PaymentStatus = @PaymentStatus,
        BilledThroughRoundIndex = CASE WHEN @Cycle - 1 < 0 THEN 0 ELSE @Cycle - 1 END
    WHERE OrderDetailId = @OrderDetailId;

    UPDATE dbo.[Order] SET Status = 'open', ClosedAt = NULL WHERE OrderId = @OrderId;

    COMMIT TRAN;
END
GO

-- Mirrors confirmOrderComplete: the cashier's manual "Complete" action on
-- an order already fully covered by amount even when the covering M-Pesa
-- payment never got a confirmation code — clicking Complete IS the
-- verification recordPayment alone can't perform.
CREATE PROCEDURE dbo.usp_ConfirmOrderComplete
    @OrderDetailId INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    BEGIN TRAN;

    DECLARE @OrderId INT;
    SELECT @OrderId = OrderId FROM dbo.OrderDetail WHERE OrderDetailId = @OrderDetailId;

    UPDATE dbo.OrderDetail SET PaymentStatus = 'paid' WHERE OrderDetailId = @OrderDetailId;
    UPDATE dbo.[Order] SET Status = 'paid', ClosedAt = SYSUTCDATETIME() WHERE OrderId = @OrderId;

    COMMIT TRAN;
END
GO

-- Mirrors finalizeReceipt: snapshots every unbilled round's items and the
-- current cycle's payments into a Receipt, then advances
-- BilledThroughRoundIndex past them so a closed cycle's total can never
-- drift. @QrDataUrl is NULL here — the app calls its (currently simulated)
-- eTIMS signing integration around this call and saves the result with
-- usp_SetReceiptQrCode.
CREATE PROCEDURE dbo.usp_FinalizeReceipt
    @OrderDetailId  INT,
    @QrDataUrl      NVARCHAR(MAX) = NULL,
    @ReceiptId      INT OUTPUT,
    @InvoiceNumber  NVARCHAR(50) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    BEGIN TRAN;

    DECLARE @OrderId INT, @BilledThrough INT, @Subtotal DECIMAL(12,2), @Vat DECIMAL(12,2), @Total DECIMAL(12,2);
    SELECT @OrderId = OrderId, @BilledThrough = BilledThroughRoundIndex,
           @Subtotal = ISNULL(Subtotal, 0), @Vat = ISNULL(Vat, 0), @Total = ISNULL(Total, 0)
    FROM dbo.OrderDetail WITH (UPDLOCK, HOLDLOCK)
    WHERE OrderDetailId = @OrderDetailId;

    DECLARE @DisplayNumber INT, @OrderType NVARCHAR(20), @CustomerName NVARCHAR(150), @LocationNote NVARCHAR(200);
    SELECT @DisplayNumber = DisplayNumber, @OrderType = OrderType, @CustomerName = CustomerName, @LocationNote = LocationNote
    FROM dbo.[Order] WHERE OrderId = @OrderId;

    DECLARE @OrderLabel NVARCHAR(100) = CONCAT('Order No. ', @DisplayNumber);
    DECLARE @ReceiptLocationNote NVARCHAR(200) =
        CASE WHEN @OrderType = 'takeaway' THEN ISNULL(@CustomerName, 'Takeaway') ELSE @LocationNote END;

    SET @InvoiceNumber = CONCAT('KRA-ETIMS-', NEXT VALUE FOR dbo.Seq_InvoiceNumber);

    INSERT INTO dbo.Receipt (InvoiceNumber, OrderId, OrderLabel, LocationNote, Subtotal, Vat, Total, QrDataUrl, IssuedAt)
    VALUES (@InvoiceNumber, @OrderId, @OrderLabel, @ReceiptLocationNote, @Subtotal, @Vat, @Total, @QrDataUrl, SYSUTCDATETIME());

    SET @ReceiptId = SCOPE_IDENTITY();

    INSERT INTO dbo.ReceiptLineItem (ReceiptId, MenuItemId, Name, Qty, Price, LineTotal, RoundIndex)
    SELECT
        @ReceiptId, oli.MenuItemId, oli.Name, oli.Qty,
        oli.Price + ISNULL(ao.AddOnTotal, 0),
        (oli.Price + ISNULL(ao.AddOnTotal, 0)) * oli.Qty,
        r.RoundIndex
    FROM dbo.[Round] r
    INNER JOIN dbo.OrderLineItem oli ON oli.RoundId = r.RoundId
    OUTER APPLY (
        SELECT SUM(Price) AS AddOnTotal FROM dbo.OrderLineItemAddOn WHERE OrderLineItemId = oli.OrderLineItemId
    ) ao
    WHERE r.OrderDetailId = @OrderDetailId AND r.RoundIndex > @BilledThrough;

    DECLARE @Cycle INT = @BilledThrough + 1;

    INSERT INTO dbo.ReceiptPaymentLine (ReceiptId, Method, Amount, Reference, CustomerName)
    SELECT @ReceiptId, Method, Amount, Reference, CustomerName
    FROM dbo.Payment
    WHERE OrderDetailId = @OrderDetailId AND BillingCycle = @Cycle;

    DECLARE @TotalRounds INT;
    SELECT @TotalRounds = COUNT(*) FROM dbo.[Round] WHERE OrderDetailId = @OrderDetailId;

    UPDATE dbo.OrderDetail SET BilledThroughRoundIndex = @TotalRounds WHERE OrderDetailId = @OrderDetailId;

    COMMIT TRAN;
END
GO

-- Saves the QR code produced by the (external, simulated) eTIMS signing
-- call the app makes around usp_FinalizeReceipt.
CREATE PROCEDURE dbo.usp_SetReceiptQrCode
    @ReceiptId  INT,
    @QrDataUrl  NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE dbo.Receipt SET QrDataUrl = @QrDataUrl WHERE ReceiptId = @ReceiptId;
END
GO

/* ============================================================================
   CASH RECONCILIATION
   ==========================================================================*/

-- Mirrors submitCashDrop's per-waiter path in app/cashier/page.tsx: a
-- partial drop needs no explanation, but an overage (Amount > Expected)
-- requires a Note, and an 'mpesa' drop requires a Reference.
CREATE PROCEDURE dbo.usp_RecordCashDrop
    @WaiterId       INT,
    @Amount         DECIMAL(12,2),
    @ExpectedAmount DECIMAL(12,2),
    @Method         NVARCHAR(10),
    @Reference      NVARCHAR(100) = NULL,
    @Note           NVARCHAR(500) = NULL,
    @CashDropId     INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF @Amount <= 0
        THROW 50001, 'Cash drop amount must be greater than zero.', 1;

    IF @Method = 'mpesa' AND LTRIM(RTRIM(ISNULL(@Reference, ''))) = ''
        THROW 50002, 'An M-Pesa reference code is required for this method.', 1;

    IF @Amount > @ExpectedAmount AND LTRIM(RTRIM(ISNULL(@Note, ''))) = ''
        THROW 50003, 'A note is required when the amount dropped exceeds what was expected.', 1;

    INSERT INTO dbo.CashDrop (WaiterId, Amount, ExpectedAmount, Method, Reference, Note, DroppedAt)
    VALUES (
        @WaiterId, @Amount, @ExpectedAmount, @Method,
        CASE WHEN @Method = 'mpesa' THEN NULLIF(LTRIM(RTRIM(@Reference)), '') ELSE NULL END,
        CASE WHEN @Amount > @ExpectedAmount THEN NULLIF(LTRIM(RTRIM(@Note)), '') ELSE NULL END,
        SYSUTCDATETIME()
    );

    SET @CashDropId = SCOPE_IDENTITY();
END
GO

-- Mirrors the header-level "Add Cash Drop" lumpsum flow in
-- app/cashier/page.tsx: one drop per waiter with a pending balance, only
-- accepted when @Amount matches the combined total across all of them
-- exactly — a mismatch belongs on that specific waiter's own row instead.
CREATE PROCEDURE dbo.usp_RecordCashDropLumpsum
    @Amount     DECIMAL(12,2),
    @Method     NVARCHAR(10),
    @Reference  NVARCHAR(100) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF @Method = 'mpesa' AND LTRIM(RTRIM(ISNULL(@Reference, ''))) = ''
        THROW 50002, 'An M-Pesa reference code is required for this method.', 1;

    DECLARE @PendingTotal DECIMAL(12,2);
    SELECT @PendingTotal = ISNULL(SUM(Pending), 0) FROM dbo.vw_WaiterCashAllTime WHERE Pending > 0;

    IF @PendingTotal <= 0 OR @Amount <> @PendingTotal
        THROW 50004, 'A lumpsum cash drop must exactly match the combined total owed across all waiters.', 1;

    BEGIN TRAN;

    INSERT INTO dbo.CashDrop (WaiterId, Amount, ExpectedAmount, Method, Reference, Note, DroppedAt)
    SELECT
        WaiterId, Pending, Pending, @Method,
        CASE WHEN @Method = 'mpesa' THEN NULLIF(LTRIM(RTRIM(@Reference)), '') ELSE NULL END,
        NULL, SYSUTCDATETIME()
    FROM dbo.vw_WaiterCashAllTime
    WHERE Pending > 0;

    COMMIT TRAN;
END
GO

CREATE PROCEDURE dbo.usp_DeleteCashDrop
    @CashDropId INT
AS
BEGIN
    SET NOCOUNT ON;
    DELETE FROM dbo.CashDrop WHERE CashDropId = @CashDropId;
END
GO

/* ============================================================================
   INVENTORY & VENDORS
   ==========================================================================*/

-- Mirrors recordStockPurchase: appends the ledger line (unpaid by default)
-- and folds it into the ingredient's on-hand quantity/last-cost basis.
CREATE PROCEDURE dbo.usp_RecordStockPurchase
    @VendorId           INT,
    @IngredientId       INT,
    @Quantity           DECIMAL(12,2),
    @UnitCost           DECIMAL(12,4),
    @TotalCost          DECIMAL(12,2),
    @StockPurchaseId    INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    BEGIN TRAN;

    INSERT INTO dbo.StockPurchase (VendorId, IngredientId, Quantity, UnitCost, TotalCost, PurchasedAt, IsPaid)
    VALUES (@VendorId, @IngredientId, @Quantity, @UnitCost, @TotalCost, SYSUTCDATETIME(), 0);

    SET @StockPurchaseId = SCOPE_IDENTITY();

    UPDATE dbo.Ingredient
    SET Quantity = Quantity + @Quantity,
        UnitCost = @UnitCost,
        TotalCost = @TotalCost,
        PurchasedAt = SYSUTCDATETIME()
    WHERE IngredientId = @IngredientId;

    COMMIT TRAN;
END
GO

-- Mirrors recordVendorPayout exactly: oldest-first, and a payout only
-- marks a purchase paid when it fully covers that purchase's TotalCost —
-- there is no partial-purchase state, only whole purchases.
CREATE PROCEDURE dbo.usp_RecordVendorPayout
    @VendorId           INT,
    @Amount             DECIMAL(12,2),
    @Method             NVARCHAR(10),
    @Reference          NVARCHAR(100) = NULL,
    @VendorPaymentId    INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF @Amount <= 0
        THROW 50001, 'Payout amount must be greater than zero.', 1;

    BEGIN TRAN;

    INSERT INTO dbo.VendorPayment (VendorId, Amount, Method, Reference, PaidAt)
    VALUES (
        @VendorId, @Amount, @Method,
        CASE WHEN @Method = 'mpesa' THEN NULLIF(LTRIM(RTRIM(@Reference)), '') ELSE NULL END,
        SYSUTCDATETIME()
    );

    SET @VendorPaymentId = SCOPE_IDENTITY();

    ;WITH UnpaidOldestFirst AS (
        SELECT
            StockPurchaseId,
            TotalCost,
            SUM(TotalCost) OVER (ORDER BY PurchasedAt ASC, StockPurchaseId ASC ROWS UNBOUNDED PRECEDING) AS RunningTotal
        FROM dbo.StockPurchase
        WHERE VendorId = @VendorId AND IsPaid = 0
    )
    UPDATE sp
    SET IsPaid = 1
    FROM dbo.StockPurchase sp
    INNER JOIN UnpaidOldestFirst u ON u.StockPurchaseId = sp.StockPurchaseId
    WHERE u.RunningTotal <= @Amount;

    COMMIT TRAN;
END
GO

CREATE PROCEDURE dbo.usp_SetVendorActive
    @VendorId   INT,
    @IsActive   BIT
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE dbo.Vendor SET IsActive = @IsActive WHERE VendorId = @VendorId;
END
GO

/* ============================================================================
   STAFF
   ==========================================================================*/

-- Mirrors login()'s clockIn call: a no-op if already clocked in today.
CREATE PROCEDURE dbo.usp_ClockIn
    @StaffId INT
AS
BEGIN
    SET NOCOUNT ON;
    IF NOT EXISTS (SELECT 1 FROM dbo.ShiftEntry WHERE StaffId = @StaffId AND ClockOut IS NULL)
        INSERT INTO dbo.ShiftEntry (StaffId, ClockIn) VALUES (@StaffId, SYSUTCDATETIME());
END
GO

CREATE PROCEDURE dbo.usp_ClockOut
    @StaffId INT
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE dbo.ShiftEntry
    SET ClockOut = SYSUTCDATETIME()
    WHERE ShiftEntryId = (
        SELECT TOP (1) ShiftEntryId FROM dbo.ShiftEntry
        WHERE StaffId = @StaffId AND ClockOut IS NULL
        ORDER BY ClockIn DESC
    );
END
GO

-- Mirrors the Settings "Change PIN" card and the login screen's self-
-- service "Change PIN" — both call this against the one shared PIN.
-- Pass pre-hashed values in; never plaintext.
CREATE PROCEDURE dbo.usp_ChangeStaffPin
    @CurrentPinHash NVARCHAR(256),
    @NewPinHash     NVARCHAR(256)
AS
BEGIN
    SET NOCOUNT ON;
    IF NOT EXISTS (SELECT 1 FROM dbo.StaffPin WHERE StaffPinId = 1 AND PinHash = @CurrentPinHash)
        THROW 50005, 'Current PIN is incorrect.', 1;

    UPDATE dbo.StaffPin SET PinHash = @NewPinHash, UpdatedAt = SYSUTCDATETIME() WHERE StaffPinId = 1;
END
GO

CREATE PROCEDURE dbo.usp_ApproveLeaveRecord
    @LeaveRecordId  INT,
    @IsPaid         BIT
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE dbo.LeaveRecord
    SET Status = 'approved', IsPaid = @IsPaid, DeclineReason = NULL
    WHERE LeaveRecordId = @LeaveRecordId;
END
GO

CREATE PROCEDURE dbo.usp_DeclineLeaveRecord
    @LeaveRecordId  INT,
    @DeclineReason  NVARCHAR(500)
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE dbo.LeaveRecord
    SET Status = 'declined', DeclineReason = @DeclineReason
    WHERE LeaveRecordId = @LeaveRecordId;
END
GO
