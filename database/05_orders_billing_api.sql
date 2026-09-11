/* ============================================================================
   Orders/Tickets & RestaurantSettings — API-backing migration
   ============================================================================
   Adds the stored procedures needed to move Order/OrderDetail/Round/
   OrderLineItem/VoidEntry mutations and RestaurantSettings off the
   browser-only Zustand store and onto this database. Billing/Payments
   (usp_StartBilling, usp_RecordPayment, usp_ReverseLastPayment,
   usp_ReverseCompletedPayment, usp_ConfirmOrderComplete, usp_FinalizeReceipt,
   usp_SetReceiptQrCode, usp_RecordCashDrop, usp_RecordCashDropLumpsum,
   usp_DeleteCashDrop) already exist in database/02_procedures.sql and are
   reused as-is — nothing here duplicates them.
   ==========================================================================*/

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

/* ============================================================================
   ORDER LINE ITEM MUTATIONS
   ==========================================================================*/

-- Mirrors addItem's merge-by-existing-line branch (lib/store.ts): bumps an
-- already-present line's Qty instead of inserting a duplicate row.
CREATE PROCEDURE dbo.usp_IncrementOrderLineItemQty
    @OrderLineItemId    INT,
    @QtyDelta           DECIMAL(8,2)
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE dbo.OrderLineItem SET Qty = Qty + @QtyDelta WHERE OrderLineItemId = @OrderLineItemId;
END
GO

-- Mirrors updateItemQty's qty>0 branch. (qty<=0 goes to usp_DeleteOrderLineItem instead.)
CREATE PROCEDURE dbo.usp_UpdateOrderLineItemQty
    @OrderLineItemId    INT,
    @Qty                DECIMAL(8,2)
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE dbo.OrderLineItem SET Qty = @Qty WHERE OrderLineItemId = @OrderLineItemId;
END
GO

-- Mirrors removeItem, and the qty<=0 branch of updateItemQty. Not used for
-- voiding — see usp_VoidOrderLineItem, which has to sequence the delete
-- around the VoidEntry FK differently.
CREATE PROCEDURE dbo.usp_DeleteOrderLineItem
    @OrderLineItemId    INT
AS
BEGIN
    SET NOCOUNT ON;
    DELETE FROM dbo.OrderLineItem WHERE OrderLineItemId = @OrderLineItemId;
END
GO

CREATE PROCEDURE dbo.usp_UpdateOrderLineItemNote
    @OrderLineItemId    INT,
    @Note               NVARCHAR(500) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE dbo.OrderLineItem SET Note = @Note WHERE OrderLineItemId = @OrderLineItemId;
END
GO

