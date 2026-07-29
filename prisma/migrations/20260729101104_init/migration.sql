-- CreateEnum
CREATE TYPE "Role" AS ENUM ('PENDING', 'ADMIN', 'PROCUREMENT', 'STORES', 'REVIEWER', 'SALES', 'VIEWER');

-- CreateEnum
CREATE TYPE "LookupDomain" AS ENUM ('PO_TYPE', 'PO_GRADE', 'TYPE_OF_STEEL', 'ITEM_TYPE', 'ITEM_NAME', 'VENDOR_NAME', 'MILL', 'WEB_COATING', 'COATING', 'WEB_TEMPER', 'TEMPER', 'GRADE', 'FINISH', 'ANNEALED_TYPE', 'COIL_ID', 'PRODUCT_CATEGORY', 'PURCHASE_TYPE', 'DELIVERY_LOCATION', 'STATE_NAME', 'UNLOADED_BY', 'REVIEWED_BY', 'BAY_LOCATION', 'SALES_TYPE', 'FACTORY_LOCATION', 'END_USE', 'OPERATOR', 'ASSISTANT_OPERATOR', 'ORIGIN', 'COIL_FEEDING_OPERATOR', 'ORDER_CATEGORY', 'SHIP_TO');

-- CreateEnum
CREATE TYPE "POStatus" AS ENUM ('OPEN', 'CLOSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ItemType" AS ENUM ('ETP', 'TFS', 'TMBP', 'A', 'OTHER');

-- CreateEnum
CREATE TYPE "ItemStatus" AS ENUM ('PENDING', 'MATCHED', 'RECEIVED');

-- CreateEnum
CREATE TYPE "MasterStockStatus" AS ENUM ('AVAILABLE', 'OFFERED', 'BOOKED', 'SOLD', 'CANCELLED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "role" "Role" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "LookupValue" (
    "id" TEXT NOT NULL,
    "domain" "LookupDomain" NOT NULL,
    "value" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,

    CONSTRAINT "LookupValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "alpha" TEXT,
    "legalName" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "address" TEXT,
    "gstin" TEXT,
    "zsplCode" TEXT,
    "location" TEXT,
    "stateName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoatingTemperMapping" (
    "id" TEXT NOT NULL,
    "coating" TEXT NOT NULL,
    "webCoating" TEXT NOT NULL,
    "temper" TEXT NOT NULL,
    "webTemper" DECIMAL(10,3) NOT NULL,

    CONSTRAINT "CoatingTemperMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PoSequence" (
    "fy" TEXT NOT NULL,
    "lastSeq" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PoSequence_pkey" PRIMARY KEY ("fy")
);

-- CreateTable
CREATE TABLE "SalesSequence" (
    "fy" TEXT NOT NULL,
    "lastSeq" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SalesSequence_pkey" PRIMARY KEY ("fy")
);

-- CreateTable
CREATE TABLE "ZsplSequence" (
    "key" TEXT NOT NULL DEFAULT 'global',
    "lastSeq" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ZsplSequence_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "PurchaseOrder" (
    "id" TEXT NOT NULL,
    "poNumber" TEXT NOT NULL,
    "poSeq" INTEGER NOT NULL,
    "fy" TEXT NOT NULL,
    "poDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "orderType" TEXT NOT NULL DEFAULT 'PO',
    "poType" TEXT NOT NULL,
    "poGrade" TEXT NOT NULL,
    "typeOfSteel" TEXT NOT NULL,
    "vendorName" TEXT NOT NULL,
    "shipTo" TEXT NOT NULL,
    "mill" TEXT NOT NULL,
    "orderCategory" TEXT NOT NULL,
    "status" "POStatus" NOT NULL DEFAULT 'OPEN',
    "remark" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemDetail" (
    "id" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "concatenateKey" TEXT NOT NULL,
    "itemType" "ItemType" NOT NULL,
    "thickness" DECIMAL(10,3) NOT NULL,
    "width" DECIMAL(10,3) NOT NULL,
    "length" DECIMAL(10,3) NOT NULL,
    "coating" TEXT NOT NULL,
    "temper" TEXT NOT NULL,
    "finish" TEXT NOT NULL,
    "grade" TEXT NOT NULL,
    "annealedType" TEXT,
    "vendorIdNo" TEXT,
    "qtyMt" DECIMAL(12,3) NOT NULL,
    "coilId" TEXT,
    "vendorName" TEXT NOT NULL,
    "steelType" TEXT NOT NULL,
    "purchasePrice" DECIMAL(12,2) NOT NULL,
    "productCategory" TEXT NOT NULL,
    "itemRemark" TEXT,
    "itemStatus" "ItemStatus" NOT NULL DEFAULT 'PENDING',
    "bundleCoil" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "sleeveType" TEXT,
    "endUse" TEXT,
    "poReportUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ItemDetail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InwardRecord" (
    "id" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "matchedItemId" TEXT,
    "concatenatedId" TEXT NOT NULL,
    "dispatchDate" TIMESTAMP(3),
    "itemType" TEXT NOT NULL,
    "grade" TEXT NOT NULL,
    "thickness" DECIMAL(10,3) NOT NULL,
    "width" DECIMAL(10,3) NOT NULL,
    "length" DECIMAL(10,3),
    "mill" TEXT NOT NULL,
    "coating" TEXT NOT NULL,
    "temper" TEXT NOT NULL,
    "finish" TEXT NOT NULL,
    "netWt" DECIMAL(12,3) NOT NULL,
    "coilLength" DECIMAL(10,3),
    "noOfSheets" INTEGER,
    "coilId" TEXT,
    "vendorName" TEXT NOT NULL,
    "vehicleNo" TEXT NOT NULL,
    "vendorIdNo" TEXT,
    "heatNo" TEXT,
    "millTc" TEXT,
    "webCoating" TEXT NOT NULL,
    "webTemper" DECIMAL(10,3) NOT NULL,
    "iGrWt" DECIMAL(12,3) NOT NULL,
    "inwardRemarks" TEXT,
    "bayLocation" TEXT,
    "purchaseType" TEXT NOT NULL,
    "unloadedBy" TEXT,
    "reviewBy" TEXT,
    "unloadTime" TIMESTAMP(3),
    "unloadedInwardNo" TEXT,
    "vendorInvoiceNo" TEXT,
    "vendorInvDate" TIMESTAMP(3),
    "bundleCoil" TEXT NOT NULL,
    "seq" INTEGER,
    "zsplId" TEXT NOT NULL,
    "annealedType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InwardRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MasterStock" (
    "id" TEXT NOT NULL,
    "inwardId" TEXT,
    "zsplId" TEXT NOT NULL,
    "vendorName" TEXT NOT NULL,
    "purchaseType" TEXT NOT NULL,
    "unloadDate" TIMESTAMP(3) NOT NULL,
    "itemType" TEXT NOT NULL,
    "mill" TEXT NOT NULL,
    "grade" TEXT NOT NULL,
    "thickness" DECIMAL(10,3) NOT NULL,
    "width" DECIMAL(10,3) NOT NULL,
    "length" DECIMAL(10,3) NOT NULL,
    "webCoating" TEXT NOT NULL,
    "coating" TEXT NOT NULL,
    "webTemper" DECIMAL(10,3) NOT NULL,
    "temper" TEXT NOT NULL,
    "finish" TEXT NOT NULL,
    "inwardRemarks" TEXT,
    "coilId" TEXT,
    "netWt" DECIMAL(12,3) NOT NULL,
    "noOfSheets" TEXT,
    "itemForm" TEXT NOT NULL,
    "purchasePrice" DECIMAL(12,2) NOT NULL,
    "salesDate" TIMESTAMP(3),
    "customerId" TEXT,
    "customerPoNo" TEXT,
    "customerPoDate" TIMESTAMP(3),
    "endUse" TEXT,
    "productionWeight" DECIMAL(12,3),
    "salePrice" DECIMAL(12,2),
    "salesRemark" TEXT,
    "requestedDeliveryDate" TIMESTAMP(3),
    "deliveryLocation" TEXT,
    "salesType" TEXT,
    "actualDispatchDate" TIMESTAMP(3),
    "availableWeight" DECIMAL(12,3) NOT NULL,
    "noOfSplits" INTEGER NOT NULL DEFAULT 0,
    "originalMasterStockId" TEXT,
    "status" "MasterStockStatus" NOT NULL DEFAULT 'AVAILABLE',
    "salesPoNumber" TEXT,
    "serialNumber" INTEGER,
    "annealed" TEXT,
    "coilLength" DECIMAL(10,3),
    "bayLocation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MasterStock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StatusHistory" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT NOT NULL,
    "changedBy" TEXT NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,

    CONSTRAINT "StatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE INDEX "LookupValue_domain_idx" ON "LookupValue"("domain");

-- CreateIndex
CREATE UNIQUE INDEX "LookupValue_domain_value_key" ON "LookupValue"("domain", "value");

-- CreateIndex
CREATE INDEX "Customer_legalName_idx" ON "Customer"("legalName");

-- CreateIndex
CREATE UNIQUE INDEX "CoatingTemperMapping_coating_key" ON "CoatingTemperMapping"("coating");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOrder_poNumber_key" ON "PurchaseOrder"("poNumber");

-- CreateIndex
CREATE INDEX "PurchaseOrder_fy_idx" ON "PurchaseOrder"("fy");

-- CreateIndex
CREATE INDEX "PurchaseOrder_status_idx" ON "PurchaseOrder"("status");

-- CreateIndex
CREATE INDEX "ItemDetail_purchaseOrderId_idx" ON "ItemDetail"("purchaseOrderId");

-- CreateIndex
CREATE INDEX "ItemDetail_concatenateKey_idx" ON "ItemDetail"("concatenateKey");

-- CreateIndex
CREATE UNIQUE INDEX "InwardRecord_zsplId_key" ON "InwardRecord"("zsplId");

-- CreateIndex
CREATE INDEX "InwardRecord_purchaseOrderId_idx" ON "InwardRecord"("purchaseOrderId");

-- CreateIndex
CREATE INDEX "InwardRecord_matchedItemId_idx" ON "InwardRecord"("matchedItemId");

-- CreateIndex
CREATE INDEX "InwardRecord_reviewBy_idx" ON "InwardRecord"("reviewBy");

-- CreateIndex
CREATE INDEX "MasterStock_status_idx" ON "MasterStock"("status");

-- CreateIndex
CREATE INDEX "MasterStock_customerId_idx" ON "MasterStock"("customerId");

-- CreateIndex
CREATE INDEX "MasterStock_originalMasterStockId_idx" ON "MasterStock"("originalMasterStockId");

-- CreateIndex
CREATE INDEX "MasterStock_zsplId_idx" ON "MasterStock"("zsplId");

-- CreateIndex
CREATE INDEX "StatusHistory_entityType_entityId_idx" ON "StatusHistory"("entityType", "entityId");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemDetail" ADD CONSTRAINT "ItemDetail_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InwardRecord" ADD CONSTRAINT "InwardRecord_matchedItemId_fkey" FOREIGN KEY ("matchedItemId") REFERENCES "ItemDetail"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MasterStock" ADD CONSTRAINT "MasterStock_inwardId_fkey" FOREIGN KEY ("inwardId") REFERENCES "InwardRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MasterStock" ADD CONSTRAINT "MasterStock_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MasterStock" ADD CONSTRAINT "MasterStock_originalMasterStockId_fkey" FOREIGN KEY ("originalMasterStockId") REFERENCES "MasterStock"("id") ON DELETE SET NULL ON UPDATE CASCADE;
