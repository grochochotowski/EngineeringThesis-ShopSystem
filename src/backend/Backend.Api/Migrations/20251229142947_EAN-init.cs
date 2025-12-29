using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Api.Migrations
{
    /// <inheritdoc />
    public partial class EANinit : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Addresses",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Country = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    City = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    PostalCode = table.Column<string>(type: "nvarchar(16)", maxLength: 16, nullable: false),
                    Street = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    Building = table.Column<string>(type: "nvarchar(16)", maxLength: 16, nullable: false),
                    Premises = table.Column<string>(type: "nvarchar(16)", maxLength: 16, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Addresses", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Categories",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false, defaultValue: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Categories", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Locations",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Zone = table.Column<string>(type: "nvarchar(4)", maxLength: 4, nullable: false),
                    Col = table.Column<string>(type: "nvarchar(4)", maxLength: 4, nullable: false),
                    Shelf = table.Column<string>(type: "nvarchar(4)", maxLength: 4, nullable: false),
                    LocationCode = table.Column<string>(type: "nvarchar(14)", maxLength: 14, nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false, defaultValue: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Locations", x => x.Id);
                    table.CheckConstraint("CK_Location_Col_Length", "LEN([Col]) <= 4");
                    table.CheckConstraint("CK_Location_Shelf_Length", "LEN([Shelf]) <= 4");
                    table.CheckConstraint("CK_Location_Zone_Length", "LEN([Zone]) <= 4");
                });

            migrationBuilder.CreateTable(
                name: "TaxRates",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Code = table.Column<string>(type: "nvarchar(16)", maxLength: 16, nullable: false),
                    Rate = table.Column<decimal>(type: "decimal(5,4)", precision: 5, scale: 4, nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false, defaultValue: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TaxRates", x => x.Id);
                    table.CheckConstraint("CK_TaxRate_0_1", "[Rate] >= 0 AND [Rate] <= 1");
                });

            migrationBuilder.CreateTable(
                name: "Clients",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    TaxId = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: true),
                    Type = table.Column<int>(type: "int", nullable: false),
                    Email = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    PhoneNumber = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    AddressId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Clients", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Clients_Addresses_AddressId",
                        column: x => x.AddressId,
                        principalTable: "Addresses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Shipments",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Type = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    Status = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    SendDate = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    DeliveryDate = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    Description = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    Weight = table.Column<decimal>(type: "decimal(18,3)", precision: 18, scale: 3, nullable: true),
                    Length = table.Column<decimal>(type: "decimal(18,3)", precision: 18, scale: 3, nullable: true),
                    Width = table.Column<decimal>(type: "decimal(18,3)", precision: 18, scale: 3, nullable: true),
                    Height = table.Column<decimal>(type: "decimal(18,3)", precision: 18, scale: 3, nullable: true),
                    SenderName = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: true),
                    SenderTaxId = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: true),
                    SenderAddressId = table.Column<int>(type: "int", nullable: true),
                    SenderDetails = table.Column<string>(type: "nvarchar(512)", maxLength: 512, nullable: true),
                    ReceiverName = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: true),
                    ReceiverTaxId = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: true),
                    ReceiverAddressId = table.Column<int>(type: "int", nullable: true),
                    ReceiverDetails = table.Column<string>(type: "nvarchar(512)", maxLength: 512, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Shipments", x => x.Id);
                    table.CheckConstraint("CK_Shipment_Dates_Valid", "[DeliveryDate] IS NULL OR [SendDate] IS NULL OR [DeliveryDate] >= [SendDate]");
                    table.CheckConstraint("CK_Shipment_Dims_Positive", "[Weight] IS NULL OR [Length] IS NULL OR [Width] IS NULL OR [Height] IS NULL OR ([Weight] > 0 AND [Length] > 0 AND [Width] > 0 AND [Height] > 0)");
                    table.CheckConstraint("CK_Shipment_Status_Delivered_Date", "[Status] != 'Delivered' OR [DeliveryDate] IS NOT NULL");
                    table.CheckConstraint("CK_Shipment_Status_Ready_Fields", "[Status] IN ('Unspecified', 'InPreparation', 'Collected') OR ([Weight] IS NOT NULL AND [Length] IS NOT NULL AND [Width] IS NOT NULL AND [Height] IS NOT NULL AND [SenderName] IS NOT NULL AND [ReceiverName] IS NOT NULL AND [SenderAddressId] IS NOT NULL AND [ReceiverAddressId] IS NOT NULL)");
                    table.CheckConstraint("CK_Shipment_Status_Sent_Date", "[Status] NOT IN ('InTransit', 'Delivered') OR [SendDate] IS NOT NULL");
                    table.ForeignKey(
                        name: "FK_Shipments_Addresses_ReceiverAddressId",
                        column: x => x.ReceiverAddressId,
                        principalTable: "Addresses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Shipments_Addresses_SenderAddressId",
                        column: x => x.SenderAddressId,
                        principalTable: "Addresses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Users",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    FirstName = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    LastName = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    Email = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    PhoneNumber = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    DateOfBirth = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Role = table.Column<int>(type: "int", nullable: false),
                    AddressId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Users", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Users_Addresses_AddressId",
                        column: x => x.AddressId,
                        principalTable: "Addresses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Products",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    SKU = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    EAN = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Name = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: false),
                    Price = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    DefectDescription = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    Defective = table.Column<bool>(type: "bit", nullable: false, defaultValue: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CategoryId = table.Column<int>(type: "int", nullable: false),
                    TaxRateId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Products", x => x.Id);
                    table.CheckConstraint("CK_Product_Price_NonNegative", "[Price] >= 0");
                    table.ForeignKey(
                        name: "FK_Products_Categories_CategoryId",
                        column: x => x.CategoryId,
                        principalTable: "Categories",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Products_TaxRates_TaxRateId",
                        column: x => x.TaxRateId,
                        principalTable: "TaxRates",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "SalesDocuments",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    DocumentType = table.Column<int>(type: "int", nullable: false),
                    IssueDate = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    Description = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    DocumentNumber = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    TotalNet = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    TotalTax = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    TotalGross = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    ClientId = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SalesDocuments", x => x.Id);
                    table.CheckConstraint("CK_SalesDocument_PositiveTotals", "[TotalNet] >= 0 AND [TotalTax] >= 0 AND [TotalGross] >= 0");
                    table.ForeignKey(
                        name: "FK_SalesDocuments_Clients_ClientId",
                        column: x => x.ClientId,
                        principalTable: "Clients",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

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

            migrationBuilder.CreateTable(
                name: "ProductsInWarehouse",
                columns: table => new
                {
                    ProductId = table.Column<int>(type: "int", nullable: false),
                    LocationId = table.Column<int>(type: "int", nullable: false),
                    Quantity = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProductsInWarehouse", x => new { x.ProductId, x.LocationId });
                    table.CheckConstraint("CK_ProductsInWarehouse_Qty_NonNegative", "[Quantity] >= 0");
                    table.ForeignKey(
                        name: "FK_ProductsInWarehouse_Locations_LocationId",
                        column: x => x.LocationId,
                        principalTable: "Locations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ProductsInWarehouse_Products_ProductId",
                        column: x => x.ProductId,
                        principalTable: "Products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ShipmentProductLocations",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ShipmentId = table.Column<int>(type: "int", nullable: false),
                    ProductId = table.Column<int>(type: "int", nullable: false),
                    LocationId = table.Column<int>(type: "int", nullable: false),
                    Quantity = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false, defaultValueSql: "GETUTCDATE()"),
                    ProcessedByUserId = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ShipmentProductLocations", x => x.Id);
                    table.CheckConstraint("CK_ShipmentProductLocation_Qty_Positive", "[Quantity] > 0");
                    table.ForeignKey(
                        name: "FK_ShipmentProductLocations_Locations_LocationId",
                        column: x => x.LocationId,
                        principalTable: "Locations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ShipmentProductLocations_Products_ProductId",
                        column: x => x.ProductId,
                        principalTable: "Products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ShipmentProductLocations_Shipments_ShipmentId",
                        column: x => x.ShipmentId,
                        principalTable: "Shipments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ShipmentProductLocations_Users_ProcessedByUserId",
                        column: x => x.ProcessedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "ShipmentProducts",
                columns: table => new
                {
                    ShipmentId = table.Column<int>(type: "int", nullable: false),
                    ProductId = table.Column<int>(type: "int", nullable: false),
                    Quantity = table.Column<int>(type: "int", nullable: false),
                    CollectedQuantity = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ShipmentProducts", x => new { x.ShipmentId, x.ProductId });
                    table.CheckConstraint("CK_ShipmentProduct_CollectedQty_NonNegative", "[CollectedQuantity] IS NULL OR [CollectedQuantity] >= 0");
                    table.CheckConstraint("CK_ShipmentProduct_Qty_NonNegative", "[Quantity] >= 0");
                    table.ForeignKey(
                        name: "FK_ShipmentProducts_Products_ProductId",
                        column: x => x.ProductId,
                        principalTable: "Products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ShipmentProducts_Shipments_ShipmentId",
                        column: x => x.ShipmentId,
                        principalTable: "Shipments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "SalesDocumentItems",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ProductName = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    ProductSKU = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    UnitPriceNet = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: false),
                    LineNet = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    LineTax = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    LineGross = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    Quantity = table.Column<int>(type: "int", nullable: false),
                    SalesDocumentId = table.Column<int>(type: "int", nullable: false),
                    ProductId = table.Column<int>(type: "int", nullable: false),
                    TaxRateId = table.Column<int>(type: "int", nullable: false),
                    FromLocationId = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SalesDocumentItems", x => x.Id);
                    table.CheckConstraint("CK_SalesItem_Line_Positive", "[LineNet] >= 0 AND [LineTax] >= 0 AND [LineGross] >= 0");
                    table.CheckConstraint("CK_SalesItem_Qty_Positive", "[Quantity] >= 1");
                    table.ForeignKey(
                        name: "FK_SalesDocumentItems_Locations_FromLocationId",
                        column: x => x.FromLocationId,
                        principalTable: "Locations",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_SalesDocumentItems_Products_ProductId",
                        column: x => x.ProductId,
                        principalTable: "Products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_SalesDocumentItems_SalesDocuments_SalesDocumentId",
                        column: x => x.SalesDocumentId,
                        principalTable: "SalesDocuments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_SalesDocumentItems_TaxRates_TaxRateId",
                        column: x => x.TaxRateId,
                        principalTable: "TaxRates",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "SalesPayments",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Amount = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    PaymentOption = table.Column<int>(type: "int", nullable: false),
                    AmountTendered = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: true),
                    Change = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: true),
                    SalesDocumentId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SalesPayments", x => x.Id);
                    table.CheckConstraint("CK_SalesPayment_Amount_Positive", "[Amount] >= 0");
                    table.CheckConstraint("CK_SalesPayment_AmountTendered_NonNegative", "[AmountTendered] IS NULL OR [AmountTendered] >= 0");
                    table.CheckConstraint("CK_SalesPayment_Change_NonNegative", "[Change] IS NULL OR [Change] >= 0");
                    table.ForeignKey(
                        name: "FK_SalesPayments_SalesDocuments_SalesDocumentId",
                        column: x => x.SalesDocumentId,
                        principalTable: "SalesDocuments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Addresses_Country_City_PostalCode_Street_Building_Premises",
                table: "Addresses",
                columns: new[] { "Country", "City", "PostalCode", "Street", "Building", "Premises" },
                unique: true,
                filter: "[Premises] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_Categories_Name",
                table: "Categories",
                column: "Name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Clients_AddressId",
                table: "Clients",
                column: "AddressId");

            migrationBuilder.CreateIndex(
                name: "IX_Clients_Email",
                table: "Clients",
                column: "Email",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Clients_PhoneNumber",
                table: "Clients",
                column: "PhoneNumber",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Clients_TaxId",
                table: "Clients",
                column: "TaxId",
                unique: true,
                filter: "[TaxId] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_Locations_LocationCode",
                table: "Locations",
                column: "LocationCode",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Products_CategoryId",
                table: "Products",
                column: "CategoryId");

            migrationBuilder.CreateIndex(
                name: "IX_Products_SKU",
                table: "Products",
                column: "SKU",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Products_TaxRateId",
                table: "Products",
                column: "TaxRateId");

            migrationBuilder.CreateIndex(
                name: "IX_ProductsInWarehouse_LocationId",
                table: "ProductsInWarehouse",
                column: "LocationId");

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
                name: "IX_SalesDocumentItems_FromLocationId",
                table: "SalesDocumentItems",
                column: "FromLocationId");

            migrationBuilder.CreateIndex(
                name: "IX_SalesDocumentItems_ProductId",
                table: "SalesDocumentItems",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_SalesDocumentItems_SalesDocumentId",
                table: "SalesDocumentItems",
                column: "SalesDocumentId");

            migrationBuilder.CreateIndex(
                name: "IX_SalesDocumentItems_TaxRateId",
                table: "SalesDocumentItems",
                column: "TaxRateId");

            migrationBuilder.CreateIndex(
                name: "IX_SalesDocuments_ClientId",
                table: "SalesDocuments",
                column: "ClientId");

            migrationBuilder.CreateIndex(
                name: "IX_SalesDocuments_DocumentNumber",
                table: "SalesDocuments",
                column: "DocumentNumber",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_SalesPayments_SalesDocumentId",
                table: "SalesPayments",
                column: "SalesDocumentId");

            migrationBuilder.CreateIndex(
                name: "IX_ShipmentProductLocations_LocationId",
                table: "ShipmentProductLocations",
                column: "LocationId");

            migrationBuilder.CreateIndex(
                name: "IX_ShipmentProductLocations_ProcessedByUserId",
                table: "ShipmentProductLocations",
                column: "ProcessedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_ShipmentProductLocations_ProductId",
                table: "ShipmentProductLocations",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_ShipmentProductLocations_ShipmentId_ProductId_LocationId",
                table: "ShipmentProductLocations",
                columns: new[] { "ShipmentId", "ProductId", "LocationId" });

            migrationBuilder.CreateIndex(
                name: "IX_ShipmentProducts_ProductId",
                table: "ShipmentProducts",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_Shipments_ReceiverAddressId",
                table: "Shipments",
                column: "ReceiverAddressId");

            migrationBuilder.CreateIndex(
                name: "IX_Shipments_SenderAddressId",
                table: "Shipments",
                column: "SenderAddressId");

            migrationBuilder.CreateIndex(
                name: "IX_TaxRates_Code",
                table: "TaxRates",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_UserCredentials_Login",
                table: "UserCredentials",
                column: "Login",
                unique: true);

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
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ProductsInWarehouse");

            migrationBuilder.DropTable(
                name: "RefreshTokens");

            migrationBuilder.DropTable(
                name: "SalesDocumentItems");

            migrationBuilder.DropTable(
                name: "SalesPayments");

            migrationBuilder.DropTable(
                name: "ShipmentProductLocations");

            migrationBuilder.DropTable(
                name: "ShipmentProducts");

            migrationBuilder.DropTable(
                name: "UserCredentials");

            migrationBuilder.DropTable(
                name: "SalesDocuments");

            migrationBuilder.DropTable(
                name: "Locations");

            migrationBuilder.DropTable(
                name: "Products");

            migrationBuilder.DropTable(
                name: "Shipments");

            migrationBuilder.DropTable(
                name: "Users");

            migrationBuilder.DropTable(
                name: "Clients");

            migrationBuilder.DropTable(
                name: "Categories");

            migrationBuilder.DropTable(
                name: "TaxRates");

            migrationBuilder.DropTable(
                name: "Addresses");
        }
    }
}
