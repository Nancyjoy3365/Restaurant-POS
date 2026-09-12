/* ============================================================================
   VAT-inclusive pricing fix
   ============================================================================
   Menu prices already include VAT (the printed bill even says so: "Prices
   inclusive of VAT where applicable") — but usp_StartBilling and
   usp_RefreshOrderDetailTotals (02_procedures.sql / 05_orders_billing_api.sql)
   were adding VAT on top of the raw item total instead of backing it out of
   it, effectively double-charging VAT on every bill. This replaces both with
   the correct VAT-inclusive math: the raw item total IS the customer-facing
   total; Subtotal/Vat are just that total split apart for the printed
   breakdown and Financial Summary's reporting, never added to what's charged.
   Run once against the existing database (01-07 already applied).
   ==========================================================================*/

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

CREATE OR ALTER PROCEDURE dbo.usp_StartBilling
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

    -- Menu prices are VAT-inclusive — the raw item total IS the bill total.
    -- VAT is backed out of it for the printed breakdown, never added on top.
    DECLARE @Total    DECIMAL(12,2) = ROUND(@RawTotal, 0);
    DECLARE @Subtotal DECIMAL(12,2) = ROUND(@Total / (1 + @VatRate), 0);
    DECLARE @Vat      DECIMAL(12,2) = @Total - @Subtotal;

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

CREATE OR ALTER PROCEDURE dbo.usp_RefreshOrderDetailTotals
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

    -- Same VAT-inclusive math as usp_StartBilling above.
    DECLARE @Total    DECIMAL(12,2) = ROUND(@RawTotal, 0);
    DECLARE @Subtotal DECIMAL(12,2) = ROUND(@Total / (1 + @VatRate), 0);
    DECLARE @Vat      DECIMAL(12,2) = @Total - @Subtotal;

    UPDATE dbo.OrderDetail SET Subtotal = @Subtotal, Vat = @Vat, Total = @Total WHERE OrderDetailId = @OrderDetailId;
END
GO
