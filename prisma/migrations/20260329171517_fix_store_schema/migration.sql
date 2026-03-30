/*
  Warnings:

  - You are about to drop the column `checkInTime` on the `Attendance` table. All the data in the column will be lost.
  - You are about to drop the column `checkOutTime` on the `Attendance` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `Attendance` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Attendance` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `Attendance` table. All the data in the column will be lost.
  - You are about to drop the column `email` on the `MR` table. All the data in the column will be lost.
  - You are about to drop the column `phone` on the `MR` table. All the data in the column will be lost.
  - You are about to drop the column `storeId` on the `MR` table. All the data in the column will be lost.
  - You are about to drop the column `territory` on the `MR` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `MR` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `MR` table. All the data in the column will be lost.
  - You are about to drop the column `price` on the `Sale` table. All the data in the column will be lost.
  - You are about to drop the column `productName` on the `Sale` table. All the data in the column will be lost.
  - You are about to drop the column `quantity` on the `Sale` table. All the data in the column will be lost.
  - You are about to drop the column `saleDate` on the `Sale` table. All the data in the column will be lost.
  - You are about to drop the column `totalAmount` on the `Sale` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Sale` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `Sale` table. All the data in the column will be lost.
  - You are about to drop the column `expiryDate` on the `Stock` table. All the data in the column will be lost.
  - You are about to drop the column `maxQuantity` on the `Stock` table. All the data in the column will be lost.
  - You are about to drop the column `minQuantity` on the `Stock` table. All the data in the column will be lost.
  - You are about to drop the column `productName` on the `Stock` table. All the data in the column will be lost.
  - You are about to drop the column `quantity` on the `Stock` table. All the data in the column will be lost.
  - You are about to drop the column `storeId` on the `Stock` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Stock` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `Stock` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Store` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `Store` table. All the data in the column will be lost.
  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[medicineName]` on the table `Stock` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name]` on the table `Store` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `photo` to the `Attendance` table without a default value. This is not possible if the table is not empty.
  - Made the column `mrId` on table `Attendance` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `salary` to the `MR` table without a default value. This is not possible if the table is not empty.
  - Added the required column `date` to the `Sale` table without a default value. This is not possible if the table is not empty.
  - Added the required column `photo` to the `Sale` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalSales` to the `Sale` table without a default value. This is not possible if the table is not empty.
  - Made the column `storeId` on table `Sale` required. This step will fail if there are existing NULL values in that column.
  - Made the column `mrId` on table `Sale` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `dealerName` to the `Stock` table without a default value. This is not possible if the table is not empty.
  - Added the required column `medicineName` to the `Stock` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalQuantity` to the `Stock` table without a default value. This is not possible if the table is not empty.
  - Made the column `address` on table `Store` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE `Attendance` DROP FOREIGN KEY `Attendance_mrId_fkey`;

-- DropForeignKey
ALTER TABLE `Attendance` DROP FOREIGN KEY `Attendance_userId_fkey`;

-- DropForeignKey
ALTER TABLE `MR` DROP FOREIGN KEY `MR_storeId_fkey`;

-- DropForeignKey
ALTER TABLE `MR` DROP FOREIGN KEY `MR_userId_fkey`;

-- DropForeignKey
ALTER TABLE `Sale` DROP FOREIGN KEY `Sale_mrId_fkey`;

-- DropForeignKey
ALTER TABLE `Sale` DROP FOREIGN KEY `Sale_storeId_fkey`;

-- DropForeignKey
ALTER TABLE `Sale` DROP FOREIGN KEY `Sale_userId_fkey`;

-- DropForeignKey
ALTER TABLE `Stock` DROP FOREIGN KEY `Stock_storeId_fkey`;

-- DropForeignKey
ALTER TABLE `Stock` DROP FOREIGN KEY `Stock_userId_fkey`;

-- DropForeignKey
ALTER TABLE `Store` DROP FOREIGN KEY `Store_userId_fkey`;

-- DropIndex
DROP INDEX `MR_email_key` ON `MR`;

-- AlterTable
ALTER TABLE `Attendance` DROP COLUMN `checkInTime`,
    DROP COLUMN `checkOutTime`,
    DROP COLUMN `createdAt`,
    DROP COLUMN `updatedAt`,
    DROP COLUMN `userId`,
    ADD COLUMN `photo` VARCHAR(191) NOT NULL,
    MODIFY `mrId` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `MR` DROP COLUMN `email`,
    DROP COLUMN `phone`,
    DROP COLUMN `storeId`,
    DROP COLUMN `territory`,
    DROP COLUMN `updatedAt`,
    DROP COLUMN `userId`,
    ADD COLUMN `salary` DOUBLE NOT NULL;

-- AlterTable
ALTER TABLE `Sale` DROP COLUMN `price`,
    DROP COLUMN `productName`,
    DROP COLUMN `quantity`,
    DROP COLUMN `saleDate`,
    DROP COLUMN `totalAmount`,
    DROP COLUMN `updatedAt`,
    DROP COLUMN `userId`,
    ADD COLUMN `date` DATETIME(3) NOT NULL,
    ADD COLUMN `photo` VARCHAR(191) NOT NULL,
    ADD COLUMN `totalSales` DOUBLE NOT NULL,
    MODIFY `storeId` INTEGER NOT NULL,
    MODIFY `mrId` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `Stock` DROP COLUMN `expiryDate`,
    DROP COLUMN `maxQuantity`,
    DROP COLUMN `minQuantity`,
    DROP COLUMN `productName`,
    DROP COLUMN `quantity`,
    DROP COLUMN `storeId`,
    DROP COLUMN `updatedAt`,
    DROP COLUMN `userId`,
    ADD COLUMN `dateAdded` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `dealerName` VARCHAR(191) NOT NULL,
    ADD COLUMN `medicineName` VARCHAR(191) NOT NULL,
    ADD COLUMN `totalQuantity` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `Store` DROP COLUMN `updatedAt`,
    DROP COLUMN `userId`,
    MODIFY `address` VARCHAR(191) NOT NULL;

-- DropTable
DROP TABLE `User`;

-- CreateTable
CREATE TABLE `MRStore` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `mrId` INTEGER NOT NULL,
    `storeId` INTEGER NOT NULL,

    INDEX `MRStore_mrId_idx`(`mrId`),
    INDEX `MRStore_storeId_idx`(`storeId`),
    UNIQUE INDEX `MRStore_mrId_storeId_key`(`mrId`, `storeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SaleDetail` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `saleId` INTEGER NOT NULL,
    `medicineName` VARCHAR(191) NOT NULL,
    `quantity` INTEGER NOT NULL,
    `price` DOUBLE NOT NULL,
    `totalPrice` DOUBLE NOT NULL,
    `date` DATETIME(3) NOT NULL,

    INDEX `SaleDetail_saleId_idx`(`saleId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Address` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `address_line1` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Attendance_date_idx` ON `Attendance`(`date`);

-- CreateIndex
CREATE INDEX `Sale_date_idx` ON `Sale`(`date`);

-- CreateIndex
CREATE UNIQUE INDEX `Stock_medicineName_key` ON `Stock`(`medicineName`);

-- CreateIndex
CREATE INDEX `Stock_medicineName_idx` ON `Stock`(`medicineName`);

-- CreateIndex
CREATE UNIQUE INDEX `Store_name_key` ON `Store`(`name`);

-- AddForeignKey
ALTER TABLE `MRStore` ADD CONSTRAINT `MRStore_mrId_fkey` FOREIGN KEY (`mrId`) REFERENCES `MR`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MRStore` ADD CONSTRAINT `MRStore_storeId_fkey` FOREIGN KEY (`storeId`) REFERENCES `Store`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Sale` ADD CONSTRAINT `Sale_mrId_fkey` FOREIGN KEY (`mrId`) REFERENCES `MR`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Sale` ADD CONSTRAINT `Sale_storeId_fkey` FOREIGN KEY (`storeId`) REFERENCES `Store`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SaleDetail` ADD CONSTRAINT `SaleDetail_saleId_fkey` FOREIGN KEY (`saleId`) REFERENCES `Sale`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Attendance` ADD CONSTRAINT `Attendance_mrId_fkey` FOREIGN KEY (`mrId`) REFERENCES `MR`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- RenameIndex
ALTER TABLE `Attendance` RENAME INDEX `Attendance_mrId_fkey` TO `Attendance_mrId_idx`;

-- RenameIndex
ALTER TABLE `Sale` RENAME INDEX `Sale_mrId_fkey` TO `Sale_mrId_idx`;

-- RenameIndex
ALTER TABLE `Sale` RENAME INDEX `Sale_storeId_fkey` TO `Sale_storeId_idx`;
