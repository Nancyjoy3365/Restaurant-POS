/* ============================================================================
   Samaki Mjini Restaurant POS — SQL Server schema
   ============================================================================
   Mirrors the domain model currently held client-side in lib/types.ts and
   lib/store.ts (a Zustand store persisted to localStorage). This schema is
   the server-side equivalent for a real backend: ids move from app-generated
   strings (makeId()) to server-issued IDENTITY keys, and two counters
   (ticketCounter / invoiceCounter) become SEQUENCE objects so concurrent
   requests can never hand out the same order/invoice number.

   Conventions:
     - Schema: dbo
     - Surrogate keys: INT IDENTITY(1,1)
     - Money: DECIMAL(12,2); unit costs that can carry sub-cent precision
       (Ingredient/StockPurchase.UnitCost) use DECIMAL(12,4)
     - Timestamps: DATETIME2(3), UTC, defaulting to SYSUTCDATETIME()
     - Enum-like string unions from the TS types are enforced with CHECK
       constraints rather than lookup tables, matching how cheaply they
       change in the source app (a handful of hardcoded literals)
     - Run this file once, top to bottom, against an empty database
   ==========================================================================*/

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

/* ----------------------------------------------------------------------
   Sequences — replace store.ts's ticketCounter / invoiceCounter fields.
   Concurrency-safe: NEXT VALUE FOR never hands out the same number twice.
   ------------------------------------------------------------------- */
CREATE SEQUENCE dbo.Seq_OrderDisplayNumber AS INT START WITH 1 INCREMENT BY 1;
GO
CREATE SEQUENCE dbo.Seq_InvoiceNumber AS INT START WITH 1 INCREMENT BY 1;
GO

/* ----------------------------------------------------------------------
   RestaurantSettings — singleton config row (Settings page).
   ------------------------------------------------------------------- */
CREATE TABLE dbo.RestaurantSettings (
    SettingsId      INT             NOT NULL CONSTRAINT PK_RestaurantSettings PRIMARY KEY
                                     CONSTRAINT CK_RestaurantSettings_Singleton CHECK (SettingsId = 1),
    Name            NVARCHAR(200)   NOT NULL,
    Address         NVARCHAR(300)   NOT NULL,
    KraPin          NVARCHAR(50)    NOT NULL,
    Phone           NVARCHAR(50)    NOT NULL,
    TillNumber      NVARCHAR(50)    NOT NULL,
    VatRate         DECIMAL(5,4)    NOT NULL CONSTRAINT DF_RestaurantSettings_VatRate DEFAULT (0.16),
    ReceiptWidth    NVARCHAR(10)    NOT NULL CONSTRAINT DF_RestaurantSettings_ReceiptWidth DEFAULT ('80mm')
                                     CONSTRAINT CK_RestaurantSettings_ReceiptWidth CHECK (ReceiptWidth IN ('58mm','80mm'))
);
GO

/* ----------------------------------------------------------------------
   StaffPin — the single shared PIN every staff member currently uses to
   log in (see app/login/page.tsx, app/settings/page.tsx). Store a hash in
   production; the app today treats this as a plain 3-digit code.
   ------------------------------------------------------------------- */
CREATE TABLE dbo.StaffPin (
    StaffPinId  INT             NOT NULL CONSTRAINT PK_StaffPin PRIMARY KEY
                                 CONSTRAINT CK_StaffPin_Singleton CHECK (StaffPinId = 1),
    PinHash     NVARCHAR(256)   NOT NULL,
    UpdatedAt   DATETIME2(3)    NOT NULL CONSTRAINT DF_StaffPin_UpdatedAt DEFAULT (SYSUTCDATETIME())
);
GO

/* ----------------------------------------------------------------------
   Staff
   ------------------------------------------------------------------- */
