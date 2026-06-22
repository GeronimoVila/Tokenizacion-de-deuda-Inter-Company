-- CreateTable
CREATE TABLE "Grupos_empresariales" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR NOT NULL,
    "cuit" VARCHAR NOT NULL,
    "fecha_creacion" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Grupos_empresariales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Empresas" (
    "id" SERIAL NOT NULL,
    "grupo_id" INTEGER NOT NULL,
    "nombre" VARCHAR NOT NULL,
    "cuit" VARCHAR NOT NULL,
    "wallet_address" VARCHAR NOT NULL,

    CONSTRAINT "Empresas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Roles" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR NOT NULL,

    CONSTRAINT "Roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Usuarios" (
    "id" SERIAL NOT NULL,
    "empresa_id" INTEGER NOT NULL,
    "nombre" VARCHAR NOT NULL,
    "mail" VARCHAR NOT NULL,
    "google_id" VARCHAR NOT NULL,
    "rol_id" INTEGER NOT NULL,

    CONSTRAINT "Usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transacciones_deuda" (
    "id" SERIAL NOT NULL,
    "empresa_emisora_id" INTEGER NOT NULL,
    "empresa_receptora_id" INTEGER NOT NULL,
    "monto" DECIMAL NOT NULL,
    "detalle" TEXT NOT NULL,
    "url_documento_respaldo" VARCHAR NOT NULL,
    "estado_validacion" VARCHAR NOT NULL,
    "fecha_creacion" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_validacion" TIMESTAMP,

    CONSTRAINT "Transacciones_deuda_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tokens_deuda" (
    "id" SERIAL NOT NULL,
    "transaccion_id" INTEGER NOT NULL,
    "token_id_blockchain" VARCHAR NOT NULL,
    "monto_actual" DECIMAL NOT NULL,
    "estado_token" VARCHAR NOT NULL,
    "txhash_mint" VARCHAR NOT NULL,
    "txhash_burn" VARCHAR,
    "block_number" INTEGER NOT NULL,

    CONSTRAINT "Tokens_deuda_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Compensaciones" (
    "id" SERIAL NOT NULL,
    "fecha" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usuario_ejecutor_id" INTEGER NOT NULL,
    "descripcion" TEXT NOT NULL,

    CONSTRAINT "Compensaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Compensacion_Detalle" (
    "id" SERIAL NOT NULL,
    "compensacion_id" INTEGER NOT NULL,
    "token_id" INTEGER NOT NULL,
    "monto_compensado" DECIMAL NOT NULL,

    CONSTRAINT "Compensacion_Detalle_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuarios_mail_key" ON "Usuarios"("mail");

-- CreateIndex
CREATE UNIQUE INDEX "Usuarios_google_id_key" ON "Usuarios"("google_id");

-- AddForeignKey
ALTER TABLE "Empresas" ADD CONSTRAINT "Empresas_grupo_id_fkey" FOREIGN KEY ("grupo_id") REFERENCES "Grupos_empresariales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Usuarios" ADD CONSTRAINT "Usuarios_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "Empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Usuarios" ADD CONSTRAINT "Usuarios_rol_id_fkey" FOREIGN KEY ("rol_id") REFERENCES "Roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transacciones_deuda" ADD CONSTRAINT "Transacciones_deuda_empresa_emisora_id_fkey" FOREIGN KEY ("empresa_emisora_id") REFERENCES "Empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transacciones_deuda" ADD CONSTRAINT "Transacciones_deuda_empresa_receptora_id_fkey" FOREIGN KEY ("empresa_receptora_id") REFERENCES "Empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tokens_deuda" ADD CONSTRAINT "Tokens_deuda_transaccion_id_fkey" FOREIGN KEY ("transaccion_id") REFERENCES "Transacciones_deuda"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Compensaciones" ADD CONSTRAINT "Compensaciones_usuario_ejecutor_id_fkey" FOREIGN KEY ("usuario_ejecutor_id") REFERENCES "Usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Compensacion_Detalle" ADD CONSTRAINT "Compensacion_Detalle_compensacion_id_fkey" FOREIGN KEY ("compensacion_id") REFERENCES "Compensaciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Compensacion_Detalle" ADD CONSTRAINT "Compensacion_Detalle_token_id_fkey" FOREIGN KEY ("token_id") REFERENCES "Tokens_deuda"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
