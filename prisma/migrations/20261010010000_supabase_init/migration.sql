-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'MANAGER');

-- CreateEnum
CREATE TYPE "EmployeeStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "ServiceType" AS ENUM ('REGULAR_CLEANING', 'DEEP_CLEANING', 'END_OF_TENANCY', 'MOVE_IN_MOVE_OUT', 'OTHER');

-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM ('CLEANING_PRODUCTS', 'TRANSPORTATION', 'EQUIPMENT', 'SUPPLIES', 'OTHER');

-- CreateEnum
CREATE TYPE "ExpenseOrigin" AS ENUM ('MANUAL', 'SERVICE_PRODUCTS', 'SERVICE_OTHER');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID');

-- CreateEnum
CREATE TYPE "PaymentItemKind" AS ENUM ('WORK', 'REIMBURSEMENT');

-- CreateEnum
CREATE TYPE "PaymentDay" AS ENUM ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'ADMIN',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "tokenVersion" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "defaultRate" INTEGER NOT NULL,
    "status" "EmployeeStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Service" (
    "id" TEXT NOT NULL,
    "serviceDate" TIMESTAMP(3) NOT NULL,
    "propertyAddress" TEXT NOT NULL,
    "serviceType" "ServiceType" NOT NULL,
    "clientName" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "revenue" INTEGER NOT NULL,
    "employeePayment" INTEGER NOT NULL,
    "cleaningProductsCost" INTEGER NOT NULL DEFAULT 0,
    "otherExpenses" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "category" "ExpenseCategory" NOT NULL,
    "description" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "employeeId" TEXT,
    "serviceId" TEXT,
    "reimbursable" BOOLEAN NOT NULL DEFAULT false,
    "origin" "ExpenseOrigin" NOT NULL DEFAULT 'MANUAL',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "installment" INTEGER NOT NULL DEFAULT 1,
    "serviceCount" INTEGER NOT NULL DEFAULT 0,
    "workEarnings" INTEGER NOT NULL,
    "reimbursements" INTEGER NOT NULL,
    "totalAmount" INTEGER NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PAID',
    "paymentDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentItem" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "serviceId" TEXT,
    "expenseId" TEXT,
    "kind" "PaymentItemKind" NOT NULL,
    "amount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanySettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "companyName" TEXT NOT NULL DEFAULT 'CMH Cleaning',
    "currency" TEXT NOT NULL DEFAULT 'GBP',
    "defaultPaymentDay" "PaymentDay" NOT NULL DEFAULT 'SATURDAY',
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanySettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_email_key" ON "Employee"("email");

-- CreateIndex
CREATE INDEX "Service_serviceDate_idx" ON "Service"("serviceDate");

-- CreateIndex
CREATE INDEX "Service_employeeId_idx" ON "Service"("employeeId");

-- CreateIndex
CREATE INDEX "Service_clientName_idx" ON "Service"("clientName");

-- CreateIndex
CREATE INDEX "Expense_date_idx" ON "Expense"("date");

-- CreateIndex
CREATE INDEX "Expense_employeeId_idx" ON "Expense"("employeeId");

-- CreateIndex
CREATE INDEX "Expense_serviceId_idx" ON "Expense"("serviceId");

-- CreateIndex
CREATE INDEX "Expense_origin_idx" ON "Expense"("origin");

-- CreateIndex
CREATE INDEX "Payment_paymentDate_idx" ON "Payment"("paymentDate");

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "Payment"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_employeeId_periodStart_periodEnd_installment_key" ON "Payment"("employeeId", "periodStart", "periodEnd", "installment");

-- CreateIndex
CREATE INDEX "PaymentItem_serviceId_idx" ON "PaymentItem"("serviceId");

-- CreateIndex
CREATE INDEX "PaymentItem_expenseId_idx" ON "PaymentItem"("expenseId");

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentItem" ADD CONSTRAINT "PaymentItem_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentItem" ADD CONSTRAINT "PaymentItem_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentItem" ADD CONSTRAINT "PaymentItem_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "Expense"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Money stays a non-negative number of pence. These match the previous company database rules.
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_defaultRate_check" CHECK ("defaultRate" >= 0);
ALTER TABLE "Service" ADD CONSTRAINT "Service_revenue_check" CHECK ("revenue" >= 0);
ALTER TABLE "Service" ADD CONSTRAINT "Service_employeePayment_check" CHECK ("employeePayment" >= 0);
ALTER TABLE "Service" ADD CONSTRAINT "Service_cleaningProductsCost_check" CHECK ("cleaningProductsCost" >= 0);
ALTER TABLE "Service" ADD CONSTRAINT "Service_otherExpenses_check" CHECK ("otherExpenses" >= 0);
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_amount_check" CHECK ("amount" > 0);
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_installment_check" CHECK ("installment" >= 1);
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_serviceCount_check" CHECK ("serviceCount" >= 0);
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_workEarnings_check" CHECK ("workEarnings" >= 0);
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_reimbursements_check" CHECK ("reimbursements" >= 0);
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_totalAmount_check" CHECK ("totalAmount" >= 0);
ALTER TABLE "PaymentItem" ADD CONSTRAINT "PaymentItem_amount_check" CHECK ("amount" >= 0);
