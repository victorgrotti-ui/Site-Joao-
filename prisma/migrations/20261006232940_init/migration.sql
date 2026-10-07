-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'ADMIN',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fullName" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "defaultRate" INTEGER NOT NULL CHECK ("defaultRate" >= 0),
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Service" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "serviceDate" DATETIME NOT NULL,
    "propertyAddress" TEXT NOT NULL,
    "serviceType" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "revenue" INTEGER NOT NULL CHECK ("revenue" >= 0),
    "employeePayment" INTEGER NOT NULL CHECK ("employeePayment" >= 0),
    "cleaningProductsCost" INTEGER NOT NULL DEFAULT 0 CHECK ("cleaningProductsCost" >= 0),
    "otherExpenses" INTEGER NOT NULL DEFAULT 0 CHECK ("otherExpenses" >= 0),
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Service_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" INTEGER NOT NULL CHECK ("amount" > 0),
    "employeeId" TEXT,
    "serviceId" TEXT,
    "reimbursable" BOOLEAN NOT NULL DEFAULT false,
    "origin" TEXT NOT NULL DEFAULT 'MANUAL',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Expense_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Expense_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeId" TEXT NOT NULL,
    "periodStart" DATETIME NOT NULL,
    "periodEnd" DATETIME NOT NULL,
    "installment" INTEGER NOT NULL DEFAULT 1 CHECK ("installment" >= 1),
    "serviceCount" INTEGER NOT NULL DEFAULT 0 CHECK ("serviceCount" >= 0),
    "workEarnings" INTEGER NOT NULL CHECK ("workEarnings" >= 0),
    "reimbursements" INTEGER NOT NULL CHECK ("reimbursements" >= 0),
    "totalAmount" INTEGER NOT NULL CHECK ("totalAmount" >= 0),
    "status" TEXT NOT NULL DEFAULT 'PAID',
    "paymentDate" DATETIME,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Payment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PaymentItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "paymentId" TEXT NOT NULL,
    "serviceId" TEXT,
    "expenseId" TEXT,
    "kind" TEXT NOT NULL,
    "amount" INTEGER NOT NULL CHECK ("amount" >= 0),
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PaymentItem_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PaymentItem_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PaymentItem_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "Expense" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CompanySettings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
    "companyName" TEXT NOT NULL DEFAULT 'CMH Cleaning',
    "currency" TEXT NOT NULL DEFAULT 'GBP',
    "defaultPaymentDay" TEXT NOT NULL DEFAULT 'SATURDAY',
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
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
