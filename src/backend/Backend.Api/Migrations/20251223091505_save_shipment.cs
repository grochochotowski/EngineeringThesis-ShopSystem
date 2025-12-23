using Microsoft.EntityFrameworkCore.Migrations;

using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Api.Migrations
{
    /// <inheritdoc />
    public partial class save_shipment : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_Shipment_Status_Ready_Fields",
                table: "Shipments");

            migrationBuilder.CreateTable(
                name: "ShipmentProductCollections",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ShipmentId = table.Column<int>(type: "int", nullable: false),
                    ProductId = table.Column<int>(type: "int", nullable: false),
                    LocationId = table.Column<int>(type: "int", nullable: false),
                    CollectedByUserId = table.Column<int>(type: "int", nullable: true),
                    DeclaredQuantity = table.Column<int>(type: "int", nullable: false),
                    CollectedQuantity = table.Column<int>(type: "int", nullable: false),
                    CollectedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ShipmentProductCollections", x => x.Id);
                    table.CheckConstraint("CK_ShipmentProductCollection_Quantities_NonNegative", "[DeclaredQuantity] >= 0 AND [CollectedQuantity] >= 0");
                    table.ForeignKey(
                        name: "FK_ShipmentProductCollections_Locations_LocationId",
                        column: x => x.LocationId,
                        principalTable: "Locations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ShipmentProductCollections_Products_ProductId",
                        column: x => x.ProductId,
                        principalTable: "Products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ShipmentProductCollections_Shipments_ShipmentId",
                        column: x => x.ShipmentId,
                        principalTable: "Shipments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ShipmentProductCollections_Users_CollectedByUserId",
                        column: x => x.CollectedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.AddCheckConstraint(
                name: "CK_Shipment_Status_Ready_Fields",
                table: "Shipments",
                sql: "[Status] IN ('Unspecified', 'InPreparation', 'Collected') OR ([Weight] IS NOT NULL AND [Length] IS NOT NULL AND [Width] IS NOT NULL AND [Height] IS NOT NULL AND [SenderName] IS NOT NULL AND [ReceiverName] IS NOT NULL AND [SenderAddressId] IS NOT NULL AND [ReceiverAddressId] IS NOT NULL)");

            migrationBuilder.CreateIndex(
                name: "IX_ShipmentProductCollections_CollectedByUserId",
                table: "ShipmentProductCollections",
                column: "CollectedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_ShipmentProductCollections_LocationId",
                table: "ShipmentProductCollections",
                column: "LocationId");

            migrationBuilder.CreateIndex(
                name: "IX_ShipmentProductCollections_ProductId",
                table: "ShipmentProductCollections",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_ShipmentProductCollections_ShipmentId",
                table: "ShipmentProductCollections",
                column: "ShipmentId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ShipmentProductCollections");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Shipment_Status_Ready_Fields",
                table: "Shipments");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Shipment_Status_Ready_Fields",
                table: "Shipments",
                sql: "[Status] IN ('Unspecified', 'InPreparation') OR ([Weight] IS NOT NULL AND [Length] IS NOT NULL AND [Width] IS NOT NULL AND [Height] IS NOT NULL AND [SenderName] IS NOT NULL AND [ReceiverName] IS NOT NULL AND [SenderAddressId] IS NOT NULL AND [ReceiverAddressId] IS NOT NULL)");
        }
    }
}