CREATE TABLE dbo.Staff (
    StaffId             INT             IDENTITY(1,1) CONSTRAINT PK_Staff PRIMARY KEY,
    Name                NVARCHAR(150)   NOT NULL,
    Role                NVARCHAR(30)    NOT NULL
                                         CONSTRAINT CK_Staff_Role CHECK (Role IN ('Waiter','Admin','Chef','Cashier','Kitchen Assistant')),
    Title               NVARCHAR(100)   NULL,
    PayType             NVARCHAR(20)    NOT NULL
                                         CONSTRAINT CK_Staff_PayType CHECK (PayType IN ('daily','monthly','commission')),
    Rate                DECIMAL(12,2)   NOT NULL CONSTRAINT DF_Staff_Rate DEFAULT (0),
    Phone               NVARCHAR(30)    NULL,
    CommissionType      NVARCHAR(30)    NULL
                                         CONSTRAINT CK_Staff_CommissionType CHECK (CommissionType IN ('percent_of_sales','flat_per_order')),
    CommissionValue     DECIMAL(12,4)   NULL,
    IsActive            BIT             NOT NULL CONSTRAINT DF_Staff_IsActive DEFAULT (1),
    CreatedAt           DATETIME2(3)    NOT NULL CONSTRAINT DF_Staff_CreatedAt DEFAULT (SYSUTCDATETIME())
);
GO
CREATE INDEX IX_Staff_Role ON dbo.Staff(Role) WHERE IsActive = 1;
GO

/* ----------------------------------------------------------------------
   ShiftEntry — clock in / clock out log.
   ------------------------------------------------------------------- */
CREATE TABLE dbo.ShiftEntry (
    ShiftEntryId    INT             IDENTITY(1,1) CONSTRAINT PK_ShiftEntry PRIMARY KEY,
    StaffId         INT             NOT NULL CONSTRAINT FK_ShiftEntry_Staff REFERENCES dbo.Staff(StaffId),
    ClockIn         DATETIME2(3)    NOT NULL,
    ClockOut        DATETIME2(3)    NULL,
    CONSTRAINT CK_ShiftEntry_ClockOut CHECK (ClockOut IS NULL OR ClockOut >= ClockIn)
);
GO
CREATE INDEX IX_ShiftEntry_StaffId ON dbo.ShiftEntry(StaffId, ClockIn DESC);
-- One open shift per staff member at a time.
CREATE UNIQUE INDEX UX_ShiftEntry_OpenPerStaff ON dbo.ShiftEntry(StaffId) WHERE ClockOut IS NULL;
GO

/* ----------------------------------------------------------------------
   LeaveRecord — date-range leave requests/approvals.
   ------------------------------------------------------------------- */
CREATE TABLE dbo.LeaveRecord (
    LeaveRecordId   INT             IDENTITY(1,1) CONSTRAINT PK_LeaveRecord PRIMARY KEY,
    StaffId         INT             NOT NULL CONSTRAINT FK_LeaveRecord_Staff REFERENCES dbo.Staff(StaffId),
    StartDate       DATE            NOT NULL,
    EndDate         DATE            NOT NULL,
    Reason          NVARCHAR(500)   NOT NULL,
    Status          NVARCHAR(20)    NOT NULL
                                     CONSTRAINT CK_LeaveRecord_Status CHECK (Status IN ('approved','pending','declined')),
    IsPaid          BIT             NOT NULL CONSTRAINT DF_LeaveRecord_IsPaid DEFAULT (0),
    RequestedAt     DATETIME2(3)    NULL,
    DeclineReason   NVARCHAR(500)   NULL,
    CONSTRAINT CK_LeaveRecord_DateRange CHECK (EndDate >= StartDate)
);
GO
CREATE INDEX IX_LeaveRecord_StaffId ON dbo.LeaveRecord(StaffId);
CREATE INDEX IX_LeaveRecord_DateRange ON dbo.LeaveRecord(StartDate, EndDate) WHERE Status = 'approved';
CREATE INDEX IX_LeaveRecord_Pending ON dbo.LeaveRecord(RequestedAt) WHERE Status = 'pending';
GO

/* ----------------------------------------------------------------------
   IncentiveRecord — one-off payroll adjustments (bonuses).
   ------------------------------------------------------------------- */
CREATE TABLE dbo.IncentiveRecord (
    IncentiveRecordId   INT             IDENTITY(1,1) CONSTRAINT PK_IncentiveRecord PRIMARY KEY,
    StaffId             INT             NOT NULL CONSTRAINT FK_IncentiveRecord_Staff REFERENCES dbo.Staff(StaffId),
    Amount              DECIMAL(12,2)   NOT NULL,
    Reason              NVARCHAR(500)   NOT NULL,
    DateGiven           DATETIME2(3)    NOT NULL,
    GivenBy             NVARCHAR(150)   NULL
);
GO
CREATE INDEX IX_IncentiveRecord_StaffId ON dbo.IncentiveRecord(StaffId, DateGiven DESC);
GO

/* ----------------------------------------------------------------------
   MenuItem + its child collections (aliases, spice levels, add-ons,
   combo components — each a string[]/object[] on MenuItem in the TS type).
   ------------------------------------------------------------------- */
