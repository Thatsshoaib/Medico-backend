/*
  Warnings:

  - You are about to drop the column `photo` on the `Attendance` table. All the data in the column will be lost.
  - You are about to drop the column `date` on the `Sale` table. All the data in the column will be lost.
  - You are about to drop the column `photo` on the `Sale` table. All the data in the column will be lost.
  - You are about to drop the column `totalSales` on the `Sale` table. All the data in the column will be lost.
  - You are about to drop the column `dateAdded` on the `Stock` table. All the data in the column will be lost.
  - You are about to drop the column `dealerName` on the `Stock` table. All the data in the column will be lost.
  - You are about to drop the column `medicineName` on the `Stock` table. All the data in the column will be lost.
  - You are about to drop the column `totalQuantity` on the `Stock` table. All the data in the column will be lost.
  - You are about to drop the `Address` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `MRStore` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SaleDetail` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[email]` on the table `MR` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `updatedAt` to the `Attendance` table without a default value. This is not possible if the table is not empty.
  - Added the required column `email` to the `MR` table without a default value. This is not possible if the table is not empty.
  - Added the required column `phone` to the `MR` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `MR` table without a default value. This is not possible if the table is not empty.
  - Added the required column `price` to the `Sale` table without a default value. This is not possible if the table is not empty.
  - Added the required column `productName` to the `Sale` table without a default value. This is not possible if the table is not empty.
  - Added the required column `quantity` to the `Sale` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalAmount` to the `Sale` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Sale` table without a default value. This is not possible if the table is not empty.
  - Added the required column `productName` to the `Stock` table without a default value. This is not possible if the table is not empty.
  - Added the required column `quantity` to the `Stock` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Stock` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Store` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `Attendance` DROP FOREIGN KEY `Attendance_mrId_fkey`;

-- DropForeignKey
ALTER TABLE `MRStore` DROP FOREIGN KEY `MRStore_mrId_fkey`;

-- DropForeignKey
ALTER TABLE `MRStore` DROP FOREIGN KEY `MRStore_storeId_fkey`;

-- DropForeignKey
ALTER TABLE `Sale` DROP FOREIGN KEY `Sale_mrId_fkey`;

-- DropForeignKey
ALTER TABLE `Sale` DROP FOREIGN KEY `Sale_storeId_fkey`;

-- DropForeignKey
ALTER TABLE `SaleDetail` DROP FOREIGN KEY `SaleDetail_saleId_fkey`;

-- DropIndex
DROP INDEX `Attendance_date_idx` ON `Attendance`;

-- DropIndex
DROP INDEX `Sale_date_idx` ON `Sale`;

-- DropIndex
DROP INDEX `Stock_medicineName_idx` ON `Stock`;

-- DropIndex
DROP INDEX `Stock_medicineName_key` ON `Stock`;

-- DropIndex
DROP INDEX `Store_name_key` ON `Store`;

-- AlterTable
ALTER TABLE `Attendance` DROP COLUMN `photo`,
    ADD COLUMN `checkInTime` DATETIME(3) NULL,
    ADD COLUMN `checkOutTime` DATETIME(3) NULL,
    ADD COLUMN `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `updatedAt` DATETIME(3) NOT NULL,
    ADD COLUMN `userId` INTEGER NULL,
    MODIFY `mrId` INTEGER NULL;

-- AlterTable
ALTER TABLE `MR` ADD COLUMN `email` VARCHAR(191) NOT NULL,
    ADD COLUMN `phone` VARCHAR(191) NOT NULL,
    ADD COLUMN `territory` VARCHAR(191) NULL,
    ADD COLUMN `updatedAt` DATETIME(3) NOT NULL,
    ADD COLUMN `userId` INTEGER NULL,
    MODIFY `salary` DOUBLE NULL;

-- AlterTable
ALTER TABLE `Sale` DROP COLUMN `date`,
    DROP COLUMN `photo`,
    DROP COLUMN `totalSales`,
    ADD COLUMN `price` DOUBLE NOT NULL,
    ADD COLUMN `productName` VARCHAR(191) NOT NULL,
    ADD COLUMN `quantity` INTEGER NOT NULL,
    ADD COLUMN `saleDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `totalAmount` DOUBLE NOT NULL,
    ADD COLUMN `updatedAt` DATETIME(3) NOT NULL,
    ADD COLUMN `userId` INTEGER NULL,
    MODIFY `storeId` INTEGER NULL,
    MODIFY `mrId` INTEGER NULL;

-- AlterTable
ALTER TABLE `Stock` DROP COLUMN `dateAdded`,
    DROP COLUMN `dealerName`,
    DROP COLUMN `medicineName`,
    DROP COLUMN `totalQuantity`,
    ADD COLUMN `expiryDate` DATETIME(3) NULL,
    ADD COLUMN `maxQuantity` INTEGER NOT NULL DEFAULT 1000,
    ADD COLUMN `minQuantity` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `productName` VARCHAR(191) NOT NULL,
    ADD COLUMN `quantity` INTEGER NOT NULL,
    ADD COLUMN `storeId` INTEGER NULL,
    ADD COLUMN `updatedAt` DATETIME(3) NOT NULL,
    ADD COLUMN `userId` INTEGER NULL;

-- AlterTable
ALTER TABLE `Store` ADD COLUMN `updatedAt` DATETIME(3) NOT NULL,
    ADD COLUMN `userId` INTEGER NULL,
    MODIFY `address` VARCHAR(191) NULL;

-- DropTable
DROP TABLE `Address`;

-- DropTable
DROP TABLE `MRStore`;

-- DropTable
DROP TABLE `SaleDetail`;

-- CreateTable
CREATE TABLE `User` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `role` VARCHAR(191) NOT NULL DEFAULT 'user',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `mr_stores` (
    `mrId` INTEGER NOT NULL,
    `storeId` INTEGER NOT NULL,
    `assignedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`mrId`, `storeId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `MR_email_key` ON `MR`(`email`);

-- AddForeignKey
ALTER TABLE `MR` ADD CONSTRAINT `MR_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Store` ADD CONSTRAINT `Store_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `mr_stores` ADD CONSTRAINT `mr_stores_mrId_fkey` FOREIGN KEY (`mrId`) REFERENCES `MR`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `mr_stores` ADD CONSTRAINT `mr_stores_storeId_fkey` FOREIGN KEY (`storeId`) REFERENCES `Store`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Sale` ADD CONSTRAINT `Sale_storeId_fkey` FOREIGN KEY (`storeId`) REFERENCES `Store`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Sale` ADD CONSTRAINT `Sale_mrId_fkey` FOREIGN KEY (`mrId`) REFERENCES `MR`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Sale` ADD CONSTRAINT `Sale_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Attendance` ADD CONSTRAINT `Attendance_mrId_fkey` FOREIGN KEY (`mrId`) REFERENCES `MR`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Attendance` ADD CONSTRAINT `Attendance_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Stock` ADD CONSTRAINT `Stock_storeId_fkey` FOREIGN KEY (`storeId`) REFERENCES `Store`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Stock` ADD CONSTRAINT `Stock_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