-- Mirrors voidItem: records the VoidEntry (denormalizing ItemName/Qty so the
-- audit trail survives the row being gone) then removes the line item.
-- VoidEntry.OrderLineItemId has a plain (non-cascading) FK, so it has to be
-- nulled out before the OrderLineItem row can actually be deleted — insert
-- with the id first (so it's valid at insert time), then null it, then
-- delete, all in one transaction.
CREATE PROCEDURE dbo.usp_VoidOrderLineItem
    @OrderLineItemId    INT,
    @Reason             NVARCHAR(500),
    @StaffId            INT = NULL,
    @VoidEntryId        INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    BEGIN TRAN;

    DECLARE @OrderDetailId INT, @OrderId INT, @ItemName NVARCHAR(150), @Qty DECIMAL(8,2);
    SELECT @OrderDetailId = r.OrderDetailId, @OrderId = od.OrderId, @ItemName = oli.Name, @Qty = oli.Qty
    FROM dbo.OrderLineItem oli
    INNER JOIN dbo.[Round] r ON r.RoundId = oli.RoundId
    INNER JOIN dbo.OrderDetail od ON od.OrderDetailId = r.OrderDetailId
    WHERE oli.OrderLineItemId = @OrderLineItemId;

    INSERT INTO dbo.VoidEntry (OrderId, OrderDetailId, OrderLineItemId, ItemName, Qty, Reason, StaffId, VoidedAt)
    VALUES (@OrderId, @OrderDetailId, @OrderLineItemId, @ItemName, @Qty, @Reason, @StaffId, SYSUTCDATETIME());

    SET @VoidEntryId = SCOPE_IDENTITY();

    UPDATE dbo.VoidEntry SET OrderLineItemId = NULL WHERE VoidEntryId = @VoidEntryId;
    DELETE FROM dbo.OrderLineItem WHERE OrderLineItemId = @OrderLineItemId;

    COMMIT TRAN;
END
GO

CREATE PROCEDURE dbo.usp_SetLineItemReady
    @OrderLineItemId    INT,
    @KitchenReady       BIT
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE dbo.OrderLineItem SET KitchenReady = @KitchenReady WHERE OrderLineItemId = @OrderLineItemId;
END
GO

-- Mirrors markAllItemsReady: only items already sent to the kitchen.
CREATE PROCEDURE dbo.usp_MarkAllLineItemsReadyForOrder
    @OrderDetailId  INT
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE oli
    SET KitchenReady = 1
    FROM dbo.OrderLineItem oli
    INNER JOIN dbo.[Round] r ON r.RoundId = oli.RoundId
    WHERE r.OrderDetailId = @OrderDetailId AND oli.SentToKitchen = 1;
END
GO

/* ============================================================================
   ORDER DETAIL MUTATIONS
   ==========================================================================*/

-- Mirrors withRefreshedBillTotals in lib/store.ts: only recomputes once
-- billing has actually started for this cycle (Total already set) — an
-- order that hasn't reached Start Billing yet has no totals to keep synced
-- as items are added/adjusted. Same VAT-inclusive rounding as
-- usp_StartBilling.
CREATE PROCEDURE dbo.usp_RefreshOrderDetailTotals
    @OrderDetailId  INT,
    @VatRate        DECIMAL(5,4)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF NOT EXISTS (SELECT 1 FROM dbo.OrderDetail WHERE OrderDetailId = @OrderDetailId AND Total IS NOT NULL)
        RETURN;

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

    UPDATE dbo.OrderDetail SET Subtotal = @Subtotal, Vat = @Vat, Total = @Total WHERE OrderDetailId = @OrderDetailId;
END
GO

-- Mirrors addItem's `paymentStatus === "paid" ? "unpaid" : ...` reset — a
-- new item landing on an already-fully-paid order un-pays it. Deliberately
-- does NOT touch Order.Status (matches the app: only OrderDetail.PaymentStatus
-- resets here, same asymmetry the original store code has).
CREATE PROCEDURE dbo.usp_ResetOrderPaymentStatusIfPaid
    @OrderDetailId INT
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE dbo.OrderDetail SET PaymentStatus = 'unpaid' WHERE OrderDetailId = @OrderDetailId AND PaymentStatus = 'paid';
END
GO

CREATE PROCEDURE dbo.usp_SetOrderOnHold
    @OrderDetailId  INT,
    @OnHold         BIT
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE dbo.OrderDetail SET OnHold = @OnHold WHERE OrderDetailId = @OrderDetailId;
END
GO

-- Mirrors cancelEmptyTickets/purgeEmptyTickets: an open order whose every
-- round has zero line items was abandoned before a single item was added —
-- sweep it (and its rounds) away entirely rather than let it linger as a
-- visible empty ticket. Also excludes any order with VoidEntry history:
-- unlike the old client-side version (a plain in-memory array with no
-- referential integrity), VoidEntry.OrderDetailId/OrderId here are NOT NULL
-- FKs — an order that had an item added and then voided has a legitimate
-- audit trail and was never truly "abandoned untouched", so it's kept
-- (and the FK would block the delete regardless).
CREATE PROCEDURE dbo.usp_DeleteEmptyOrders
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    BEGIN TRAN;

    DECLARE @EmptyOrderDetailIds TABLE (OrderDetailId INT, OrderId INT);
    INSERT INTO @EmptyOrderDetailIds (OrderDetailId, OrderId)
    SELECT od.OrderDetailId, od.OrderId
    FROM dbo.OrderDetail od
    INNER JOIN dbo.[Order] o ON o.OrderId = od.OrderId
    WHERE o.Status = 'open'
      AND NOT EXISTS (
          SELECT 1 FROM dbo.[Round] r
          INNER JOIN dbo.OrderLineItem oli ON oli.RoundId = r.RoundId
          WHERE r.OrderDetailId = od.OrderDetailId
      )
      AND NOT EXISTS (
          SELECT 1 FROM dbo.VoidEntry v WHERE v.OrderDetailId = od.OrderDetailId
      );

    DELETE r FROM dbo.[Round] r INNER JOIN @EmptyOrderDetailIds e ON e.OrderDetailId = r.OrderDetailId;
    DELETE od FROM dbo.OrderDetail od INNER JOIN @EmptyOrderDetailIds e ON e.OrderDetailId = od.OrderDetailId;
    DELETE o FROM dbo.[Order] o INNER JOIN @EmptyOrderDetailIds e ON e.OrderId = o.OrderId;

    COMMIT TRAN;
END
GO

/* ============================================================================
   RESTAURANT SETTINGS
   ============================================================================
   Singleton row — seeded once (from lib/seed-data.ts's seedRestaurantSettings)
   alongside Menu/Staff, so this is an update-only procedure, not an upsert.
   ==========================================================================*/

CREATE PROCEDURE dbo.usp_UpdateRestaurantSettings
    @Name           NVARCHAR(200),
    @Address        NVARCHAR(300),
    @KraPin         NVARCHAR(50),
    @Phone          NVARCHAR(50),
    @TillNumber     NVARCHAR(50),
    @VatRate        DECIMAL(5,4),
    @ReceiptWidth   NVARCHAR(10)
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE dbo.RestaurantSettings
    SET Name = @Name, Address = @Address, KraPin = @KraPin, Phone = @Phone,
        TillNumber = @TillNumber, VatRate = @VatRate, ReceiptWidth = @ReceiptWidth
    WHERE SettingsId = 1;
END
GO