CREATE TABLE dbo.MenuItem (
    MenuItemId      INT             IDENTITY(1,1) CONSTRAINT PK_MenuItem PRIMARY KEY,
    Name            NVARCHAR(150)   NOT NULL,
    Category        NVARCHAR(20)    NOT NULL
                                     CONSTRAINT CK_MenuItem_Category CHECK (Category IN ('Main','Extra','Drinks','Water','Juice','Packaging')),
    Price           DECIMAL(12,2)   NOT NULL,
    IsVeg           BIT             NOT NULL CONSTRAINT DF_MenuItem_IsVeg DEFAULT (0),
    IsAvailable     BIT             NOT NULL CONSTRAINT DF_MenuItem_IsAvailable DEFAULT (1),
    ComboTag        NVARCHAR(100)   NULL,
    ImageUrl        NVARCHAR(500)   NULL,
    -- Variants of the same dish (e.g. "Fish" -> Dry/Wet/Boiled) share a
    -- VariantGroup and are otherwise fully independent MenuItem rows.
    VariantGroup    NVARCHAR(100)   NULL,
    VariantLabel    NVARCHAR(100)   NULL,
    IsPriority      BIT             NOT NULL CONSTRAINT DF_MenuItem_IsPriority DEFAULT (0)
);
GO
CREATE INDEX IX_MenuItem_Category ON dbo.MenuItem(Category) WHERE IsAvailable = 1;
CREATE INDEX IX_MenuItem_VariantGroup ON dbo.MenuItem(VariantGroup) WHERE VariantGroup IS NOT NULL;
GO

CREATE TABLE dbo.MenuItemAlias (
    MenuItemAliasId INT             IDENTITY(1,1) CONSTRAINT PK_MenuItemAlias PRIMARY KEY,
    MenuItemId      INT             NOT NULL CONSTRAINT FK_MenuItemAlias_MenuItem REFERENCES dbo.MenuItem(MenuItemId) ON DELETE CASCADE,
    Alias           NVARCHAR(150)   NOT NULL
);
GO
CREATE INDEX IX_MenuItemAlias_MenuItemId ON dbo.MenuItemAlias(MenuItemId);
CREATE INDEX IX_MenuItemAlias_Alias ON dbo.MenuItemAlias(Alias);
GO

CREATE TABLE dbo.MenuItemSpiceLevel (
    MenuItemSpiceLevelId    INT             IDENTITY(1,1) CONSTRAINT PK_MenuItemSpiceLevel PRIMARY KEY,
    MenuItemId              INT             NOT NULL CONSTRAINT FK_MenuItemSpiceLevel_MenuItem REFERENCES dbo.MenuItem(MenuItemId) ON DELETE CASCADE,
    Level                   NVARCHAR(50)    NOT NULL,
    -- Preserves the app's array order — index 0 is the picker's default
    -- unless "Normal" is present (see VariantPickerSheet.tsx).
    SortOrder               INT             NOT NULL CONSTRAINT DF_MenuItemSpiceLevel_SortOrder DEFAULT (0)
);
GO
CREATE INDEX IX_MenuItemSpiceLevel_MenuItemId ON dbo.MenuItemSpiceLevel(MenuItemId, SortOrder);
GO

CREATE TABLE dbo.MenuItemAddOn (
    MenuItemAddOnId INT             IDENTITY(1,1) CONSTRAINT PK_MenuItemAddOn PRIMARY KEY,
    MenuItemId      INT             NOT NULL CONSTRAINT FK_MenuItemAddOn_MenuItem REFERENCES dbo.MenuItem(MenuItemId) ON DELETE CASCADE,
    Name            NVARCHAR(150)   NOT NULL,
    Price           DECIMAL(12,2)   NOT NULL
);
GO
CREATE INDEX IX_MenuItemAddOn_MenuItemId ON dbo.MenuItemAddOn(MenuItemId);
GO

CREATE TABLE dbo.MenuItemComboComponent (
    MenuItemComboComponentId    INT             IDENTITY(1,1) CONSTRAINT PK_MenuItemComboComponent PRIMARY KEY,
    MenuItemId                  INT             NOT NULL CONSTRAINT FK_MenuItemComboComponent_MenuItem REFERENCES dbo.MenuItem(MenuItemId) ON DELETE CASCADE,
    Name                        NVARCHAR(150)   NOT NULL,
    Qty                         NVARCHAR(50)    NOT NULL
);
GO
CREATE INDEX IX_MenuItemComboComponent_MenuItemId ON dbo.MenuItemComboComponent(MenuItemId);
GO

