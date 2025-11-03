using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Api.Migrations
{
    /// <inheritdoc />
    public partial class DbUpdatewWithAuth : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Clients_Addresses_AddressId",
                table: "Clients");

            migrationBuilder.DropForeignKey(
                name: "FK_ParcelProduct_Parcels_ParcelId",
                table: "ParcelProduct");

            migrationBuilder.DropForeignKey(
                name: "FK_ParcelProduct_Products_ProductId",
                table: "ParcelProduct");

            migrationBuilder.DropForeignKey(
                name: "FK_SalesDocuments_Clients_ClientId",
                table: "SalesDocuments");

            migrationBuilder.DropForeignKey(
                name: "FK_Users_Addresses_AddressId",
                table: "Users");

            migrationBuilder.DropForeignKey(
                name: "FK_WarehouseProducts_Products_ProductId",
                table: "WarehouseProducts");

            migrationBuilder.DropForeignKey(
                name: "FK_WarehouseProducts_Warehouses_WarehouseId",
                table: "WarehouseProducts");

            migrationBuilder.DropIndex(
                name: "IX_Users_AddressId",
                table: "Users");

            migrationBuilder.DropIndex(
                name: "IX_SalesDocuments_DocumentType_DocumentNumber",
                table: "SalesDocuments");

            migrationBuilder.DropPrimaryKey(
                name: "PK_ParcelProduct",
                table: "ParcelProduct");

            migrationBuilder.DropColumn(
                name: "Login",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "Password",
                table: "Users");

            migrationBuilder.RenameTable(
                name: "ParcelProduct",
                newName: "ParcelProducts");

            migrationBuilder.RenameIndex(
                name: "IX_ParcelProduct_ProductId",
                table: "ParcelProducts",
                newName: "IX_ParcelProducts_ProductId");

            migrationBuilder.AlterColumn<bool>(
                name: "IsActive",
                table: "TaxRates",
                type: "bit",
                nullable: false,
                defaultValue: true,
                oldClrType: typeof(bool),
                oldType: "bit");

            migrationBuilder.AlterColumn<DateTimeOffset>(
                name: "DeliveryDate",
                table: "Shipments",
                type: "datetimeoffset",
                nullable: true,
                oldClrType: typeof(DateTimeOffset),
                oldType: "datetimeoffset");

            migrationBuilder.AlterColumn<string>(
                name: "Description",
                table: "SalesDocuments",
                type: "nvarchar(256)",
                maxLength: 256,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)",
                oldNullable: true);

            migrationBuilder.AlterColumn<bool>(
                name: "Defective",
                table: "Products",
                type: "bit",
                nullable: false,
                defaultValue: false,
                oldClrType: typeof(bool),
                oldType: "bit");

            migrationBuilder.AlterColumn<string>(
                name: "Description",
                table: "Categories",
                type: "nvarchar(256)",
                maxLength: 256,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(256)",
                oldMaxLength: 256);

            migrationBuilder.AddPrimaryKey(
                name: "PK_ParcelProducts",
                table: "ParcelProducts",
                columns: new[] { "ParcelId", "ProductId" });

            migrationBuilder.CreateTable(
                name: "RefreshTokens",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserId = table.Column<int>(type: "int", nullable: false),
                    Token = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: false),
                    ExpiresAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    IsRevoked = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RefreshTokens", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RefreshTokens_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "UserCredentials",
                columns: table => new
                {
                    UserId = table.Column<int>(type: "int", nullable: false),
                    Login = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    PasswordHash = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: false),
                    PasswordSalt = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    FailedAttempts = table.Column<int>(type: "int", nullable: false),
                    LockedUntil = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    PasswordUpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserCredentials", x => x.UserId);
                    table.ForeignKey(
                        name: "FK_UserCredentials_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Warehouses_Name",
                table: "Warehouses",
                column: "Name",
                unique: true);

            migrationBuilder.AddCheckConstraint(
                name: "CK_WarehouseProduct_Qty_NonNegative",
                table: "WarehouseProducts",
                sql: "[Quantity] >= 0");

            migrationBuilder.CreateIndex(
                name: "IX_Users_AddressId",
                table: "Users",
                column: "AddressId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Users_Email",
                table: "Users",
                column: "Email",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Users_PhoneNumber",
                table: "Users",
                column: "PhoneNumber",
                unique: true);

            migrationBuilder.AddCheckConstraint(
                name: "CK_TaxRate_0_1",
                table: "TaxRates",
                sql: "[Rate] >= 0 AND [Rate] <= 1");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Shipment_Dates_Valid",
                table: "Shipments",
                sql: "[DeliveryDate] IS NULL OR [DeliveryDate] >= [SendDate]");

            migrationBuilder.AddCheckConstraint(
                name: "CK_SalesPayment_Amount_Positive",
                table: "SalesPayments",
                sql: "[Amount] >= 0");

            migrationBuilder.CreateIndex(
                name: "IX_SalesDocuments_DocumentNumber",
                table: "SalesDocuments",
                column: "DocumentNumber",
                unique: true);

            migrationBuilder.AddCheckConstraint(
                name: "CK_SalesDocument_PositiveTotals",
                table: "SalesDocuments",
                sql: "[TotalNet] >= 0 AND [TotalTax] >= 0 AND [TotalGross] >= 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_SalesItem_Line_Positive",
                table: "SalesDocumentItems",
                sql: "[LineNet] >= 0 AND [LineTax] >= 0 AND [LineGross] >= 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_SalesItem_Qty_Positive",
                table: "SalesDocumentItems",
                sql: "[Quantity] >= 1");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Product_Price_NonNegative",
                table: "Products",
                sql: "[Price] >= 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Parcel_Dims_Positive",
                table: "Parcels",
                sql: "[Length] > 0 AND [Width] > 0 AND [Height] > 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Parcel_Weight_Positive",
                table: "Parcels",
                sql: "[Weight] > 0");

            migrationBuilder.CreateIndex(
                name: "IX_DeliveryCompanies_Email",
                table: "DeliveryCompanies",
                column: "Email",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_DeliveryCompanies_Name",
                table: "DeliveryCompanies",
                column: "Name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_DeliveryCompanies_PhoneNumber",
                table: "DeliveryCompanies",
                column: "PhoneNumber",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Categories_Name",
                table: "Categories",
                column: "Name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Addresses_Country_City_PostalCode_Street_Building_Premises",
                table: "Addresses",
                columns: new[] { "Country", "City", "PostalCode", "Street", "Building", "Premises" },
                unique: true,
                filter: "[Premises] IS NOT NULL");

            migrationBuilder.AddCheckConstraint(
                name: "CK_ParcelProduct_Qty_Positive",
                table: "ParcelProducts",
                sql: "[Quantity] >= 1");

            migrationBuilder.CreateIndex(
                name: "IX_RefreshTokens_Token",
                table: "RefreshTokens",
                column: "Token",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_RefreshTokens_UserId",
                table: "RefreshTokens",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_UserCredentials_Login",
                table: "UserCredentials",
                column: "Login",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Clients_Addresses_AddressId",
                table: "Clients",
                column: "AddressId",
                principalTable: "Addresses",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_ParcelProducts_Parcels_ParcelId",
                table: "ParcelProducts",
                column: "ParcelId",
                principalTable: "Parcels",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_ParcelProducts_Products_ProductId",
                table: "ParcelProducts",
                column: "ProductId",
                principalTable: "Products",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_SalesDocuments_Clients_ClientId",
                table: "SalesDocuments",
                column: "ClientId",
                principalTable: "Clients",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_Users_Addresses_AddressId",
                table: "Users",
                column: "AddressId",
                principalTable: "Addresses",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_WarehouseProducts_Products_ProductId",
                table: "WarehouseProducts",
                column: "ProductId",
                principalTable: "Products",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_WarehouseProducts_Warehouses_WarehouseId",
                table: "WarehouseProducts",
                column: "WarehouseId",
                principalTable: "Warehouses",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Clients_Addresses_AddressId",
                table: "Clients");

            migrationBuilder.DropForeignKey(
                name: "FK_ParcelProducts_Parcels_ParcelId",
                table: "ParcelProducts");

            migrationBuilder.DropForeignKey(
                name: "FK_ParcelProducts_Products_ProductId",
                table: "ParcelProducts");

            migrationBuilder.DropForeignKey(
                name: "FK_SalesDocuments_Clients_ClientId",
                table: "SalesDocuments");

            migrationBuilder.DropForeignKey(
                name: "FK_Users_Addresses_AddressId",
                table: "Users");

            migrationBuilder.DropForeignKey(
                name: "FK_WarehouseProducts_Products_ProductId",
                table: "WarehouseProducts");

            migrationBuilder.DropForeignKey(
                name: "FK_WarehouseProducts_Warehouses_WarehouseId",
                table: "WarehouseProducts");

            migrationBuilder.DropTable(
                name: "RefreshTokens");

            migrationBuilder.DropTable(
                name: "UserCredentials");

            migrationBuilder.DropIndex(
                name: "IX_Warehouses_Name",
                table: "Warehouses");

            migrationBuilder.DropCheckConstraint(
                name: "CK_WarehouseProduct_Qty_NonNegative",
                table: "WarehouseProducts");

            migrationBuilder.DropIndex(
                name: "IX_Users_AddressId",
                table: "Users");

            migrationBuilder.DropIndex(
                name: "IX_Users_Email",
                table: "Users");

            migrationBuilder.DropIndex(
                name: "IX_Users_PhoneNumber",
                table: "Users");

            migrationBuilder.DropCheckConstraint(
                name: "CK_TaxRate_0_1",
                table: "TaxRates");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Shipment_Dates_Valid",
                table: "Shipments");

            migrationBuilder.DropCheckConstraint(
                name: "CK_SalesPayment_Amount_Positive",
                table: "SalesPayments");

            migrationBuilder.DropIndex(
                name: "IX_SalesDocuments_DocumentNumber",
                table: "SalesDocuments");

            migrationBuilder.DropCheckConstraint(
                name: "CK_SalesDocument_PositiveTotals",
                table: "SalesDocuments");

            migrationBuilder.DropCheckConstraint(
                name: "CK_SalesItem_Line_Positive",
                table: "SalesDocumentItems");

            migrationBuilder.DropCheckConstraint(
                name: "CK_SalesItem_Qty_Positive",
                table: "SalesDocumentItems");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Product_Price_NonNegative",
                table: "Products");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Parcel_Dims_Positive",
                table: "Parcels");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Parcel_Weight_Positive",
                table: "Parcels");

            migrationBuilder.DropIndex(
                name: "IX_DeliveryCompanies_Email",
                table: "DeliveryCompanies");

            migrationBuilder.DropIndex(
                name: "IX_DeliveryCompanies_Name",
                table: "DeliveryCompanies");

            migrationBuilder.DropIndex(
                name: "IX_DeliveryCompanies_PhoneNumber",
                table: "DeliveryCompanies");

            migrationBuilder.DropIndex(
                name: "IX_Categories_Name",
                table: "Categories");

            migrationBuilder.DropIndex(
                name: "IX_Addresses_Country_City_PostalCode_Street_Building_Premises",
                table: "Addresses");

            migrationBuilder.DropPrimaryKey(
                name: "PK_ParcelProducts",
                table: "ParcelProducts");

            migrationBuilder.DropCheckConstraint(
                name: "CK_ParcelProduct_Qty_Positive",
                table: "ParcelProducts");

            migrationBuilder.RenameTable(
                name: "ParcelProducts",
                newName: "ParcelProduct");

            migrationBuilder.RenameIndex(
                name: "IX_ParcelProducts_ProductId",
                table: "ParcelProduct",
                newName: "IX_ParcelProduct_ProductId");

            migrationBuilder.AddColumn<string>(
                name: "Login",
                table: "Users",
                type: "nvarchar(64)",
                maxLength: 64,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Password",
                table: "Users",
                type: "nvarchar(256)",
                maxLength: 256,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AlterColumn<bool>(
                name: "IsActive",
                table: "TaxRates",
                type: "bit",
                nullable: false,
                oldClrType: typeof(bool),
                oldType: "bit",
                oldDefaultValue: true);

            migrationBuilder.AlterColumn<DateTimeOffset>(
                name: "DeliveryDate",
                table: "Shipments",
                type: "datetimeoffset",
                nullable: false,
                defaultValue: new DateTimeOffset(new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)),
                oldClrType: typeof(DateTimeOffset),
                oldType: "datetimeoffset",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "Description",
                table: "SalesDocuments",
                type: "nvarchar(max)",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(256)",
                oldMaxLength: 256,
                oldNullable: true);

            migrationBuilder.AlterColumn<bool>(
                name: "Defective",
                table: "Products",
                type: "bit",
                nullable: false,
                oldClrType: typeof(bool),
                oldType: "bit",
                oldDefaultValue: false);

            migrationBuilder.AlterColumn<string>(
                name: "Description",
                table: "Categories",
                type: "nvarchar(256)",
                maxLength: 256,
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "nvarchar(256)",
                oldMaxLength: 256,
                oldNullable: true);

            migrationBuilder.AddPrimaryKey(
                name: "PK_ParcelProduct",
                table: "ParcelProduct",
                columns: new[] { "ParcelId", "ProductId" });

            migrationBuilder.CreateIndex(
                name: "IX_Users_AddressId",
                table: "Users",
                column: "AddressId");

            migrationBuilder.CreateIndex(
                name: "IX_SalesDocuments_DocumentType_DocumentNumber",
                table: "SalesDocuments",
                columns: new[] { "DocumentType", "DocumentNumber" },
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Clients_Addresses_AddressId",
                table: "Clients",
                column: "AddressId",
                principalTable: "Addresses",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_ParcelProduct_Parcels_ParcelId",
                table: "ParcelProduct",
                column: "ParcelId",
                principalTable: "Parcels",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_ParcelProduct_Products_ProductId",
                table: "ParcelProduct",
                column: "ProductId",
                principalTable: "Products",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_SalesDocuments_Clients_ClientId",
                table: "SalesDocuments",
                column: "ClientId",
                principalTable: "Clients",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Users_Addresses_AddressId",
                table: "Users",
                column: "AddressId",
                principalTable: "Addresses",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_WarehouseProducts_Products_ProductId",
                table: "WarehouseProducts",
                column: "ProductId",
                principalTable: "Products",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_WarehouseProducts_Warehouses_WarehouseId",
                table: "WarehouseProducts",
                column: "WarehouseId",
                principalTable: "Warehouses",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
