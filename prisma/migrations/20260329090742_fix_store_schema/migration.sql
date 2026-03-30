/*
  Warnings:

  - You are about to drop the column `location` on the `Store` table. All the data in the column will be lost.
  - You are about to drop the `Address` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `Address` DROP FOREIGN KEY `Address_storeId_fkey`;

-- DropForeignKey
ALTER TABLE `Address` DROP FOREIGN KEY `Address_userId_fkey`;

-- AlterTable
ALTER TABLE `Store` DROP COLUMN `location`,
    ADD COLUMN `address` VARCHAR(191) NULL,
    MODIFY `contact` VARCHAR(191) NULL;

-- DropTable
DROP TABLE `Address`;
