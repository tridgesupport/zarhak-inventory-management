-- AddForeignKey
ALTER TABLE "InwardRecord" ADD CONSTRAINT "InwardRecord_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
