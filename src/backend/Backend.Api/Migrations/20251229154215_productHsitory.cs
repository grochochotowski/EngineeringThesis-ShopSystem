using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Api.Migrations
{
    /// <inheritdoc />
    public partial class productHsitory : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "InventoryChanges",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ChangeType = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    Quantity = table.Column<int>(type: "int", nullable: false),
                    Timestamp = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETUTCDATE()"),
                    Notes = table.Column<string>(type: "nvarchar(512)", maxLength: 512, nullable: true),
                    ProductSku = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    ProductEan = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: true),
                    ProductId = table.Column<int>(type: "int", nullable: false),
                    FromLocationId = table.Column<int>(type: "int", nullable: true),
                    ToLocationId = table.Column<int>(type: "int", nullable: true),
                    UserId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_InventoryChanges", x => x.Id);
                    table.CheckConstraint("CK_InventoryChange_Location_Required", "[FromLocationId] IS NOT NULL OR [ToLocationId] IS NOT NULL");
                    table.CheckConstraint("CK_InventoryChange_Qty_NonZero", "[Quantity] != 0");
                    table.ForeignKey(
                        name: "FK_InventoryChanges_Locations_FromLocationId",
                        column: x => x.FromLocationId,
                        principalTable: "Locations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_InventoryChanges_Locations_ToLocationId",
                        column: x => x.ToLocationId,
                        principalTable: "Locations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_InventoryChanges_Products_ProductId",
                        column: x => x.ProductId,
                        principalTable: "Products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_InventoryChanges_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_InventoryChanges_ChangeType",
                table: "InventoryChanges",
                column: "ChangeType");

            migrationBuilder.CreateIndex(
                name: "IX_InventoryChanges_FromLocationId",
                table: "InventoryChanges",
                column: "FromLocationId");

            migrationBuilder.CreateIndex(
                name: "IX_InventoryChanges_ProductId",
                table: "InventoryChanges",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_InventoryChanges_Timestamp",
                table: "InventoryChanges",
                column: "Timestamp");

            migrationBuilder.CreateIndex(
                name: "IX_InventoryChanges_ToLocationId",
                table: "InventoryChanges",
                column: "ToLocationId");

            migrationBuilder.CreateIndex(
                name: "IX_InventoryChanges_UserId",
                table: "InventoryChanges",
                column: "UserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "InventoryChanges");
        }
    }
}
