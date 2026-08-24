/*
  Warnings:

  - A unique constraint covering the columns `[cuit]` on the table `Grupos_empresariales` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Grupos_empresariales_cuit_key" ON "Grupos_empresariales"("cuit");