/* ----------------------------------------------------------------------
   Vendor / Ingredient / StockPurchase / VendorPayment — Inventory module.
   ------------------------------------------------------------------- */
CREATE TABLE dbo.Vendor (
    VendorId    INT             IDENTITY(1,1) CONSTRAINT PK_Vendor PRIMARY KEY,
    Name        NVARCHAR(150)   NOT NULL,
    Category    NVARCHAR(100)   NOT NULL,
    -- Deactivated (not deleted) — history stays intact; see setVendorActive.
    IsActive    BIT             NOT NULL CONSTRAINT DF_Vendor_IsActive DEFAULT (1)
);
GO
CREATE INDEX IX_Vendor_IsActive ON dbo.Vendor(IsActive, Name);
GO

CREATE TABLE dbo.Ingredient (
    IngredientId        INT             IDENTITY(1,1) CONSTRAINT PK_Ingredient PRIMARY KEY,
    Name                NVARCHAR(150)   NOT NULL,
    Packaging           NVARCHAR(50)    NOT NULL,
    -- On-hand packages/units, accumulated by every StockPurchase.
    Quantity            DECIMAL(12,2)   NOT NULL CONSTRAINT DF_Ingredient_Quantity DEFAULT (0),
    PiecesPerPackage    DECIMAL(12,2)   NOT NULL CONSTRAINT DF_Ingredient_PiecesPerPackage DEFAULT (1),
    -- "Last cost" snapshot from the most recent purchase — the full
    -- purchase-by-purchase ledger lives in StockPurchase.
    TotalCost           DECIMAL(12,2)   NOT NULL CONSTRAINT DF_Ingredient_TotalCost DEFAULT (0),
    Unit                NVARCHAR(20)    NOT NULL,
    -- How much of Unit a single piece holds (e.g. 2.5 for a 2.5-litre
    -- bottle) — descriptive sizing only, not used in UnitCost.
    UnitAmount          DECIMAL(12,2)   NOT NULL CONSTRAINT DF_Ingredient_UnitAmount DEFAULT (1),
    ReorderThreshold    DECIMAL(12,2)   NOT NULL CONSTRAINT DF_Ingredient_ReorderThreshold DEFAULT (0),
    UnitCost            DECIMAL(12,4)   NOT NULL CONSTRAINT DF_Ingredient_UnitCost DEFAULT (0),
    PurchasedAt         DATETIME2(3)    NULL
);
GO
CREATE INDEX IX_Ingredient_Name ON dbo.Ingredient(Name);
GO

CREATE TABLE dbo.StockPurchase (
    StockPurchaseId INT             IDENTITY(1,1) CONSTRAINT PK_StockPurchase PRIMARY KEY,
    VendorId        INT             NOT NULL CONSTRAINT FK_StockPurchase_Vendor REFERENCES dbo.Vendor(VendorId),
    IngredientId    INT             NOT NULL CONSTRAINT FK_StockPurchase_Ingredient REFERENCES dbo.Ingredient(IngredientId),
    Quantity        DECIMAL(12,2)   NOT NULL,
    UnitCost        DECIMAL(12,4)   NOT NULL,
    TotalCost       DECIMAL(12,2)   NOT NULL,
    PurchasedAt     DATETIME2(3)    NOT NULL CONSTRAINT DF_StockPurchase_PurchasedAt DEFAULT (SYSUTCDATETIME()),
    -- Whole-purchase paid flag only — a vendor payout settles entire
    -- purchases oldest-first, never a partial one (see recordVendorPayout).
    IsPaid          BIT             NOT NULL CONSTRAINT DF_StockPurchase_IsPaid DEFAULT (0)
);
GO
CREATE INDEX IX_StockPurchase_VendorUnpaid ON dbo.StockPurchase(VendorId, PurchasedAt) WHERE IsPaid = 0;
CREATE INDEX IX_StockPurchase_IngredientId ON dbo.StockPurchase(IngredientId);
GO

