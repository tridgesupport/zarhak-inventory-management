-- CreateEnum
CREATE TYPE "ProductionStatus" AS ENUM ('INPUT_CUT_LENGTH', 'PENDING_PRODUCTION', 'COMPLETED');

-- CreateEnum
CREATE TYPE "BundleStatus" AS ENUM ('PENDING', 'APPROVED');

-- CreateEnum
CREATE TYPE "SlittingProductionStatus" AS ENUM ('PENDING', 'COMPLETED');

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "message" TEXT NOT NULL,
    "link" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkOrderSequence" (
    "year" INTEGER NOT NULL,
    "lastSeq" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "WorkOrderSequence_pkey" PRIMARY KEY ("year")
);

-- CreateTable
CREATE TABLE "CuttingOrderSummary" (
    "id" TEXT NOT NULL,
    "workOrderNo" TEXT,
    "salesOrderNo" TEXT,
    "salesOrderDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "masterStockId" TEXT NOT NULL,
    "customerId" TEXT,
    "zsplId" TEXT NOT NULL,
    "itemType" TEXT NOT NULL,
    "grade" TEXT NOT NULL,
    "mill" TEXT NOT NULL,
    "thickness" DECIMAL(10,3) NOT NULL,
    "width" DECIMAL(10,3) NOT NULL,
    "length" DECIMAL(10,3),
    "coating" TEXT NOT NULL,
    "temper" TEXT NOT NULL,
    "finish" TEXT NOT NULL,
    "netWt" DECIMAL(12,3) NOT NULL,
    "productionWt" DECIMAL(12,3),
    "soldPrice" DECIMAL(12,2),
    "salesRemark" TEXT,
    "requestedDeliveryDate" TIMESTAMP(3),
    "productionPlanDate" TIMESTAMP(3),
    "productionStatus" "ProductionStatus" NOT NULL DEFAULT 'INPUT_CUT_LENGTH',
    "packingType" TEXT,
    "noOfSheetsPerPallet" DECIMAL(10,2),
    "wtPerBundle" DECIMAL(10,3),
    "noOfBundles" INTEGER DEFAULT 1,
    "productionSequence" INTEGER,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "bayLocation" TEXT,
    "coilId" TEXT,
    "coilLength" DECIMAL(10,3),
    "availableWeight" DECIMAL(12,3) NOT NULL,
    "noOfSplits" INTEGER NOT NULL DEFAULT 0,
    "originalCuttingOrderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CuttingOrderSummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MachineProduction" (
    "id" TEXT NOT NULL,
    "cuttingOrderId" TEXT NOT NULL,
    "shift" TEXT,
    "mainOperator" TEXT,
    "assistantOperator" TEXT,
    "coilFeedingOperator" TEXT,
    "setupStartTime" TIMESTAMP(3),
    "productionStartTime" TIMESTAMP(3),
    "productionEndTime" TIMESTAMP(3),
    "feedingType" TEXT,
    "actualNetWeight" DECIMAL(12,3),
    "actualWidth" DECIMAL(10,3),
    "actualThickness" DECIMAL(10,3),
    "tolerance" DECIMAL(10,3),
    "squareness" TEXT,
    "bowEntry" DECIMAL(10,3),
    "bowExit" DECIMAL(10,3),
    "speed" TEXT,
    "palletReady" BOOLEAN NOT NULL DEFAULT false,
    "breakdown" BOOLEAN NOT NULL DEFAULT false,
    "breakdownRemark" TEXT,
    "quality" BOOLEAN NOT NULL DEFAULT false,
    "qualityRemark" TEXT,
    "actualCoilLength" DECIMAL(10,3),
    "totalSheets" INTEGER,
    "totalPrimeSheets" INTEGER,
    "totalRejectSheets" INTEGER,
    "pinhole" INTEGER,
    "undergauge" TEXT,
    "overgauge" TEXT,
    "visualDefects" TEXT,
    "partCoil" TEXT,
    "downtime" DECIMAL(10,2),
    "palletRemark" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "MachineProduction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QualityData" (
    "id" TEXT NOT NULL,
    "cuttingOrderId" TEXT NOT NULL,
    "hardness" DECIMAL(10,2),
    "actualTemper" TEXT,
    "cuppingValue" DECIMAL(10,3),
    "sheetSize" DECIMAL(10,2),
    "bow" TEXT,
    "squareness" TEXT,
    "defectsObserved" TEXT,
    "underDeviationApproval" BOOLEAN NOT NULL DEFAULT false,
    "loadPictureUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "QualityData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BundlewiseData" (
    "id" TEXT NOT NULL,
    "cuttingOrderId" TEXT NOT NULL,
    "bundleIdNo" TEXT NOT NULL,
    "cutLength" DECIMAL(10,3),
    "coilNetWt" DECIMAL(12,3),
    "productionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "preparedBy" TEXT,
    "reviewedBy" TEXT,
    "noOfSheets" INTEGER,
    "palletWeight" DECIMAL(10,3),
    "grossBundleWt" DECIMAL(12,3),
    "netBundleWt" DECIMAL(12,3),
    "status" "BundleStatus" NOT NULL DEFAULT 'PENDING',
    "availableWeight" DECIMAL(12,3) NOT NULL,
    "noOfSplits" INTEGER NOT NULL DEFAULT 0,
    "originalBundleId" TEXT,
    "dispatchLocation" TEXT,
    "doNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "BundlewiseData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SlittingOrderSummary" (
    "id" TEXT NOT NULL,
    "workOrderNo" TEXT,
    "salesOrderNo" TEXT,
    "salesOrderDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "masterStockId" TEXT NOT NULL,
    "customerId" TEXT,
    "zsplId" TEXT NOT NULL,
    "itemType" TEXT NOT NULL,
    "grade" TEXT NOT NULL,
    "mill" TEXT,
    "thickness" DECIMAL(10,3) NOT NULL,
    "width" DECIMAL(10,3) NOT NULL,
    "coating" TEXT NOT NULL,
    "temper" TEXT NOT NULL,
    "finish" TEXT NOT NULL,
    "netWt" DECIMAL(12,3) NOT NULL,
    "productionWt" DECIMAL(12,3),
    "soldPrice" DECIMAL(12,2),
    "salesRemark" TEXT,
    "requiredDeliveryDate" TIMESTAMP(3),
    "slit1" DECIMAL(10,3),
    "slit2" DECIMAL(10,3),
    "slit3" DECIMAL(10,3),
    "slit4" DECIMAL(10,3),
    "noOfSlit1" INTEGER,
    "noOfSlit2" INTEGER,
    "noOfSlit3" INTEGER,
    "noOfSlit4" INTEGER,
    "productionPlanDate" TIMESTAMP(3),
    "vendorName" TEXT,
    "productionStatus" "SlittingProductionStatus" NOT NULL DEFAULT 'PENDING',
    "numberOfBundles" INTEGER,
    "jobWorkVendorName" TEXT,
    "truckNo" TEXT,
    "slittingCustomerMasterSerial1" TEXT,
    "slittingCustomerMasterSerial2" TEXT,
    "slittingCustomerMasterSerial3" TEXT,
    "slittingCustomerMasterSerial4" TEXT,
    "bayLocation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SlittingOrderSummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SlittingProductionData" (
    "id" TEXT NOT NULL,
    "slittingOrderId" TEXT NOT NULL,
    "bundleIdNo" TEXT NOT NULL,
    "slitWidth" DECIMAL(10,3),
    "noOfSlitCoils" INTEGER,
    "netWt" DECIMAL(12,3),
    "grossWt" DECIMAL(12,3),
    "availableWeight" DECIMAL(12,3) NOT NULL,
    "noOfSplits" INTEGER NOT NULL DEFAULT 0,
    "originalSlitId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "SlittingProductionData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SlittingCustomerMaster" (
    "id" TEXT NOT NULL,
    "thickness" DECIMAL(10,3) NOT NULL,
    "slittingSize" DECIMAL(10,3),
    "widthTolerance" TEXT,
    "noOfSlitPerPallet" INTEGER NOT NULL,
    "slitWt" TEXT,
    "slitCoilId" TEXT,
    "slitStrapingType" TEXT,
    "documentReference" TEXT,
    "customerName" TEXT,
    "palletSize" TEXT,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SlittingCustomerMaster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TradingSummary" (
    "id" TEXT NOT NULL,
    "masterStockId" TEXT NOT NULL,
    "salesOrderNo" TEXT,
    "customerId" TEXT,
    "zsplId" TEXT NOT NULL,
    "itemType" TEXT NOT NULL,
    "grade" TEXT NOT NULL,
    "mill" TEXT,
    "thickness" DECIMAL(10,3) NOT NULL,
    "width" DECIMAL(10,3) NOT NULL,
    "length" DECIMAL(10,3),
    "coating" TEXT NOT NULL,
    "temper" TEXT NOT NULL,
    "finish" TEXT NOT NULL,
    "noOfSheets" TEXT,
    "netWeight" DECIMAL(12,3) NOT NULL,
    "grossWeight" DECIMAL(12,3),
    "dispatchLocation" TEXT,
    "doNo" TEXT,
    "doDate" TIMESTAMP(3),
    "availableWeight" DECIMAL(12,3) NOT NULL,
    "noOfSplits" INTEGER NOT NULL DEFAULT 0,
    "originalTradingId" TEXT,
    "itemForm" TEXT,
    "bayLocation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TradingSummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transporter" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "gstNo" TEXT,

    CONSTRAINT "Transporter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DispatchSummary" (
    "id" TEXT NOT NULL,
    "cuttingBundleId" TEXT,
    "slittingProductionId" TEXT,
    "tradingId" TEXT,
    "cuttingOrderId" TEXT,
    "slittingOrderId" TEXT,
    "doNumber" TEXT NOT NULL,
    "doDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "customerId" TEXT,
    "finalZsplId" TEXT,
    "itemType" TEXT,
    "thickness" DECIMAL(10,3),
    "width" DECIMAL(10,3),
    "cutLength" DECIMAL(10,3),
    "origin" TEXT,
    "coating" TEXT,
    "temper" TEXT,
    "finish" TEXT,
    "netWeight" DECIMAL(12,3),
    "grossWeight" DECIMAL(12,3),
    "numberOfSheets" INTEGER,
    "bundleNetWeight" DECIMAL(12,3),
    "remarks" TEXT,
    "dispatchStatus" TEXT NOT NULL DEFAULT 'Pending',
    "buyerId" TEXT,
    "consigneeId" TEXT,
    "transporterName" TEXT,
    "vehicleNumber" TEXT,
    "lorryWeight" DECIMAL(10,2),
    "packingListCreated" BOOLEAN NOT NULL DEFAULT false,
    "packingListUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "DispatchSummary_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");

-- CreateIndex
CREATE INDEX "Notification_userId_read_idx" ON "Notification"("userId", "read");

-- CreateIndex
CREATE INDEX "CuttingOrderSummary_productionStatus_idx" ON "CuttingOrderSummary"("productionStatus");

-- CreateIndex
CREATE INDEX "CuttingOrderSummary_masterStockId_idx" ON "CuttingOrderSummary"("masterStockId");

-- CreateIndex
CREATE INDEX "CuttingOrderSummary_originalCuttingOrderId_idx" ON "CuttingOrderSummary"("originalCuttingOrderId");

-- CreateIndex
CREATE INDEX "MachineProduction_cuttingOrderId_idx" ON "MachineProduction"("cuttingOrderId");

-- CreateIndex
CREATE INDEX "QualityData_cuttingOrderId_idx" ON "QualityData"("cuttingOrderId");

-- CreateIndex
CREATE INDEX "BundlewiseData_cuttingOrderId_idx" ON "BundlewiseData"("cuttingOrderId");

-- CreateIndex
CREATE INDEX "BundlewiseData_status_idx" ON "BundlewiseData"("status");

-- CreateIndex
CREATE INDEX "BundlewiseData_originalBundleId_idx" ON "BundlewiseData"("originalBundleId");

-- CreateIndex
CREATE INDEX "SlittingOrderSummary_productionStatus_idx" ON "SlittingOrderSummary"("productionStatus");

-- CreateIndex
CREATE INDEX "SlittingOrderSummary_masterStockId_idx" ON "SlittingOrderSummary"("masterStockId");

-- CreateIndex
CREATE INDEX "SlittingProductionData_slittingOrderId_idx" ON "SlittingProductionData"("slittingOrderId");

-- CreateIndex
CREATE INDEX "SlittingProductionData_originalSlitId_idx" ON "SlittingProductionData"("originalSlitId");

-- CreateIndex
CREATE INDEX "TradingSummary_masterStockId_idx" ON "TradingSummary"("masterStockId");

-- CreateIndex
CREATE INDEX "TradingSummary_originalTradingId_idx" ON "TradingSummary"("originalTradingId");

-- CreateIndex
CREATE UNIQUE INDEX "Transporter_name_key" ON "Transporter"("name");

-- CreateIndex
CREATE INDEX "DispatchSummary_doNumber_idx" ON "DispatchSummary"("doNumber");

-- CreateIndex
CREATE INDEX "DispatchSummary_dispatchStatus_idx" ON "DispatchSummary"("dispatchStatus");

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CuttingOrderSummary" ADD CONSTRAINT "CuttingOrderSummary_masterStockId_fkey" FOREIGN KEY ("masterStockId") REFERENCES "MasterStock"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CuttingOrderSummary" ADD CONSTRAINT "CuttingOrderSummary_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CuttingOrderSummary" ADD CONSTRAINT "CuttingOrderSummary_originalCuttingOrderId_fkey" FOREIGN KEY ("originalCuttingOrderId") REFERENCES "CuttingOrderSummary"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MachineProduction" ADD CONSTRAINT "MachineProduction_cuttingOrderId_fkey" FOREIGN KEY ("cuttingOrderId") REFERENCES "CuttingOrderSummary"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QualityData" ADD CONSTRAINT "QualityData_cuttingOrderId_fkey" FOREIGN KEY ("cuttingOrderId") REFERENCES "CuttingOrderSummary"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BundlewiseData" ADD CONSTRAINT "BundlewiseData_cuttingOrderId_fkey" FOREIGN KEY ("cuttingOrderId") REFERENCES "CuttingOrderSummary"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BundlewiseData" ADD CONSTRAINT "BundlewiseData_originalBundleId_fkey" FOREIGN KEY ("originalBundleId") REFERENCES "BundlewiseData"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SlittingOrderSummary" ADD CONSTRAINT "SlittingOrderSummary_masterStockId_fkey" FOREIGN KEY ("masterStockId") REFERENCES "MasterStock"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SlittingOrderSummary" ADD CONSTRAINT "SlittingOrderSummary_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SlittingProductionData" ADD CONSTRAINT "SlittingProductionData_slittingOrderId_fkey" FOREIGN KEY ("slittingOrderId") REFERENCES "SlittingOrderSummary"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SlittingProductionData" ADD CONSTRAINT "SlittingProductionData_originalSlitId_fkey" FOREIGN KEY ("originalSlitId") REFERENCES "SlittingProductionData"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradingSummary" ADD CONSTRAINT "TradingSummary_masterStockId_fkey" FOREIGN KEY ("masterStockId") REFERENCES "MasterStock"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradingSummary" ADD CONSTRAINT "TradingSummary_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradingSummary" ADD CONSTRAINT "TradingSummary_originalTradingId_fkey" FOREIGN KEY ("originalTradingId") REFERENCES "TradingSummary"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispatchSummary" ADD CONSTRAINT "DispatchSummary_cuttingBundleId_fkey" FOREIGN KEY ("cuttingBundleId") REFERENCES "BundlewiseData"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispatchSummary" ADD CONSTRAINT "DispatchSummary_slittingProductionId_fkey" FOREIGN KEY ("slittingProductionId") REFERENCES "SlittingProductionData"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispatchSummary" ADD CONSTRAINT "DispatchSummary_tradingId_fkey" FOREIGN KEY ("tradingId") REFERENCES "TradingSummary"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispatchSummary" ADD CONSTRAINT "DispatchSummary_cuttingOrderId_fkey" FOREIGN KEY ("cuttingOrderId") REFERENCES "CuttingOrderSummary"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispatchSummary" ADD CONSTRAINT "DispatchSummary_slittingOrderId_fkey" FOREIGN KEY ("slittingOrderId") REFERENCES "SlittingOrderSummary"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispatchSummary" ADD CONSTRAINT "DispatchSummary_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispatchSummary" ADD CONSTRAINT "DispatchSummary_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispatchSummary" ADD CONSTRAINT "DispatchSummary_consigneeId_fkey" FOREIGN KEY ("consigneeId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
