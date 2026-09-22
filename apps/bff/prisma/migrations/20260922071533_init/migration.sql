-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('EDITOR', 'REVIEWER', 'VIEWER');

-- CreateEnum
CREATE TYPE "SchemeStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PricingMode" AS ENUM ('UNIT_PRICE', 'TOTAL_POOL');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schemes" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "pricing_mode" "PricingMode" NOT NULL,
    "effective_date" TIMESTAMP(3) NOT NULL,
    "remark" TEXT,
    "status" "SchemeStatus" NOT NULL DEFAULT 'DRAFT',
    "owner_id" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "edit_version" INTEGER NOT NULL DEFAULT 1,
    "current_version_no" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "schemes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "schemes_code_key" ON "schemes"("code");

-- CreateIndex
CREATE INDEX "schemes_status_updated_at_idx" ON "schemes"("status", "updated_at");

-- CreateIndex
CREATE INDEX "schemes_owner_id_idx" ON "schemes"("owner_id");

-- AddForeignKey
ALTER TABLE "schemes" ADD CONSTRAINT "schemes_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