CREATE TABLE dbo.VendorPayment (
    VendorPaymentId INT             IDENTITY(1,1) CONSTRAINT PK_VendorPayment PRIMARY KEY,
    VendorId        INT             NOT NULL CONSTRAINT FK_VendorPayment_Vendor REFERENCES dbo.Vendor(VendorId),
    Amount          DECIMAL(12,2)   NOT NULL,
    Method          NVARCHAR(10)    NOT NULL
                                     CONSTRAINT CK_VendorPayment_Method CHECK (Method IN ('cash','mpesa')),
    -- Only meaningful when Method = 'mpesa'.
    Reference       NVARCHAR(100)   NULL,
    PaidAt          DATETIME2(3)    NOT NULL CONSTRAINT DF_VendorPayment_PaidAt DEFAULT (SYSUTCDATETIME())
);
GO
CREATE INDEX IX_VendorPayment_VendorId ON dbo.VendorPayment(VendorId, PaidAt DESC);
GO

/* ----------------------------------------------------------------------
   Recipe — ingredient composition per menu item (currently unused by any
   consumption/costing feature in the app, but the shape already exists).
   ------------------------------------------------------------------- */
CREATE TABLE dbo.Recipe (
    RecipeId    INT NOT NULL IDENTITY(1,1) CONSTRAINT PK_Recipe PRIMARY KEY,
    MenuItemId  INT NOT NULL CONSTRAINT FK_Recipe_MenuItem REFERENCES dbo.MenuItem(MenuItemId),
    CONSTRAINT UQ_Recipe_MenuItemId UNIQUE (MenuItemId)
);
GO

CREATE TABLE dbo.RecipeComponent (
    RecipeComponentId   INT             IDENTITY(1,1) CONSTRAINT PK_RecipeComponent PRIMARY KEY,
    RecipeId            INT             NOT NULL CONSTRAINT FK_RecipeComponent_Recipe REFERENCES dbo.Recipe(RecipeId) ON DELETE CASCADE,
    IngredientId        INT             NOT NULL CONSTRAINT FK_RecipeComponent_Ingredient REFERENCES dbo.Ingredient(IngredientId),
    Qty                 DECIMAL(12,4)   NOT NULL
);
GO
CREATE INDEX IX_RecipeComponent_RecipeId ON dbo.RecipeComponent(RecipeId);
GO

/* ----------------------------------------------------------------------
   Order — one customer group's order+receipt; no physical "table" entity
   underneath it (see the comment on Order in lib/types.ts).
   ------------------------------------------------------------------- */
CREATE TABLE dbo.[Order] (
    OrderId         INT             IDENTITY(1,1) CONSTRAINT PK_Order PRIMARY KEY,
    DisplayNumber   INT             NOT NULL,
    -- Set once at creation, never reassigned — the single source of truth
    -- for sales-credit attribution.
    WaiterId        INT             NOT NULL CONSTRAINT FK_Order_Staff REFERENCES dbo.Staff(StaffId),
    LocationNote    NVARCHAR(200)   NULL,
    OrderType       NVARCHAR(20)    NOT NULL CONSTRAINT DF_Order_OrderType DEFAULT ('dine_in')
                                     CONSTRAINT CK_Order_OrderType CHECK (OrderType IN ('dine_in','takeaway')),
    CustomerName    NVARCHAR(150)   NULL,
    CustomerPhone   NVARCHAR(30)    NULL,
    Status          NVARCHAR(10)    NOT NULL CONSTRAINT DF_Order_Status DEFAULT ('open')
                                     CONSTRAINT CK_Order_Status CHECK (Status IN ('open','paid')),
    OpenedAt        DATETIME2(3)    NOT NULL CONSTRAINT DF_Order_OpenedAt DEFAULT (SYSUTCDATETIME()),
    ClosedAt        DATETIME2(3)    NULL,
    CONSTRAINT UQ_Order_DisplayNumber UNIQUE (DisplayNumber)
);
GO
CREATE INDEX IX_Order_WaiterId ON dbo.[Order](WaiterId);
CREATE INDEX IX_Order_Status ON dbo.[Order](Status);
GO

/* ----------------------------------------------------------------------
   OrderDetail — the working order state for an Order (1:1).
   ------------------------------------------------------------------- */
