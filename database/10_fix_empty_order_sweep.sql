/* ============================================================================
   Fix usp_DeleteEmptyOrders — also exclude tickets with real Payment history
   ============================================================================
   The existing sweep (05_orders_billing_api.sql) already skips a
   zero-item ticket that has VoidEntry history, but never checked for
   Payment history — so a ticket with 0 current items but a real recorded
   payment (e.g. every item was voided after being paid for) caused the
   whole batch DELETE to fail outright on the Payment->OrderDetail foreign
   key, silently blocking every other genuinely-empty ticket in the same
   sweep from being cleaned up too. Run once against the existing database
   (01-09 already applied).
   ==========================================================================*/

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

CREATE OR ALTER PROCEDURE dbo.usp_DeleteEmptyOrders
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
      )
      AND NOT EXISTS (
          SELECT 1 FROM dbo.Payment p WHERE p.OrderDetailId = od.OrderDetailId
      );

    DELETE r FROM dbo.[Round] r INNER JOIN @EmptyOrderDetailIds e ON e.OrderDetailId = r.OrderDetailId;
    DELETE od FROM dbo.OrderDetail od INNER JOIN @EmptyOrderDetailIds e ON e.OrderDetailId = od.OrderDetailId;
    DELETE o FROM dbo.[Order] o INNER JOIN @EmptyOrderDetailIds e ON e.OrderId = o.OrderId;

    COMMIT TRAN;
END
GO