CREATE TABLE dbo.OrderDetail (
    OrderDetailId               INT             IDENTITY(1,1) CONSTRAINT PK_OrderDetail PRIMARY KEY,
    OrderId                     INT             NOT NULL CONSTRAINT FK_OrderDetail_Order REFERENCES dbo.[Order](OrderId),
    -- Copied from Order.WaiterId at creation; never reassigned.
    WaiterId                    INT             NULL CONSTRAINT FK_OrderDetail_Staff REFERENCES dbo.Staff(StaffId),
    PaymentStatus               NVARCHAR(20)    NOT NULL CONSTRAINT DF_OrderDetail_PaymentStatus DEFAULT ('unpaid')
                                                 CONSTRAINT CK_OrderDetail_PaymentStatus CHECK (PaymentStatus IN ('unpaid','partially_paid','paid')),
    -- NULL until startBilling computes them for the current cycle.
    Subtotal                    DECIMAL(12,2)   NULL,
    Vat                         DECIMAL(12,2)   NULL,
    Total                       DECIMAL(12,2)   NULL,
    OnHold                      BIT             NOT NULL CONSTRAINT DF_OrderDetail_OnHold DEFAULT (0),
    -- Rounds with RoundIndex <= this are part of an already-finalized
    -- receipt/cycle and must never be re-billed.
    BilledThroughRoundIndex     INT             NOT NULL CONSTRAINT DF_OrderDetail_BilledThroughRoundIndex DEFAULT (0),
    CONSTRAINT UQ_OrderDetail_OrderId UNIQUE (OrderId)
);
GO

CREATE TABLE dbo.[Round] (
    RoundId         INT             IDENTITY(1,1) CONSTRAINT PK_Round PRIMARY KEY,
    OrderDetailId   INT             NOT NULL CONSTRAINT FK_Round_OrderDetail REFERENCES dbo.OrderDetail(OrderDetailId),
    RoundIndex      INT             NOT NULL,
    CreatedAt       DATETIME2(3)    NOT NULL CONSTRAINT DF_Round_CreatedAt DEFAULT (SYSUTCDATETIME()),
    -- When the round was actually sent to the kitchen — distinct from
    -- CreatedAt; drives the Kitchen Display's elapsed-time badge.
    SentAt          DATETIME2(3)    NULL,
    CONSTRAINT UQ_Round_Order_Index UNIQUE (OrderDetailId, RoundIndex)
);
GO
CREATE INDEX IX_Round_OrderDetailId ON dbo.[Round](OrderDetailId);
GO

CREATE TABLE dbo.OrderLineItem (
    OrderLineItemId INT             IDENTITY(1,1) CONSTRAINT PK_OrderLineItem PRIMARY KEY,
    RoundId         INT             NOT NULL CONSTRAINT FK_OrderLineItem_Round REFERENCES dbo.[Round](RoundId),
    MenuItemId      INT             NOT NULL CONSTRAINT FK_OrderLineItem_MenuItem REFERENCES dbo.MenuItem(MenuItemId),
    -- Name/Price are copied at order time so a later menu price change
    -- never rewrites a bill already in progress.
    Name            NVARCHAR(150)   NOT NULL,
    Price           DECIMAL(12,2)   NOT NULL,
    Qty             DECIMAL(8,2)    NOT NULL,
    IsVeg           BIT             NOT NULL CONSTRAINT DF_OrderLineItem_IsVeg DEFAULT (0),
    ComboTag        NVARCHAR(100)   NULL,
    SpiceLevel      NVARCHAR(50)    NULL,
    Note            NVARCHAR(500)   NULL,
    SentToKitchen   BIT             NOT NULL CONSTRAINT DF_OrderLineItem_SentToKitchen DEFAULT (0),
    KitchenReady    BIT             NOT NULL CONSTRAINT DF_OrderLineItem_KitchenReady DEFAULT (0)
);
GO
CREATE INDEX IX_OrderLineItem_RoundId ON dbo.OrderLineItem(RoundId);
GO

CREATE TABLE dbo.OrderLineItemAddOn (
    OrderLineItemAddOnId   INT             IDENTITY(1,1) CONSTRAINT PK_OrderLineItemAddOn PRIMARY KEY,
    OrderLineItemId        INT             NOT NULL CONSTRAINT FK_OLIAddOn_OrderLineItem REFERENCES dbo.OrderLineItem(OrderLineItemId) ON DELETE CASCADE,
    Name                   NVARCHAR(150)   NOT NULL,
    Price                  DECIMAL(12,2)   NOT NULL
);
GO
CREATE INDEX IX_OLIAddOn_OrderLineItemId ON dbo.OrderLineItemAddOn(OrderLineItemId);
GO

/* ----------------------------------------------------------------------
   Payment — every payment recorded against an Order/OrderDetail, across
   however many billing cycles it's had.
   ------------------------------------------------------------------- */
CREATE TABLE dbo.Payment (
    PaymentId               INT             IDENTITY(1,1) CONSTRAINT PK_Payment PRIMARY KEY,
    OrderDetailId           INT             NOT NULL CONSTRAINT FK_Payment_OrderDetail REFERENCES dbo.OrderDetail(OrderDetailId),
    OrderId                 INT             NOT NULL CONSTRAINT FK_Payment_Order REFERENCES dbo.[Order](OrderId),
    -- Sales-credit owner — always the order's own waiter, never whoever
    -- is logged in when the payment is recorded.
    WaiterId                INT             NULL CONSTRAINT FK_Payment_Waiter REFERENCES dbo.Staff(StaffId),
    -- Who physically recorded/collected it (e.g. a cashier collecting on
    -- the waiter's behalf) — audit/display only, never sales credit.
    CollectedByStaffId      INT             NULL CONSTRAINT FK_Payment_CollectedBy REFERENCES dbo.Staff(StaffId),
    Method                  NVARCHAR(10)    NOT NULL
                                             CONSTRAINT CK_Payment_Method CHECK (Method IN ('mpesa','cash')),
    Amount                  DECIMAL(12,2)   NOT NULL,
    -- M-Pesa confirmation code. An empty/NULL reference on an 'mpesa'
    -- payment means it hasn't been verified yet — see
    -- fn_CyclePayments and usp_RecordPayment.
    Reference               NVARCHAR(100)   NOT NULL CONSTRAINT DF_Payment_Reference DEFAULT (''),
    CustomerName            NVARCHAR(150)   NULL,
    -- An M-Pesa payment sent to staff's personal number instead of the
    -- till — functionally cash in hand, owes a physical drop like cash.
    IsCashSubstitution      BIT             NULL,
    -- Which billing cycle (StartBilling call) this payment belongs to;
    -- a finalized cycle's payments must never be recounted toward a new
    -- one raised after it.
    BillingCycle            INT             NOT NULL CONSTRAINT DF_Payment_BillingCycle DEFAULT (1),
    PaidAt                  DATETIME2(3)    NOT NULL CONSTRAINT DF_Payment_PaidAt DEFAULT (SYSUTCDATETIME())
);
GO
CREATE INDEX IX_Payment_OrderDetailCycle ON dbo.Payment(OrderDetailId, BillingCycle);
CREATE INDEX IX_Payment_OrderId ON dbo.Payment(OrderId);
CREATE INDEX IX_Payment_WaiterId ON dbo.Payment(WaiterId, PaidAt);
CREATE INDEX IX_Payment_PaidAt ON dbo.Payment(PaidAt);
GO

/* ----------------------------------------------------------------------
   CashDrop — a waiter physically handing cash/M-Pesa-substitution money
   to the cashier.
   ------------------------------------------------------------------- */
CREATE TABLE dbo.CashDrop (
    CashDropId      INT             IDENTITY(1,1) CONSTRAINT PK_CashDrop PRIMARY KEY,
    WaiterId        INT             NOT NULL CONSTRAINT FK_CashDrop_Staff REFERENCES dbo.Staff(StaffId),
    -- What the cashier actually counted/confirmed in hand.
    Amount          DECIMAL(12,2)   NOT NULL,
    -- What was owed at the time of this drop (cash + M-Pesa substitution
    -- payments) — compared against Amount to flag variance.
    ExpectedAmount  DECIMAL(12,2)   NOT NULL,
    Method          NVARCHAR(10)    NOT NULL
                                     CONSTRAINT CK_CashDrop_Method CHECK (Method IN ('mpesa','cash')),
    Reference       NVARCHAR(100)   NULL,
    -- Required whenever Amount <> ExpectedAmount on the overage side —
    -- enforced in usp_RecordCashDrop, not by a CHECK (see its notes).
    Note            NVARCHAR(500)   NULL,
    DroppedAt       DATETIME2(3)    NOT NULL CONSTRAINT DF_CashDrop_DroppedAt DEFAULT (SYSUTCDATETIME())
);
GO
CREATE INDEX IX_CashDrop_WaiterId ON dbo.CashDrop(WaiterId, DroppedAt DESC);
CREATE INDEX IX_CashDrop_DroppedAt ON dbo.CashDrop(DroppedAt);
GO

/* ----------------------------------------------------------------------
   Receipt — the finalized, signed invoice for one billing cycle.
   ------------------------------------------------------------------- */
CREATE TABLE dbo.Receipt (
    ReceiptId       INT             IDENTITY(1,1) CONSTRAINT PK_Receipt PRIMARY KEY,
    InvoiceNumber   NVARCHAR(50)    NOT NULL,
    OrderId         INT             NOT NULL CONSTRAINT FK_Receipt_Order REFERENCES dbo.[Order](OrderId),
    OrderLabel      NVARCHAR(100)   NOT NULL,
    LocationNote    NVARCHAR(200)   NULL,
    Subtotal        DECIMAL(12,2)   NOT NULL,
    Vat             DECIMAL(12,2)   NOT NULL,
    Total           DECIMAL(12,2)   NOT NULL,
    -- Populated by the app after it calls the (currently simulated) eTIMS
    -- signing integration — NULL immediately after usp_FinalizeReceipt
    -- until that follow-up call completes.
    QrDataUrl       NVARCHAR(MAX)   NULL,
    IssuedAt        DATETIME2(3)    NOT NULL CONSTRAINT DF_Receipt_IssuedAt DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT UQ_Receipt_InvoiceNumber UNIQUE (InvoiceNumber)
);
GO
CREATE INDEX IX_Receipt_OrderId ON dbo.Receipt(OrderId);
GO

CREATE TABLE dbo.ReceiptLineItem (
    ReceiptLineItemId   INT             IDENTITY(1,1) CONSTRAINT PK_ReceiptLineItem PRIMARY KEY,
    ReceiptId           INT             NOT NULL CONSTRAINT FK_ReceiptLineItem_Receipt REFERENCES dbo.Receipt(ReceiptId) ON DELETE CASCADE,
    MenuItemId          INT             NOT NULL CONSTRAINT FK_ReceiptLineItem_MenuItem REFERENCES dbo.MenuItem(MenuItemId),
    Name                NVARCHAR(150)   NOT NULL,
    Qty                 DECIMAL(8,2)    NOT NULL,
    Price               DECIMAL(12,2)   NOT NULL,
    LineTotal           DECIMAL(12,2)   NOT NULL,
    RoundIndex          INT             NOT NULL
);
GO
CREATE INDEX IX_ReceiptLineItem_ReceiptId ON dbo.ReceiptLineItem(ReceiptId);
GO

CREATE TABLE dbo.ReceiptPaymentLine (
    ReceiptPaymentLineId    INT             IDENTITY(1,1) CONSTRAINT PK_ReceiptPaymentLine PRIMARY KEY,
    ReceiptId               INT             NOT NULL CONSTRAINT FK_ReceiptPaymentLine_Receipt REFERENCES dbo.Receipt(ReceiptId) ON DELETE CASCADE,
    Method                  NVARCHAR(10)    NOT NULL
                                             CONSTRAINT CK_ReceiptPaymentLine_Method CHECK (Method IN ('mpesa','cash')),
    Amount                  DECIMAL(12,2)   NOT NULL,
    Reference               NVARCHAR(100)   NOT NULL CONSTRAINT DF_ReceiptPaymentLine_Reference DEFAULT (''),
    CustomerName            NVARCHAR(150)   NULL
);
GO
CREATE INDEX IX_ReceiptPaymentLine_ReceiptId ON dbo.ReceiptPaymentLine(ReceiptId);
GO

/* ----------------------------------------------------------------------
   VoidEntry — an item removed from an order after being rung in.
   ------------------------------------------------------------------- */
CREATE TABLE dbo.VoidEntry (
    VoidEntryId     INT             IDENTITY(1,1) CONSTRAINT PK_VoidEntry PRIMARY KEY,
    OrderId         INT             NOT NULL CONSTRAINT FK_VoidEntry_Order REFERENCES dbo.[Order](OrderId),
    OrderDetailId   INT             NOT NULL CONSTRAINT FK_VoidEntry_OrderDetail REFERENCES dbo.OrderDetail(OrderDetailId),
    -- Nullable: the underlying line item row may itself have been removed;
    -- ItemName/Qty are kept denormalized so the audit trail survives that.
    OrderLineItemId INT             NULL CONSTRAINT FK_VoidEntry_OrderLineItem REFERENCES dbo.OrderLineItem(OrderLineItemId),
    ItemName        NVARCHAR(150)   NOT NULL,
    Qty             DECIMAL(8,2)    NOT NULL,
    Reason          NVARCHAR(500)   NOT NULL,
    StaffId         INT             NULL CONSTRAINT FK_VoidEntry_Staff REFERENCES dbo.Staff(StaffId),
    VoidedAt        DATETIME2(3)    NOT NULL CONSTRAINT DF_VoidEntry_VoidedAt DEFAULT (SYSUTCDATETIME())
);
GO
CREATE INDEX IX_VoidEntry_OrderId ON dbo.VoidEntry(OrderId);
GO
